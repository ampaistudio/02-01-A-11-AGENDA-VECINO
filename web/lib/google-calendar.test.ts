import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditGoogleCalendarConfig } from './google-calendar';

test('google calendar audit reports missing env vars', () => {
  const previous = {
    GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  };

  delete process.env.GOOGLE_CALENDAR_ID;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  const result = auditGoogleCalendarConfig();
  assert.equal(result.configured, false);
  assert.equal(result.ready, false);
  assert.equal(result.checks.some((check) => check.ok), false);

  process.env.GOOGLE_CALENDAR_ID = previous.GOOGLE_CALENDAR_ID;
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = previous.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = previous.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
});

test('google calendar audit accepts well formed env vars', () => {
  const previous = {
    GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  };

  process.env.GOOGLE_CALENDAR_ID = 'agenda@example.com';
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'calendar-bot@example.iam.gserviceaccount.com';
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----';

  const result = auditGoogleCalendarConfig();
  assert.equal(result.configured, true);
  assert.equal(result.ready, false);
  assert.equal(result.checks.every((check) => check.ok), true);

  process.env.GOOGLE_CALENDAR_ID = previous.GOOGLE_CALENDAR_ID;
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = previous.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = previous.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
});
