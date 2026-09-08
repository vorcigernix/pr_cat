/** @jest-environment node */

import {
  verifyGitHubSignature,
  checkWebhookReplay,
  validatePayloadSize,
  validateEventType,
  validateWebhook,
} from '@/lib/webhook-security';

const secret = 'test-webhook-secret-123';
const payload = '{"action":"opened","pull_request":{"number":42}}';
// Fixed HMAC-SHA256 vector, generated independently of the production verifier.
const signature = 'sha256=cd26e9978fe07d5a4afca8560e13d6871a04e440819fe8c1acbb4d8a98bd4ac9';

describe('Webhook validation', () => {
  it('accepts an independently signed payload', () => {
    expect(verifyGitHubSignature(payload, signature, secret)).toEqual({ valid: true, error: undefined });
  });

  it.each(['sha256=invalid123', 'invalid-format'])('rejects malformed signature %s', invalid => {
    expect(verifyGitHubSignature(payload, invalid, secret)).toEqual({ valid: false, error: 'Invalid signature format' });
  });

  it.each([[null, secret], [signature, '']] as const)('rejects missing signature or secret', (header, key) => {
    expect(verifyGitHubSignature(payload, header, key)).toEqual({ valid: false, error: 'Missing signature or secret' });
  });

  it.each([[`${payload} `, secret], [payload, 'wrong-secret']])('rejects altered payloads or signing secrets', (body, key) => {
    expect(verifyGitHubSignature(body, signature, key)).toEqual({ valid: false, error: 'Signature verification failed' });
  });

  it('accepts a delivery once and rejects reuse of its ID', () => {
    expect(checkWebhookReplay('duplicate-delivery')).toEqual({ isReplay: false });
    expect(checkWebhookReplay('duplicate-delivery')).toEqual({ isReplay: true, error: 'Webhook already processed' });
  });

  it.each([
    ['old', 600000, { isReplay: true, error: 'Webhook timestamp too old' }],
    ['recent', 30000, { isReplay: false }],
  ] as const)('validates %s delivery timestamps', (id, age, expected) => {
    expect(checkWebhookReplay(id, new Date(Date.now() - age).toISOString())).toEqual(expected);
  });

  it('reports when replay protection has no delivery ID', () => {
    expect(checkWebhookReplay(null)).toEqual({ isReplay: false, error: 'No delivery ID provided' });
  });

  it.each([
    ['1000', undefined, { valid: true }],
    ['2000', 1024, { valid: false, error: 'Payload too large: 2000 bytes (max: 1024)' }],
    [null, undefined, { valid: true }],
    ['not-a-number', undefined, { valid: false, error: 'Invalid content-length header' }],
  ] as const)('validates payload length %s with limit %s', (length, maximum, expected) => {
    expect(validatePayloadSize(length, maximum)).toEqual(expected);
  });

  it.each([
    ['pull_request', { valid: true }],
    ['fork', { valid: false, error: 'Unsupported event type: fork' }],
    [null, { valid: false, error: 'Missing event type header' }],
  ] as const)('validates event type %s', (event, expected) => {
    expect(validateEventType(event, ['pull_request', 'push', 'issues'])).toEqual(expected);
  });

  it.each([
    ['valid', signature, payload.length.toString(), { valid: true, eventType: 'pull_request', payload: JSON.parse(payload) }],
    ['bad-signature', 'sha256=invalid', payload.length.toString(), { valid: false, error: 'Invalid signature format' }],
    ['oversized', signature, '10000000', { valid: false, error: 'Payload too large: 10000000 bytes (max: 5242880)' }],
  ] as const)('validates a complete %s request using real request headers and body', async (id, header, length, expected) => {
    const request = new Request('http://localhost/api/webhook', {
      method: 'POST',
      headers: {
        'x-hub-signature-256': header,
        'x-github-event': 'pull_request',
        'x-github-delivery': id,
        'content-length': length,
      },
      body: payload,
    });
    expect(await validateWebhook(request, secret)).toMatchObject(expected);
  });
});
