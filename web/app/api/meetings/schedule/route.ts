import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '../../../../lib/api-auth';
import { getSupabaseAdminClient } from '../../../../lib/supabase-admin';
import { createGoogleEvent } from '../../../../lib/google-calendar';
import { assertMeetingSlotAvailable } from '../../../../lib/meeting-slot';
import { actorFromUser, can } from '../../../../lib/permissions';
import { enforceRateLimit, safeTraceId } from '../../../../lib/runtime-security';
import { queueMeetingReminderNotifications } from '../../../../lib/notifications';
import { withApiObservability } from '../../../../lib/api-observability';

const ScheduleSchema = z.object({
  requestId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  location: z.string().optional()
});

export const POST = withApiObservability('api.meetings.schedule.post', async (request: NextRequest) => {
  const auth = await requireApiUser(request.headers.get('authorization'));
  if (auth instanceof NextResponse) return auth;
  const supabaseAdmin = getSupabaseAdminClient();

  if (!can(auth, 'OPS_ADMIN_TL')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const rate = enforceRateLimit({ key: `schedule-post:${auth.id}`, limit: 50, windowMs: 60_000 });
  if (rate) return rate;

  const parsed = ScheduleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { requestId, startsAt, endsAt, location } = parsed.data;
  try {
    await assertMeetingSlotAvailable(startsAt, endsAt);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }

  const { data: source, error: requestError } = await supabaseAdmin
    .from('citizen_request')
    .select('id, status, citizen_name, topic, reason, created_by_agent_id')
    .eq('id', requestId)
    .single();

  if (requestError || !source) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  if (source.status !== 'approved') {
    return NextResponse.json(
      { error: 'Request must be approved before scheduling' },
      { status: 409 }
    );
  }

  const traceId = safeTraceId(request.headers.get('x-trace-id')) || crypto.randomUUID();
  const actor = actorFromUser(auth);
  let googleEventId: string | null = null;
  let syncStatus = 'pending';

  try {
    googleEventId = await createGoogleEvent({
      summary: `Reunion con ${source.citizen_name}`,
      description: `${source.topic}\n\n${source.reason}`,
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
      request_id: requestId,
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

  if (meetingError) {
    return NextResponse.json({ error: meetingError.message }, { status: 500 });
  }

  const requestUpdate = await supabaseAdmin
    .from('citizen_request')
    .update({
      status: 'scheduled',
      updated_by_user_id: null,
      updated_by_agent_id: actor,
      trace_id: traceId
    })
    .eq('id', requestId);
  if (requestUpdate.error) {
    return NextResponse.json({ error: requestUpdate.error.message }, { status: 500 });
  }

  const auditInsert = await supabaseAdmin.from('audit_log').insert({
    entity_name: 'meeting',
    entity_id: meeting.id,
    action: 'schedule',
    payload: { request_id: requestId, google_event_id: googleEventId, sync_status: syncStatus },
    actor_user_id: null,
    actor_agent_id: actor,
    trace_id: traceId
  });
  if (auditInsert.error) {
    return NextResponse.json({ error: auditInsert.error.message }, { status: 500 });
  }

  const { data: requestForRegistry } = await supabaseAdmin
    .from('citizen_request')
    .select('citizen_name, citizen_phone, topic, locality, neighborhood')
    .eq('id', requestId)
    .single();

  if (requestForRegistry) {
    const registry = await supabaseAdmin.from('meeting_registry').upsert(
      {
        request_id: requestId,
        requester_name: requestForRegistry.citizen_name,
        requester_phone: requestForRegistry.citizen_phone ?? '',
        topic: requestForRegistry.topic,
        locality: requestForRegistry.locality ?? 'Ushuaia',
        neighborhood: requestForRegistry.neighborhood ?? 'Sin barrio',
        starts_at: startsAt,
        ends_at: endsAt,
        location: location ?? null,
        status: 'scheduled',
        created_by_agent_id: actor
      },
      { onConflict: 'request_id' }
    );
    if (registry.error) {
      return NextResponse.json({ error: registry.error.message }, { status: 500 });
    }
  }

  const recipientUserId = source.created_by_agent_id?.replace('supabase-auth:', '') ?? null;
  await queueMeetingReminderNotifications({
    meetingId: meeting.id,
    requestId,
    startsAt,
    recipientUserId,
    actor: auth,
    traceId
  });

  return NextResponse.json({ data: { ...meeting, googleEventId } }, { status: 201 });
});
