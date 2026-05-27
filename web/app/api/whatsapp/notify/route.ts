import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '../../../../lib/api-auth';
import { can } from '../../../../lib/permissions';
import { getSupabaseAdminClient } from '../../../../lib/supabase-admin';
import { sendWhatsAppText } from '../../../../lib/whatsapp';

const BodySchema = z.object({
  message: z.string().min(3),
  onlyUpcoming: z.boolean().optional().default(true),
  limit: z.number().int().min(1).max(500).optional().default(200)
});

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request.headers.get('authorization'));
  if (auth instanceof NextResponse) return auth;
  if (!can(auth, 'OPS_ADMIN_TL')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  let query = supabase
    .from('meeting_diffusion_contact')
    .select('id, citizen_name, citizen_phone, starts_at, topic, locality, neighborhood')
    .order('starts_at', { ascending: true })
    .limit(parsed.data.limit);

  if (parsed.data.onlyUpcoming) {
    query = query.gte('starts_at', nowIso);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  let sent = 0;
  const failed: Array<{ id: string; reason: string }> = [];

  for (const row of rows) {
    const result = await sendWhatsAppText({
      to: row.citizen_phone,
      body: parsed.data.message
    });
    if (result.ok) sent += 1;
    else failed.push({ id: row.id, reason: result.error ?? `HTTP ${result.status ?? 'unknown'}` });
  }

  return NextResponse.json({
    ok: true,
    total: rows.length,
    sent,
    failed
  });
}
