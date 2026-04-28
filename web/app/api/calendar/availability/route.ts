import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '../../../../lib/api-auth';
import { getSupabaseAdminClient } from '../../../../lib/supabase-admin';
import { hasMeetingSlotConflict, validateMeetingSlotInput } from '../../../../lib/meeting-slot';
import { withApiObservability } from '../../../../lib/api-observability';

const AvailabilitySchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime()
});

export const POST = withApiObservability('api.calendar.availability.post', async (request: NextRequest) => {
  const auth = await requireApiUser(request.headers.get('authorization'));
  if (auth instanceof NextResponse) return auth;

  const parsed = AvailabilitySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let slot: ReturnType<typeof validateMeetingSlotInput>;
  try {
    slot = validateMeetingSlotInput(parsed.data.startsAt, parsed.data.endsAt);
  } catch (error) {
    return NextResponse.json({ available: false, reason: (error as Error).message }, { status: 200 });
  }

  const from = new Date(slot.starts.getTime() - 30 * 60 * 1000).toISOString();
  const to = new Date(slot.ends.getTime() + 30 * 60 * 1000).toISOString();
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('meeting')
    .select('id, starts_at, ends_at')
    .lt('starts_at', to)
    .gt('ends_at', from)
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const conflict = (data ?? []).some((meeting) =>
    hasMeetingSlotConflict({
      starts: slot.starts,
      ends: slot.ends,
      existingStartsAt: meeting.starts_at,
      existingEndsAt: meeting.ends_at
    })
  );

  return NextResponse.json({
    available: !conflict,
    reason: conflict
      ? 'Ese horario está ocupado o demasiado cercano a otra reunión. Debe haber 30 minutos de intervalo entre reuniones.'
      : null
  });
});
