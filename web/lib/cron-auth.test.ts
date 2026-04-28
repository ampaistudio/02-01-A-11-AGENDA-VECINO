import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyCronBearer } from './cron-auth';

test('cron auth fails closed when secret is missing', () => {
  assert.deepEqual(verifyCronBearer({ bearer: null, secret: undefined }), {
    ok: false,
    status: 503,
    error: 'Cron secret is not configured',
    event: 'cron_secret_missing'
  });
});

test('cron auth rejects invalid bearer tokens', () => {
  assert.deepEqual(verifyCronBearer({ bearer: 'Bearer wrong', secret: 'expected' }), {
    ok: false,
    status: 401,
    error: 'Unauthorized cron call'
  });
});

test('cron auth accepts the configured bearer token', () => {
  assert.deepEqual(verifyCronBearer({ bearer: 'Bearer expected', secret: ' expected ' }), {
    ok: true
  });
});
