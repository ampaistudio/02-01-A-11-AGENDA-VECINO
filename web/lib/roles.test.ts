import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getTrustedSupabaseRole, resolveRoleByEmailAndMetadata } from './roles';

test('getTrustedSupabaseRole prefers app_metadata over legacy user_metadata', () => {
  const role = getTrustedSupabaseRole({
    app_metadata: { role: 'lider' },
    user_metadata: { role: 'admin' }
  });

  assert.equal(role, 'lider');
});

test('getTrustedSupabaseRole falls back to legacy user_metadata during migration', () => {
  const role = getTrustedSupabaseRole({
    app_metadata: {},
    user_metadata: { role: 'referente' }
  });

  assert.equal(role, 'referente');
});

test('resolveRoleByEmailAndMetadata grants configured admin by email', () => {
  const role = resolveRoleByEmailAndMetadata({
    email: 'Admin@Agenda.Local',
    adminEmail: 'admin@agenda.local',
    rawRole: 'usuario'
  });

  assert.equal(role, 'admin');
});

test('resolveRoleByEmailAndMetadata normalizes referente to lider permissions', () => {
  const role = resolveRoleByEmailAndMetadata({
    email: 'referente@agenda.local',
    adminEmail: 'admin@agenda.local',
    rawRole: 'referente'
  });

  assert.equal(role, 'lider');
});
