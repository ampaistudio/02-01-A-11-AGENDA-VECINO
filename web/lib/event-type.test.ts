import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encodeReasonWithEventType, inferEventTypeFromReason, stripEventTypePrefix } from './event-type';

test('encodes and restores llamado event type', () => {
  const encoded = encodeReasonWithEventType('Llamar por gestión', 'llamado');
  assert.equal(encoded, '[LLAMADO] Llamar por gestión');
  assert.equal(inferEventTypeFromReason(encoded), 'llamado');
  assert.equal(stripEventTypePrefix(encoded), 'Llamar por gestión');
});

test('defaults to reunion when no prefix exists', () => {
  assert.equal(inferEventTypeFromReason('Coordinar encuentro barrial'), 'reunion');
});
