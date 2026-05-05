import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '../../../lib/api-auth';
import { getSupabaseAdminClient } from '../../../lib/supabase-admin';
import { actorFromUser, can } from '../../../lib/permissions';
import { enforceRateLimit, safeTraceId } from '../../../lib/runtime-security';
import { withApiObservability } from '../../../lib/api-observability';
import { encodeReasonWithEventType } from '../../../lib/event-type';

const CreateRequestSchema = z.object({
  citizenName: z.string().min(3),
  citizenPhone: z.string().min(6).optional(),
  topic: z.string().min(3),
  reason: z.string().min(5),
  eventType: z.enum(['reunion', 'llamado']).default('reunion'),
  locality: z.string().min(2).optional(),
  neighborhood: z.string().min(2).optional(),
  territory: z.string().optional(),
  preferredDatetime: z.string().datetime().optional(),
  priority: z.number().int().min(1).max(5).default(3)
});

export const GET = withApiObservability('api.requests.get', async (request: NextRequest) => {
  const auth = await requireApiUser(request.headers.get('authorization'));
  if (auth instanceof NextResponse) return auth;
  const supabaseAdmin = getSupabaseAdminClient();

  const actor = actorFromUser(auth);
  let query = supabaseAdmin
    .from('citizen_request')
    .select('id, citizen_name, citizen_phone, topic, locality, neighborhood, reason, status, priority, preferred_datetime, created_at, created_by_agent_id')
    .order('created_at', { ascending: false })
    .limit(200);

  if (!can(auth, 'OPS_ADMIN_TL')) {
    query = query.eq('created_by_agent_id', actor);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
});

export const POST = withApiObservability('api.requests.post', async (request: NextRequest) => {
  const auth = await requireApiUser(request.headers.get('authorization'));
  if (auth instanceof NextResponse) return auth;
  const supabaseAdmin = getSupabaseAdminClient();
  const rate = enforceRateLimit({
    key: `requests-post:${auth.id}`,
    limit: 40,
    windowMs: 60_000,
    message: 'Rate limit exceeded for request creation'
  });
  if (rate) return rate;

  if (!can(auth, 'USER_SELF_SERVICE')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = CreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const traceId = safeTraceId(request.headers.get('x-trace-id')) || crypto.randomUUID();
  const actor = actorFromUser(auth);
  const payload = {
    citizen_name: parsed.data.citizenName,
    citizen_phone: parsed.data.citizenPhone ?? null,
    topic: parsed.data.topic,
    reason: encodeReasonWithEventType(parsed.data.reason, parsed.data.eventType),
    locality: parsed.data.locality ?? null,
    neighborhood: parsed.data.neighborhood ?? null,
    territory: parsed.data.territory ?? null,
    preferred_datetime: parsed.data.preferredDatetime ?? null,
    priority: parsed.data.priority,
    status: 'submitted',
    created_by_user_id: null,
    created_by_agent_id: actor,
    updated_by_user_id: null,
    updated_by_agent_id: actor,
    trace_id: traceId
  };

  const { data, error } = await supabaseAdmin.from('citizen_request').insert(payload).select('*').single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin.from('audit_log').insert({
    entity_name: 'citizen_request',
    entity_id: data.id,
    action: 'create',
    payload: { status: data.status, role: auth.role },
    actor_user_id: null,
    actor_agent_id: actor,
    trace_id: traceId
  });

  return NextResponse.json({ data }, { status: 201 });
});
