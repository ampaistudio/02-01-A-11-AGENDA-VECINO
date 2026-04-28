import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { verifyTelegramWebhookSecret } from './telegram';

const originalSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
const originalInfo = console.info;

afterEach(() => {
  process.env.TELEGRAM_WEBHOOK_SECRET = originalSecret;
  console.info = originalInfo;
});

test('telegram webhook verification fails closed when secret is missing', () => {
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
  console.info = () => {};

  assert.equal(verifyTelegramWebhookSecret('anything'), false);
});

test('telegram webhook verification rejects an invalid secret', () => {
  process.env.TELEGRAM_WEBHOOK_SECRET = 'expected';

  assert.equal(verifyTelegramWebhookSecret('wrong'), false);
});

test('telegram webhook verification accepts the configured secret', () => {
  process.env.TELEGRAM_WEBHOOK_SECRET = 'expected';

  assert.equal(verifyTelegramWebhookSecret('expected'), true);
});
