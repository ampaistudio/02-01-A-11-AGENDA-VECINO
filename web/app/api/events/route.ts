import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '../../../lib/api-auth';
import { getSupabaseAdminClient } from '../../../lib/supabase-admin';
import { actorFromUser, can } from '../../../lib/permissions';
import { enforceRateLimit, safeTraceId } from '../../../lib/runtime-security';
import { withApiObservability } from '../../../lib/api-observability';

const EventSchema = z.object({
  title: z.string().min(3),
  details: z.string().min(5),
  startsAt: z.string().datetime(),
  location: z.string().optional()
});

export const GET = withApiObservability('api.events.get', async (request: NextRequest) => {
  const auth = await requireApiUser(request.headers.get('authorization'));
  if (auth instanceof NextResponse) return auth;

  if (!can(auth, 'USER_SELF_SERVICE')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from('broadcast_event')
    .select('id, title, details, starts_at, location, created_at')
    .order('starts_at', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
});

export const POST = withApiObservability('api.events.post', async (request: NextRequest) => {
  const auth = await requireApiUser(request.headers.get('authorization'));
  if (auth instanceof NextResponse) return auth;

  if (!can(auth, 'EVENT_PUBLISH')) {
    return NextResponse.json({ error: 'Solo admin o lider pueden publicar eventos.' }, { status: 403 });
  }
  const rate = enforceRateLimit({ key: `events-post:${auth.id}`, limit: 30, windowMs: 60_000 });
  if (rate) return rate;

  const body = await request.json();
  const parsed = EventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabaseAdmin = getSupabaseAdminClient();
  const traceId = safeTraceId(request.headers.get('x-trace-id'));
  const actor = actorFromUser(auth);
  const { data, error } = await supabaseAdmin
    .from('broadcast_event')
    .insert({
      title: parsed.data.title,
      details: parsed.data.details,
      starts_at: parsed.data.startsAt,
      location: parsed.data.location ?? null,
      created_by_agent_id: actor
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabaseAdmin.from('audit_log').insert({
    entity_name: 'broadcast_event',
    entity_id: data.id,
    action: 'create',
    payload: { title: data.title },
    actor_user_id: null,
    actor_agent_id: actor,
    trace_id: traceId
  });
  return NextResponse.json({ data }, { status: 201 });
});
