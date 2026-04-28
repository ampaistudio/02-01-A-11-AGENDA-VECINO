import { getSupabaseAdminClient } from './supabase-admin';

const GAP_MINUTES = 30;
const GAP_MS = GAP_MINUTES * 60 * 1000;
const SLOT_MS = 30 * 60 * 1000;

export function validateMeetingSlotInput(startsAt: string, endsAt: string, now = new Date()): {
  starts: Date;
  ends: Date;
} {
  const starts = new Date(startsAt);
  const ends = new Date(endsAt);

  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
    throw new Error('Fecha inválida.');
  }

  if (starts < now) {
    throw new Error('La reunión no puede agendarse en el pasado.');
  }

  if (ends.getTime() - starts.getTime() !== SLOT_MS) {
    throw new Error('La reunión debe durar exactamente 30 minutos.');
  }

  return { starts, ends };
}

export function hasMeetingSlotConflict(params: {
  starts: Date;
  ends: Date;
  existingStartsAt: string;
  existingEndsAt: string;
}): boolean {
  const existingStart = new Date(params.existingStartsAt).getTime();
  const existingEnd = new Date(params.existingEndsAt).getTime();
  const noConflict =
    params.ends.getTime() + GAP_MS <= existingStart || params.starts.getTime() >= existingEnd + GAP_MS;
  return !noConflict;
}

export async function assertMeetingSlotAvailable(startsAt: string, endsAt: string): Promise<void> {
  const supabaseAdmin = getSupabaseAdminClient();
  const { starts, ends } = validateMeetingSlotInput(startsAt, endsAt);

  const from = new Date(starts.getTime() - GAP_MS).toISOString();
  const to = new Date(ends.getTime() + GAP_MS).toISOString();

  const { data, error } = await supabaseAdmin
    .from('meeting')
    .select('id, starts_at, ends_at')
    .lt('starts_at', to)
    .gt('ends_at', from)
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  for (const meeting of data ?? []) {
    if (
      hasMeetingSlotConflict({
        starts,
        ends,
        existingStartsAt: meeting.starts_at,
        existingEndsAt: meeting.ends_at
      })
    ) {
      throw new Error(
        'Ese horario está ocupado o demasiado cercano a otra reunión. Debe haber 30 minutos de intervalo entre reuniones.'
      );
    }
  }
}
