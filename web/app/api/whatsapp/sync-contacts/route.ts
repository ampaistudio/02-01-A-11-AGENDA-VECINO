import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '../../../../lib/api-auth';
import { can } from '../../../../lib/permissions';
import { getSupabaseAdminClient } from '../../../../lib/supabase-admin';

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request.headers.get('authorization'));
  if (auth instanceof NextResponse) return auth;
  if (!can(auth, 'OPS_ADMIN_TL')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getSupabaseAdminClient();

  const meetingsRes = await supabase
    .from('meeting')
    .select(
      'id, request_id, starts_at, ends_at, location, request:citizen_request(citizen_name,citizen_phone,topic,locality,neighborhood)'
    )
    .order('starts_at', { ascending: false })
    .limit(500);

  if (meetingsRes.error) {
    return NextResponse.json({ error: meetingsRes.error.message }, { status: 500 });
  }

  const payload = (meetingsRes.data ?? [])
    .map((row: {
      id: string;
      request_id: string | null;
      starts_at: string;
      ends_at: string;
      location: string | null;
      request:
        | {
            citizen_name: string;
            citizen_phone: string;
            topic: string | null;
            locality: string | null;
            neighborhood: string | null;
          }
        | Array<{
            citizen_name: string;
            citizen_phone: string;
            topic: string | null;
            locality: string | null;
            neighborhood: string | null;
          }>
        | null;
    }) => {
      const req = Array.isArray(row.request) ? row.request[0] : row.request;
      if (!req?.citizen_phone || !req?.citizen_name) return null;
      return {
        meeting_id: row.id,
        request_id: row.request_id,
        citizen_name: req.citizen_name,
        citizen_phone: req.citizen_phone,
        topic: req.topic ?? null,
        locality: req.locality ?? null,
        neighborhood: req.neighborhood ?? null,
        starts_at: row.starts_at,
        ends_at: row.ends_at,
        location: row.location ?? null,
        source: 'meeting_sync'
      };
    })
    .filter(Boolean);

  if (payload.length === 0) {
    return NextResponse.json({ ok: true, upserted: 0 });
  }

  const upsert = await supabase.from('meeting_diffusion_contact').upsert(payload, { onConflict: 'meeting_id' });
  if (upsert.error) {
    return NextResponse.json({ error: upsert.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, upserted: payload.length });
}
