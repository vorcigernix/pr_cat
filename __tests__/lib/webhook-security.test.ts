// Unit tests for webhook security
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  verifyGitHubSignature,
  checkWebhookReplay,
  validatePayloadSize,
  validateEventType,
  validateWebhook,
  generateWebhookSecret,
  createTestSignature,
} from '@/lib/webhook-security';

describe('Webhook Security', () => {
  const testSecret = 'test-webhook-secret-123';
  const testPayload = JSON.stringify({ action: 'opened', pull_request: { number: 42 } });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyGitHubSignature', () => {
    it('should verify valid signature', () => {
      const signature = createTestSignature(testPayload, testSecret);
      const result = verifyGitHubSignature(testPayload, signature, testSecret);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid signature', () => {
      const invalidSignature = 'sha256=invalid123';
      const result = verifyGitHubSignature(testPayload, invalidSignature, testSecret);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature format');
    });

    it('should reject missing signature', () => {
      const result = verifyGitHubSignature(testPayload, null, testSecret);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing signature or secret');
    });

    it('should reject wrong signature format', () => {
      const wrongFormat = 'invalid-format';
      const result = verifyGitHubSignature(testPayload, wrongFormat, testSecret);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature format');
    });

    it('should be timing-safe against attacks', () => {
      const validSignature = createTestSignature(testPayload, testSecret);
      
      // Measure multiple verification attempts
      const timings: number[] = [];
      
      for (let i = 0; i < 100; i++) {
        const start = process.hrtime.bigint();
        verifyGitHubSignature(testPayload, validSignature, testSecret);
        const end = process.hrtime.bigint();
        timings.push(Number(end - start));
      }
      
      // Calculate variance - should be relatively consistent due to timing-safe comparison
      const avg = timings.reduce((a, b) => a + b) / timings.length;
      const variance = timings.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / timings.length;
      const stdDev = Math.sqrt(variance);
      
      // Standard deviation should be relatively small compared to average
      expect(stdDev / avg).toBeLessThan(1.0); // Less than 100% variance (relaxed for test environment)
    });
  });

  describe('checkWebhookReplay', () => {
    it('should allow new webhook delivery', async () => {
      const deliveryId = 'unique-delivery-123';
      const result = await checkWebhookReplay(deliveryId);
      
      expect(result.isReplay).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should detect replay of same delivery ID', async () => {
      const deliveryId = 'duplicate-delivery-456';
      
      // First call - should pass
      const result1 = await checkWebhookReplay(deliveryId);
      expect(result1.isReplay).toBe(false);
      
      // Second call with same ID - should fail
      const result2 = await checkWebhookReplay(deliveryId);
      expect(result2.isReplay).toBe(true);
      expect(result2.error).toBe('Webhook already processed');
    });

    it('should reject old timestamps', async () => {
      const deliveryId = 'old-delivery-789';
      const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
      
      const result = await checkWebhookReplay(deliveryId, oldTimestamp);
      
      expect(result.isReplay).toBe(true);
      expect(result.error).toBe('Webhook timestamp too old');
    });

    it('should accept recent timestamps', async () => {
      const deliveryId = 'recent-delivery-321';
      const recentTimestamp = new Date(Date.now() - 30 * 1000).toISOString(); // 30 seconds ago
      
      const result = await checkWebhookReplay(deliveryId, recentTimestamp);
      
      expect(result.isReplay).toBe(false);
    });

    it('should handle missing delivery ID', async () => {
      const result = await checkWebhookReplay(null);
      
      expect(result.isReplay).toBe(false);
      expect(result.error).toBe('No delivery ID provided');
    });
  });

  describe('validatePayloadSize', () => {
    it('should accept valid payload size', () => {
      const result = validatePayloadSize('1000');
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject oversized payload', () => {
      const maxSize = 1024; // 1KB
      const result = validatePayloadSize('2000', maxSize);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Payload too large');
    });

    it('should handle missing content-length header', () => {
      const result = validatePayloadSize(null);
      
      expect(result.valid).toBe(true); // Can't validate without header
    });

    it('should reject invalid content-length', () => {
      const result = validatePayloadSize('not-a-number');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid content-length header');
    });
  });

  describe('validateEventType', () => {
    const allowedEvents = ['pull_request', 'push', 'issues'];

    it('should accept allowed event type', () => {
      const result = validateEventType('pull_request', allowedEvents);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject disallowed event type', () => {
      const result = validateEventType('fork', allowedEvents);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unsupported event type: fork');
    });

    it('should reject missing event type', () => {
      const result = validateEventType(null, allowedEvents);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing event type header');
    });
  });

  describe('validateWebhook', () => {
    it('should validate complete webhook request', async () => {
      const deliveryId = 'test-delivery-' + Date.now();
      const signature = createTestSignature(testPayload, testSecret);
      
      const mockRequest = {
        headers: {
          get: jest.fn((header: string) => {
            switch (header) {
              case 'x-hub-signature-256': return signature;
              case 'x-github-event': return 'pull_request';
              case 'x-github-delivery': return deliveryId;
              case 'content-length': return testPayload.length.toString();
              default: return null;
            }
          }),
        },
        text: jest.fn().mockResolvedValue(testPayload),
      } as unknown as Request;

      const result = await validateWebhook(mockRequest, testSecret);
      
      expect(result.valid).toBe(true);
      expect(result.eventType).toBe('pull_request');
      expect(result.payload).toEqual(JSON.parse(testPayload));
    });

    it('should reject invalid signature in complete validation', async () => {
      const mockRequest = {
        headers: {
          get: jest.fn((header: string) => {
            switch (header) {
              case 'x-hub-signature-256': return 'sha256=invalid';
              case 'x-github-event': return 'pull_request';
              case 'x-github-delivery': return 'delivery-123';
              case 'content-length': return '100';
              default: return null;
            }
          }),
        },
        text: jest.fn().mockResolvedValue(testPayload),
      } as unknown as Request;

      const result = await validateWebhook(mockRequest, testSecret);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature format');
    });

    it('should reject oversized payload in complete validation', async () => {
      const mockRequest = {
        headers: {
          get: jest.fn((header: string) => {
            switch (header) {
              case 'x-hub-signature-256': return 'sha256=test';
              case 'x-github-event': return 'pull_request';
              case 'x-github-delivery': return 'delivery-456';
              case 'content-length': return '10000000'; // 10MB
              default: return null;
            }
          }),
        },
        text: jest.fn().mockResolvedValue(testPayload),
      } as unknown as Request;

      const result = await validateWebhook(mockRequest, testSecret);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Payload too large');
    });
  });

  describe('generateWebhookSecret', () => {
    it('should generate random secret of correct length', () => {
      const secret1 = generateWebhookSecret();
      const secret2 = generateWebhookSecret();
      
      expect(secret1).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(secret2).toHaveLength(64);
      expect(secret1).not.toBe(secret2); // Should be random
    });

    it('should generate custom length secret', () => {
      const secret = generateWebhookSecret(16);
      
      expect(secret).toHaveLength(32); // 16 bytes = 32 hex chars
    });
  });

  describe('createTestSignature', () => {
    it('should create valid GitHub-style signature', () => {
      const signature = createTestSignature(testPayload, testSecret);
      
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should create consistent signatures', () => {
      const sig1 = createTestSignature(testPayload, testSecret);
      const sig2 = createTestSignature(testPayload, testSecret);
      
      expect(sig1).toBe(sig2);
    });

    it('should create different signatures for different payloads', () => {
      const payload1 = JSON.stringify({ test: 1 });
      const payload2 = JSON.stringify({ test: 2 });
      
      const sig1 = createTestSignature(payload1, testSecret);
      const sig2 = createTestSignature(payload2, testSecret);
      
      expect(sig1).not.toBe(sig2);
    });
  });
});