import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '../../../../lib/api-auth';
import { getSupabaseAdminClient } from '../../../../lib/supabase-admin';
import { actorFromUser, can } from '../../../../lib/permissions';
import { withApiObservability } from '../../../../lib/api-observability';

export const GET = withApiObservability('api.meetings.mine.get', async (request: NextRequest) => {
  const auth = await requireApiUser(request.headers.get('authorization'));
  if (auth instanceof NextResponse) return auth;

  if (!can(auth, 'CALENDAR_MINE_VIEW')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const actor = actorFromUser(auth);
  let requestIds: string[] | null = null;

  if (!can(auth, 'CALENDAR_FULL_VIEW')) {
    const ownedRequests = await supabaseAdmin
      .from('citizen_request')
      .select('id')
      .eq('created_by_agent_id', actor)
      .limit(500);

    if (ownedRequests.error) {
      return NextResponse.json({ error: ownedRequests.error.message }, { status: 500 });
    }

    requestIds = (ownedRequests.data ?? []).map((row) => row.id);
    if (requestIds.length === 0) {
      return NextResponse.json({ data: [] });
    }
  }

  let query = supabaseAdmin
    .from('meeting')
    .select(`
      id,
      request_id,
      starts_at,
      ends_at,
      location,
      sync_status,
      google_event_id,
      created_at,
      request:citizen_request (
        citizen_name,
        citizen_phone,
        topic,
        locality,
        neighborhood,
        status
      )
    `)
    .order('starts_at', { ascending: true });

  if (requestIds) {
    query = query.in('request_id', requestIds);
  }

  const { data, error } = await query.limit(300);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
});
