import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '../../../../lib/api-auth';
import { getSupabaseAdminClient } from '../../../../lib/supabase-admin';
import { actorFromUser, can } from '../../../../lib/permissions';
import { enforceRateLimit, safeTraceId } from '../../../../lib/runtime-security';
import { withApiObservability } from '../../../../lib/api-observability';

const UpdateEventSchema = z.object({
  title: z.string().min(3).optional(),
  details: z.string().min(5).optional(),
  startsAt: z.string().datetime().optional(),
  location: z.string().nullable().optional()
});

export const PATCH = withApiObservability(
  'api.events.patch',
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireApiUser(request.headers.get('authorization'));
  if (auth instanceof NextResponse) return auth;

  if (!can(auth, 'EVENT_PUBLISH')) {
    return NextResponse.json({ error: 'Solo ADMIN o TL pueden editar eventos.' }, { status: 403 });
  }

  const rate = enforceRateLimit({ key: `events-patch:${auth.id}`, limit: 40, windowMs: 60_000 });
  if (rate) return rate;

  const parsed = UpdateEventSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { id } = await context.params;
  const supabase = getSupabaseAdminClient();
  const actor = actorFromUser(auth);
  const traceId = safeTraceId(request.headers.get('x-trace-id'));

  const current = await supabase.from('broadcast_event').select('*').eq('id', id).single();
  if (current.error || !current.data) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const updatedPayload = {
    title: parsed.data.title ?? current.data.title,
    details: parsed.data.details ?? current.data.details,
    starts_at: parsed.data.startsAt ?? current.data.starts_at,
    location: parsed.data.location === undefined ? current.data.location : parsed.data.location,
    updated_at: new Date().toISOString()
  };

  const updated = await supabase.from('broadcast_event').update(updatedPayload).eq('id', id).select('*').single();
  if (updated.error || !updated.data) {
    return NextResponse.json({ error: updated.error?.message ?? 'Could not update event' }, { status: 500 });
  }

  await supabase.from('audit_log').insert({
    entity_name: 'broadcast_event',
    entity_id: id,
    action: 'update',
    payload: { changed_by_role: auth.role },
    before_json: {
      title: current.data.title,
      details: current.data.details,
      starts_at: current.data.starts_at,
      location: current.data.location
    },
    after_json: {
      title: updated.data.title,
      details: updated.data.details,
      starts_at: updated.data.starts_at,
      location: updated.data.location
    },
    actor_user_id: null,
    actor_agent_id: actor,
    trace_id: traceId
  });

    return NextResponse.json({ data: updated.data });
  }
);
