import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isValidTransition } from './workflow';

test('approved requests can move to scheduled', () => {
  assert.equal(isValidTransition('approved', 'scheduled'), true);
});

test('pending leader approval cannot skip directly to scheduled', () => {
  assert.equal(isValidTransition('pending_leader_approval', 'scheduled'), false);
});
