import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '../../../../../lib/api-auth';
import { getSupabaseAdminClient } from '../../../../../lib/supabase-admin';
import { isValidTransition, type RequestStatus } from '../../../../../lib/workflow';
import { actorFromUser, can } from '../../../../../lib/permissions';
import { enforceRateLimit, safeTraceId } from '../../../../../lib/runtime-security';
import { queueMeetingReminderNotifications, sendRequestChangeNotification } from '../../../../../lib/notifications';
import { withApiObservability } from '../../../../../lib/api-observability';
import { inferEventTypeFromReason } from '../../../../../lib/event-type';

const StatusSchema = z.object({
  status: z.enum([
    'draft',
    'submitted',
    'pending_review',
    'in_classification',
    'pending_schedule',
    'pending_leader_approval',
    'approved',
    'rejected',
    'reschedule_requested',
    'scheduled',
    'completed',
    'cancelled',
    'no_show'
  ])
});

export const PATCH = withApiObservability(
  'api.requests.status.patch',
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireApiUser(request.headers.get('authorization'));
  if (auth instanceof NextResponse) return auth;
  if (!can(auth, 'OPS_ADMIN_TL')) {
    return NextResponse.json({ error: 'Solo admin o TL pueden cambiar estado desde este endpoint.' }, { status: 403 });
  }
  const rate = enforceRateLimit({
    key: `status-patch:${auth.id}`,
    limit: 80,
    windowMs: 60_000
  });
  if (rate) return rate;
  const supabaseAdmin = getSupabaseAdminClient();
  const actor = actorFromUser(auth);

  const { id } = await context.params;
  const parsed = StatusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: current, error: fetchError } = await supabaseAdmin
    .from('citizen_request')
    .select('id, status')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  const nextStatus = parsed.data.status as RequestStatus;
  if (!isValidTransition(current.status as RequestStatus, nextStatus)) {
    return NextResponse.json({ error: `Invalid transition ${current.status} -> ${nextStatus}` }, { status: 409 });
  }

  const traceId = safeTraceId(request.headers.get('x-trace-id')) || crypto.randomUUID();
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('citizen_request')
    .update({
      status: nextStatus,
      updated_by_user_id: null,
      updated_by_agent_id: actor,
      trace_id: traceId
    })
    .eq('id', id)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabaseAdmin.from('audit_log').insert({
      entity_name: 'citizen_request',
      entity_id: id,
      action: 'status_change',
      payload: { from: current.status, to: nextStatus, changed_by_role: auth.role },
      before_json: { status: current.status },
      after_json: { status: nextStatus },
      actor_user_id: null,
      actor_agent_id: actor,
      trace_id: traceId
  });

  await supabaseAdmin
    .from('meeting_registry')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString()
    })
    .eq('request_id', id);

  const { data: source, error: sourceError } = await supabaseAdmin
    .from('citizen_request')
    .select('citizen_name, locality, neighborhood, topic, reason, created_by_agent_id')
    .eq('id', id)
    .single();
  if (sourceError) {
    return NextResponse.json({ error: sourceError.message }, { status: 500 });
  }

  const creatorAgentId = source?.created_by_agent_id ?? '';
  const creatorUserId = creatorAgentId.replace('supabase-auth:', '') || null;
  if (creatorUserId) {
    const { data: meeting } = await supabaseAdmin
      .from('meeting')
      .select('id, starts_at, location')
      .eq('request_id', id)
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const statusHeadline =
      nextStatus === 'rejected'
        ? 'REUNION RECHAZADA'
        : nextStatus === 'reschedule_requested'
          ? 'REUNION MODIFICADA'
          : nextStatus === 'approved' || nextStatus === 'scheduled'
            ? 'REUNION CONFIRMADA'
            : `ESTADO REUNION: ${nextStatus.toUpperCase()}`;

    await sendRequestChangeNotification({
      userId: creatorUserId,
      headline: statusHeadline,
      citizenName: source?.citizen_name ?? 'Sin nombre',
      topic: source?.topic ?? 'Sin tema',
      locality: source?.locality ?? null,
      neighborhood: source?.neighborhood ?? null,
      startsAt: meeting?.starts_at ?? null,
      location: meeting?.location ?? null,
      eventType: inferEventTypeFromReason(source?.reason)
    });

    if ((nextStatus === 'approved' || nextStatus === 'scheduled') && meeting) {
      await queueMeetingReminderNotifications({
        meetingId: meeting.id,
        requestId: id,
        startsAt: meeting.starts_at,
        recipientUserId: creatorUserId,
        actor: auth,
        traceId
      });
    }
  }

    return NextResponse.json({ data: updated });
  }
);
