import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '../../../../lib/api-auth';
import { getSupabaseAdminClient } from '../../../../lib/supabase-admin';
import { actorFromUser, can } from '../../../../lib/permissions';
import { safeTraceId } from '../../../../lib/runtime-security';
import { withApiObservability } from '../../../../lib/api-observability';

const IdentitySchema = z.object({
  userId: z.string().uuid(),
  chatId: z.string().min(3),
  active: z.boolean().default(true)
});

export const POST = withApiObservability('api.telegram.identity.post', async (request: NextRequest) => {
  const auth = await requireApiUser(request.headers.get('authorization'));
  if (auth instanceof NextResponse) return auth;
  if (!can(auth, 'SYSTEM_ADMIN_ONLY')) {
    return NextResponse.json({ error: 'Solo ADMIN puede vincular Telegram.' }, { status: 403 });
  }

  const parsed = IdentitySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const actor = actorFromUser(auth);
  const traceId = safeTraceId(request.headers.get('x-trace-id'));

  const upsert = await supabase
    .from('telegram_identity')
    .upsert(
      {
        user_id: parsed.data.userId,
        chat_id: parsed.data.chatId,
        active: parsed.data.active,
        linked_by_admin: actor,
        linked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single();

  if (upsert.error || !upsert.data) {
    return NextResponse.json({ error: upsert.error?.message ?? 'No se pudo vincular Telegram.' }, { status: 500 });
  }

  await supabase.from('audit_log').insert({
    entity_name: 'telegram_identity',
    entity_id: upsert.data.id,
    action: 'upsert_identity',
    payload: { user_id: parsed.data.userId, active: parsed.data.active },
    actor_user_id: null,
    actor_agent_id: actor,
    trace_id: traceId
  });

  return NextResponse.json({ data: upsert.data }, { status: 201 });
});
