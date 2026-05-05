import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '../../../../lib/api-auth';
import { getSupabaseAdminClient } from '../../../../lib/supabase-admin';
import { actorFromUser, can } from '../../../../lib/permissions';
import { withApiObservability } from '../../../../lib/api-observability';

export const GET = withApiObservability('api.calendar.mine.get', async (request: NextRequest) => {
  const auth = await requireApiUser(request.headers.get('authorization'));
  if (auth instanceof NextResponse) return auth;
  if (!can(auth, 'CALENDAR_MINE_VIEW')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getSupabaseAdminClient();

  if (can(auth, 'CALENDAR_FULL_VIEW')) {
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
          citizen_name,
          citizen_phone,
          topic,
          reason,
          locality,
          neighborhood,
          status
        )
      `
      )
      .order('starts_at', { ascending: true })
      .limit(300);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  }

  const actor = actorFromUser(auth);
  const ownedRequests = await supabase.from('citizen_request').select('id').eq('created_by_agent_id', actor).limit(500);
  if (ownedRequests.error) return NextResponse.json({ error: ownedRequests.error.message }, { status: 500 });
  const requestIds = (ownedRequests.data ?? []).map((row: { id: string }) => row.id);
  if (requestIds.length === 0) return NextResponse.json({ data: [] });

  const meetings = await supabase
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
        citizen_name,
        citizen_phone,
        topic,
        reason,
        locality,
        neighborhood,
        status
      )
    `
    )
    .in('request_id', requestIds)
    .order('starts_at', { ascending: true })
    .limit(300);

  if (meetings.error) return NextResponse.json({ error: meetings.error.message }, { status: 500 });
  return NextResponse.json({ data: meetings.data ?? [] });
});
