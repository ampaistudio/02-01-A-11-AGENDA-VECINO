import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasMeetingSlotConflict, validateMeetingSlotInput } from './meeting-slot';

const now = new Date('2026-04-23T12:00:00.000Z');

test('meeting slot accepts exactly 30 minutes', () => {
  const result = validateMeetingSlotInput(
    '2026-04-24T15:00:00.000Z',
    '2026-04-24T15:30:00.000Z',
    now
  );

  assert.equal(result.starts.toISOString(), '2026-04-24T15:00:00.000Z');
  assert.equal(result.ends.toISOString(), '2026-04-24T15:30:00.000Z');
});

test('meeting slot rejects durations rounded near 30 minutes', () => {
  assert.throws(
    () =>
      validateMeetingSlotInput(
        '2026-04-24T15:00:00.000Z',
        '2026-04-24T15:29:59.999Z',
        now
      ),
    /exactamente 30 minutos/
  );
});

test('meeting slot rejects past starts', () => {
  assert.throws(
    () =>
      validateMeetingSlotInput(
        '2026-04-22T15:00:00.000Z',
        '2026-04-22T15:30:00.000Z',
        now
      ),
    /pasado/
  );
});

test('meeting slot conflict includes the required 30 minute gap', () => {
  const { starts, ends } = validateMeetingSlotInput(
    '2026-04-24T15:00:00.000Z',
    '2026-04-24T15:30:00.000Z',
    now
  );

  assert.equal(
    hasMeetingSlotConflict({
      starts,
      ends,
      existingStartsAt: '2026-04-24T15:55:00.000Z',
      existingEndsAt: '2026-04-24T16:25:00.000Z'
    }),
    true
  );

  assert.equal(
    hasMeetingSlotConflict({
      starts,
      ends,
      existingStartsAt: '2026-04-24T16:00:00.000Z',
      existingEndsAt: '2026-04-24T16:30:00.000Z'
    }),
    false
  );
});
