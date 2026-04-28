import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '../../../../lib/api-auth';
import { getSupabaseAdminClient } from '../../../../lib/supabase-admin';
import { createGoogleEvent } from '../../../../lib/google-calendar';
import { formatReadableDateTime, queueMeetingReminderNotifications, sendAdminEmail, sendRequestChangeNotification } from '../../../../lib/notifications';
import { assertMeetingSlotAvailable } from '../../../../lib/meeting-slot';
import { actorFromUser, can } from '../../../../lib/permissions';
import { enforceRateLimit, safeTraceId } from '../../../../lib/runtime-security';
import { withApiObservability } from '../../../../lib/api-observability';

const UnifiedSchema = z.object({
  citizenName: z.string().min(3),
  citizenPhone: z.string().min(6),
  topicOption: z.string().min(1),
  topicOther: z.string().optional(),
  locality: z.enum(['Ushuaia', 'Tolhuin', 'Rio Grande', 'Puerto Almanza']),
  neighborhood: z.string().min(2),
  reason: z.string().min(5),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  location: z.string().optional()
});

function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return `+${digits}`;
  return digits;
}

function escapeHtml(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getRequiredAppBaseUrl(): string {
  const appUrl = process.env.APP_BASE_URL?.trim();
  if (!appUrl) {
    throw new Error('APP_BASE_URL is required to generate meeting decision links.');
  }
  return appUrl.replace(/\/$/, '');
}

export const POST = withApiObservability('api.meetings.unified.post', async (request: NextRequest) => {
  const auth = await requireApiUser(request.headers.get('authorization'));
  if (auth instanceof NextResponse) return auth;

  if (!can(auth, 'OPS_ADMIN_TL')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const rate = enforceRateLimit({ key: `unified-post:${auth.id}`, limit: 40, windowMs: 60_000 });
  if (rate) return rate;

  const parsed = UnifiedSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const traceId = safeTraceId(request.headers.get('x-trace-id')) || crypto.randomUUID();
  const appUrl = getRequiredAppBaseUrl();
  const actor = actorFromUser(auth);
  const { citizenName, citizenPhone, topicOption, topicOther, locality, neighborhood, reason, startsAt, endsAt, location } = parsed.data;
  const normalizedPhone = normalizePhone(citizenPhone);
  const phoneDigits = normalizedPhone.replace(/\D/g, '');
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    return NextResponse.json({ error: 'Teléfono inválido. Usá formato +5492901123456.' }, { status: 400 });
  }
  const resolvedTopic = topicOption === 'Otro' ? (topicOther?.trim() || '') : topicOption;
  if (!resolvedTopic) {
    return NextResponse.json({ error: 'Tema obligatorio.' }, { status: 400 });
  }
  try {
    await assertMeetingSlotAvailable(startsAt, endsAt);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }

  const { data: requestRow, error: createError } = await supabaseAdmin
    .from('citizen_request')
    .insert({
      citizen_name: citizenName,
      citizen_phone: normalizedPhone,
      topic: resolvedTopic,
      topic_option: topicOption,
      topic_other: topicOption === 'Otro' ? topicOther ?? null : null,
      locality,
      neighborhood,
      reason,
      priority: 3,
      status: 'pending_leader_approval',
      created_by_user_id: null,
      created_by_agent_id: actor,
      updated_by_user_id: null,
      updated_by_agent_id: actor,
      trace_id: traceId
    })
    .select('id, citizen_name, citizen_phone, topic, locality, neighborhood, reason, status')
    .single();
  if (createError || !requestRow) {
    return NextResponse.json({ error: createError?.message ?? 'No se pudo crear solicitud' }, { status: 500 });
  }

  let googleEventId: string | null = null;
  let syncStatus = 'pending';

  try {
    googleEventId = await createGoogleEvent({
      summary: `Reunion con ${requestRow.citizen_name}`,
      description: `${requestRow.topic}\n\n${requestRow.reason}`,
      startsAt,
      endsAt,
      location
    });
    syncStatus = 'synced';
  } catch {
    syncStatus = 'failed';
  }

  const { data: meeting, error: meetingError } = await supabaseAdmin
    .from('meeting')
    .insert({
      request_id: requestRow.id,
      starts_at: startsAt,
      ends_at: endsAt,
      location: location ?? null,
      google_event_id: googleEventId,
      sync_status: syncStatus,
      created_by_user_id: null,
      created_by_agent_id: actor,
      trace_id: traceId
    })
    .select('*')
    .single();

  if (meetingError || !meeting) {
    return NextResponse.json({ error: meetingError?.message ?? 'No se pudo crear reunión' }, { status: 500 });
  }

  const registry = await supabaseAdmin.from('meeting_registry').insert({
    request_id: requestRow.id,
    requester_name: requestRow.citizen_name,
    requester_phone: requestRow.citizen_phone,
    topic: requestRow.topic,
    locality: requestRow.locality,
    neighborhood: requestRow.neighborhood,
    starts_at: startsAt,
    ends_at: endsAt,
    location: location ?? null,
    status: 'scheduled',
    created_by_agent_id: actor
  });
  if (registry.error) {
    return NextResponse.json({ error: registry.error.message }, { status: 500 });
  }

  const requestUpdate = await supabaseAdmin
    .from('citizen_request')
    .update({
      status: 'scheduled',
      updated_by_user_id: null,
      updated_by_agent_id: actor,
      trace_id: traceId
    })
    .eq('id', requestRow.id);
  if (requestUpdate.error) {
    return NextResponse.json({ error: requestUpdate.error.message }, { status: 500 });
  }

  const auditInsert = await supabaseAdmin.from('audit_log').insert([
    {
      entity_name: 'citizen_request',
      entity_id: requestRow.id,
      action: 'create_and_schedule',
      payload: { from: 'pending_leader_approval', to: 'scheduled' },
      before_json: { status: 'pending_leader_approval' },
      after_json: { status: 'scheduled' },
      actor_user_id: null,
      actor_agent_id: actor,
      trace_id: traceId
    },
    {
      entity_name: 'meeting',
      entity_id: meeting.id,
      action: 'schedule',
      payload: { request_id: requestRow.id, google_event_id: googleEventId, sync_status: syncStatus },
      actor_user_id: null,
      actor_agent_id: actor,
      trace_id: traceId
    }
  ]);
  if (auditInsert.error) {
    return NextResponse.json({ error: auditInsert.error.message }, { status: 500 });
  }

  const approveLink = `${appUrl}/dashboard?request=${requestRow.id}&action=approve`;
  const rejectLink = `${appUrl}/dashboard?request=${requestRow.id}&action=reject`;
  const modifyLink = `${appUrl}/dashboard?request=${requestRow.id}&action=modify`;

  await sendAdminEmail(
    'Nueva solicitud de reunión pendiente de decisión',
    `
      <h3>Nueva solicitud de reunión</h3>
      <p><strong>Solicitante:</strong> ${escapeHtml(requestRow.citizen_name)}</p>
      <p><strong>Teléfono:</strong> ${escapeHtml(requestRow.citizen_phone)}</p>
      <p><strong>Tema:</strong> ${escapeHtml(requestRow.topic)}</p>
      <p><strong>Localidad/Barrio:</strong> ${escapeHtml(requestRow.locality)} - ${escapeHtml(requestRow.neighborhood)}</p>
      <p><strong>Fecha:</strong> ${formatReadableDateTime(startsAt)}</p>
      <p><strong>Lugar:</strong> ${escapeHtml(location ?? 'Sin definir')}</p>
      <p>
        <a href="${approveLink}">Aprobar</a> |
        <a href="${rejectLink}">Rechazar</a> |
        <a href="${modifyLink}">Modificar</a>
      </p>
    `
  );

  await sendRequestChangeNotification({
    userId: auth.id,
    headline: 'REUNION CONFIRMADA',
    citizenName: requestRow.citizen_name,
    topic: requestRow.topic,
    locality: requestRow.locality,
    neighborhood: requestRow.neighborhood,
    startsAt,
    location: location ?? null
  });

  await queueMeetingReminderNotifications({
    meetingId: meeting.id,
    requestId: requestRow.id,
    startsAt,
    recipientUserId: auth.id,
    actor: auth,
    traceId
  });

  return NextResponse.json(
    {
      data: {
        requestId: requestRow.id,
        meetingId: meeting.id,
        googleEventId,
        syncStatus
      }
    },
    { status: 201 }
  );
});
