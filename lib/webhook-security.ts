// Enhanced webhook security utilities
import crypto from 'crypto';

// Cache for processed webhook IDs to prevent replay attacks
const processedWebhooks = new Map<string, number>();
const WEBHOOK_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_TRACKED_DELIVERIES = 10_000;
const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Verify GitHub webhook signature with enhanced security
 */
export function verifyGitHubSignature(
  payload: string,
  signature: string | null,
  secret: string
): { valid: boolean; error?: string } {
  if (!signature || !secret) {
    return { valid: false, error: 'Missing signature or secret' };
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  const expectedSignatureWithPrefix = `sha256=${expectedSignature}`;
  
  // Use crypto.timingSafeEqual to prevent timing attacks
  if (!/^sha256=[a-f0-9]{64}$/.test(signature)) {
    return { valid: false, error: 'Invalid signature format' };
  }
  
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSignatureWithPrefix, 'utf8')
  );
  
  return { valid: isValid, error: isValid ? undefined : 'Signature verification failed' };
}

/**
 * Check if webhook has already been processed (replay attack prevention)
 */
export function checkWebhookReplay(
  deliveryId: string | null,
  timestamp?: string | null
): { isReplay: boolean; error?: string } {
  if (!deliveryId) {
    return { isReplay: false, error: 'No delivery ID provided' };
  }
  
  // Check timestamp if provided
  if (timestamp) {
    const webhookTime = new Date(timestamp).getTime();
    const now = Date.now();
    
    if (!Number.isFinite(webhookTime)) return { isReplay: false, error: 'Invalid webhook timestamp' };

    // Reject webhooks older than 5 minutes
    if (Math.abs(now - webhookTime) > WEBHOOK_EXPIRY_MS) {
      return { isReplay: true, error: 'Webhook timestamp too old' };
    }
  }
  
  const now = Date.now();
  // Map insertion order lets cleanup stop at the first unexpired delivery.
  for (const [id, receivedAt] of processedWebhooks) {
    if (now - receivedAt <= WEBHOOK_EXPIRY_MS) break;
    processedWebhooks.delete(id);
  }
  if (processedWebhooks.has(deliveryId)) return { isReplay: true, error: 'Webhook already processed' };
  if (processedWebhooks.size >= MAX_TRACKED_DELIVERIES) {
    return { isReplay: false, error: 'Webhook delivery cache is full; retry later' };
  }
  processedWebhooks.set(deliveryId, now);
  return { isReplay: false };
}

export function releaseWebhookDelivery(deliveryId: string): void {
  processedWebhooks.delete(deliveryId);
}

/**
 * Validate webhook payload size
 */
export function validatePayloadSize(
  contentLength: string | null,
  maxSizeBytes: number = MAX_PAYLOAD_BYTES
): { valid: boolean; error?: string } {
  if (!contentLength) {
    return { valid: true }; // Can't validate without header
  }
  
  const size = Number(contentLength);
  if (!/^\d+$/.test(contentLength) || !Number.isSafeInteger(size)) {
    return { valid: false, error: 'Invalid content-length header' };
  }
  
  if (size > maxSizeBytes) {
    return { 
      valid: false, 
      error: `Payload too large: ${size} bytes (max: ${maxSizeBytes})` 
    };
  }
  
  return { valid: true };
}

/**
 * Validate webhook event type
 */
export function validateEventType(
  eventType: string | null,
  allowedEvents: string[]
): { valid: boolean; error?: string } {
  if (!eventType) {
    return { valid: false, error: 'Missing event type header' };
  }
  
  if (!allowedEvents.includes(eventType)) {
    return { 
      valid: false, 
      error: `Unsupported event type: ${eventType}` 
    };
  }
  
  return { valid: true };
}

/**
 * Complete webhook validation pipeline
 */
export async function validateWebhook(
  request: Request,
  secret: string,
  allowedEvents: string[] = ['pull_request', 'pull_request_review', 'installation', 'ping']
): Promise<{ valid: boolean; error?: string; eventType?: string; payload?: Record<string, unknown>; deliveryId?: string }> {
  // Extract headers
  const signature = request.headers.get('x-hub-signature-256');
  const eventType = request.headers.get('x-github-event');
  const deliveryId = request.headers.get('x-github-delivery');
  const contentLength = request.headers.get('content-length');
  
  // Validate payload size
  const sizeCheck = validatePayloadSize(contentLength);
  if (!sizeCheck.valid) {
    return { valid: false, error: sizeCheck.error };
  }
  
  // Validate event type
  const eventCheck = validateEventType(eventType, allowedEvents);
  if (!eventCheck.valid) {
    return { valid: false, error: eventCheck.error };
  }
  
  if (!deliveryId) return { valid: false, error: 'No delivery ID provided' };

  // Bound actual bytes, including requests without a Content-Length header.
  let bodyText: string;
  try {
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_PAYLOAD_BYTES) {
          await reader.cancel();
          return { valid: false, error: 'Payload too large' };
        }
        chunks.push(value);
      }
    }
    bodyText = Buffer.concat(chunks).toString('utf8');
  } catch {
    return { valid: false, error: 'Failed to read request body' };
  }

  // Verify signature
  const signatureCheck = verifyGitHubSignature(bodyText, signature, secret);
  if (!signatureCheck.valid) {
    return { valid: false, error: signatureCheck.error };
  }
  
  // Parse JSON
  let payload: unknown;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return { valid: false, error: 'Invalid JSON payload' };
  }
  
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'Webhook payload must be an object' };
  }

  // Reserve only validated deliveries; the handler releases failures for retry.
  const replayCheck = checkWebhookReplay(deliveryId);
  if (replayCheck.isReplay || replayCheck.error) return { valid: false, error: replayCheck.error };

  return { 
    valid: true, 
    eventType: eventType!,
    payload: payload as Record<string, unknown>,
    deliveryId,
  };
}
