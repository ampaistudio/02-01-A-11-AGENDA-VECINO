import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '../../../../lib/api-auth';
import { getSupabaseAdminClient } from '../../../../lib/supabase-admin';
import { can } from '../../../../lib/permissions';
import { withApiObservability } from '../../../../lib/api-observability';

export const GET = withApiObservability('api.calendar.full.get', async (request: NextRequest) => {
  const auth = await requireApiUser(request.headers.get('authorization'));
  if (auth instanceof NextResponse) return auth;
  if (!can(auth, 'CALENDAR_FULL_VIEW')) {
    return NextResponse.json({ error: 'Solo ADMIN o TL pueden ver calendario completo.' }, { status: 403 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('meeting')
    .select(
      `
      id,
      request_id,
      starts_at,
      ends_at,
      location,
      sync_status,
      google_event_id,
      created_at,
      request:citizen_request (
        id,
        citizen_name,
        citizen_phone,
        topic,
        locality,
        neighborhood,
        status,
        created_by_agent_id
      )
    `
    )
    .order('starts_at', { ascending: true })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
});
