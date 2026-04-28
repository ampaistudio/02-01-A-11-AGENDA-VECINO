import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '../../../../lib/api-auth';
import { getSupabaseAdminClient } from '../../../../lib/supabase-admin';
import { actorFromUser, can } from '../../../../lib/permissions';
import { enforceRateLimit, safeTraceId } from '../../../../lib/runtime-security';
import { sendRequestChangeNotification } from '../../../../lib/notifications';
import { withApiObservability } from '../../../../lib/api-observability';

const UpdateRequestSchema = z.object({
  citizenName: z.string().min(3).optional(),
  citizenPhone: z.string().min(6).optional(),
  topic: z.string().min(3).optional(),
  reason: z.string().min(5).optional(),
  locality: z.string().min(2).optional(),
  neighborhood: z.string().min(2).optional(),
  territory: z.string().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  preferredDatetime: z.string().datetime().nullable().optional(),
  locationHint: z.string().nullable().optional()
});

export const PATCH = withApiObservability(
  'api.requests.patch',
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireApiUser(request.headers.get('authorization'));
  if (auth instanceof NextResponse) return auth;

  if (!can(auth, 'OPS_ADMIN_TL')) {
    return NextResponse.json({ error: 'Solo ADMIN o TL pueden modificar solicitudes.' }, { status: 403 });
  }

  const rate = enforceRateLimit({ key: `request-patch:${auth.id}`, limit: 80, windowMs: 60_000 });
  if (rate) return rate;

  const { id } = await context.params;
  const parsed = UpdateRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const actor = actorFromUser(auth);
  const traceId = safeTraceId(request.headers.get('x-trace-id'));

  const currentResp = await supabase
    .from('citizen_request')
    .select('id, citizen_name, citizen_phone, topic, reason, locality, neighborhood, territory, priority, preferred_datetime, location_hint, created_by_agent_id')
    .eq('id', id)
    .single();

  if (currentResp.error || !currentResp.data) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  const current = currentResp.data;
  const updates = {
    citizen_name: parsed.data.citizenName ?? current.citizen_name,
    citizen_phone: parsed.data.citizenPhone ?? current.citizen_phone,
    topic: parsed.data.topic ?? current.topic,
    reason: parsed.data.reason ?? current.reason,
    locality: parsed.data.locality ?? current.locality,
    neighborhood: parsed.data.neighborhood ?? current.neighborhood,
    territory: parsed.data.territory ?? current.territory,
    priority: parsed.data.priority ?? current.priority,
    preferred_datetime:
      parsed.data.preferredDatetime === undefined ? current.preferred_datetime : parsed.data.preferredDatetime,
    location_hint: parsed.data.locationHint === undefined ? current.location_hint : parsed.data.locationHint,
    updated_by_user_id: null,
    updated_by_agent_id: actor,
    trace_id: traceId
  };

  const updateResp = await supabase.from('citizen_request').update(updates).eq('id', id).select('*').single();
  if (updateResp.error || !updateResp.data) {
    return NextResponse.json({ error: updateResp.error?.message ?? 'Could not update request' }, { status: 500 });
  }

  const updated = updateResp.data;
  await supabase.from('audit_log').insert({
    entity_name: 'citizen_request',
    entity_id: id,
    action: 'modify_request',
    payload: { changed_by_role: auth.role },
    before_json: {
      citizen_name: current.citizen_name,
      citizen_phone: current.citizen_phone,
      topic: current.topic,
      reason: current.reason,
      locality: current.locality,
      neighborhood: current.neighborhood,
      territory: current.territory,
      priority: current.priority,
      preferred_datetime: current.preferred_datetime,
      location_hint: current.location_hint
    },
    after_json: {
      citizen_name: updated.citizen_name,
      citizen_phone: updated.citizen_phone,
      topic: updated.topic,
      reason: updated.reason,
      locality: updated.locality,
      neighborhood: updated.neighborhood,
      territory: updated.territory,
      priority: updated.priority,
      preferred_datetime: updated.preferred_datetime,
      location_hint: updated.location_hint
    },
    actor_user_id: null,
    actor_agent_id: actor,
    trace_id: traceId
  });

  const creatorUserId = current.created_by_agent_id?.replace('supabase-auth:', '') || null;
  if (creatorUserId) {
    const meetingResp = await supabase
      .from('meeting')
      .select('starts_at, location')
      .eq('request_id', id)
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    await sendRequestChangeNotification({
      userId: creatorUserId,
      headline: 'REUNION MODIFICADA',
      citizenName: updated.citizen_name,
      topic: updated.topic,
      locality: updated.locality,
      neighborhood: updated.neighborhood,
      startsAt: meetingResp.data?.starts_at ?? null,
      location: meetingResp.data?.location ?? null
    });
  }

    return NextResponse.json({ data: updated });
  }
);
