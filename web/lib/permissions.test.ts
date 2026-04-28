import assert from 'node:assert/strict';
import { test } from 'node:test';
import { can, type PermissionAction } from './permissions';
import type { ApiUser } from './api-auth';

function user(role: ApiUser['role']): ApiUser {
  return {
    id: `user-${role}`,
    email: `${role}@agenda.local`,
    role,
    sourceRole: role
  };
}

test('calendar full view is limited to admin and lider roles', () => {
  assert.equal(can(user('admin'), 'CALENDAR_FULL_VIEW'), true);
  assert.equal(can(user('lider'), 'CALENDAR_FULL_VIEW'), true);
  assert.equal(can(user('usuario'), 'CALENDAR_FULL_VIEW'), false);
});

test('usuarios keep self-service and limited calendar access', () => {
  const actions: PermissionAction[] = ['USER_SELF_SERVICE', 'CALENDAR_MINE_VIEW'];

  for (const action of actions) {
    assert.equal(can(user('usuario'), action), true);
  }
});

test('event publishing is blocked for usuario', () => {
  assert.equal(can(user('usuario'), 'EVENT_PUBLISH'), false);
  assert.equal(can(user('lider'), 'EVENT_PUBLISH'), true);
});
