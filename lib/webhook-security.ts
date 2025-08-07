// Enhanced webhook security utilities
import crypto from 'crypto';

// Cache for processed webhook IDs to prevent replay attacks
const processedWebhooks = new Map<string, number>();
const WEBHOOK_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

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
  if (signature.length !== expectedSignatureWithPrefix.length) {
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
export async function checkWebhookReplay(
  deliveryId: string | null,
  timestamp?: string | null
): Promise<{ isReplay: boolean; error?: string }> {
  if (!deliveryId) {
    return { isReplay: false, error: 'No delivery ID provided' };
  }
  
  // Check timestamp if provided
  if (timestamp) {
    const webhookTime = new Date(timestamp).getTime();
    const now = Date.now();
    
    // Reject webhooks older than 5 minutes
    if (Math.abs(now - webhookTime) > WEBHOOK_EXPIRY_MS) {
      return { isReplay: true, error: 'Webhook timestamp too old' };
    }
  }
  
  // Check if we've already processed this webhook ID
  const existingTimestamp = processedWebhooks.get(deliveryId);
  if (existingTimestamp) {
    return { isReplay: true, error: 'Webhook already processed' };
  }
  
  // If using Vercel KV (optional, for distributed systems)
  // Commented out until @vercel/kv is installed
  // if (process.env.KV_REST_API_URL) {
  //   try {
  //     const kvKey = `webhook:${deliveryId}`;
  //     const exists = await kv.get(kvKey);
  //     
  //     if (exists) {
  //       return { isReplay: true, error: 'Webhook already processed (KV)' };
  //     }
  //     
  //     // Store with expiry
  //     await kv.set(kvKey, Date.now(), { ex: 300 }); // 5 minutes TTL
  //   } catch (error) {
  //     console.warn('Failed to check/store webhook in KV:', error);
  //     // Fall back to in-memory storage
  //   }
  // }
  
  // Store in memory
  processedWebhooks.set(deliveryId, Date.now());
  
  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    cleanupProcessedWebhooks();
  }
  
  return { isReplay: false };
}

/**
 * Clean up old processed webhook IDs from memory
 */
function cleanupProcessedWebhooks() {
  const now = Date.now();
  for (const [id, timestamp] of processedWebhooks.entries()) {
    if (now - timestamp > WEBHOOK_EXPIRY_MS) {
      processedWebhooks.delete(id);
    }
  }
}

/**
 * Validate webhook payload size
 */
export function validatePayloadSize(
  contentLength: string | null,
  maxSizeBytes: number = 5 * 1024 * 1024 // 5MB default
): { valid: boolean; error?: string } {
  if (!contentLength) {
    return { valid: true }; // Can't validate without header
  }
  
  const size = parseInt(contentLength, 10);
  if (isNaN(size)) {
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
): Promise<{ valid: boolean; error?: string; eventType?: string; payload?: any }> {
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
  
  // Read body
  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch (error) {
    return { valid: false, error: 'Failed to read request body' };
  }
  
  // Verify signature
  const signatureCheck = verifyGitHubSignature(bodyText, signature, secret);
  if (!signatureCheck.valid) {
    return { valid: false, error: signatureCheck.error };
  }
  
  // Check for replay attack
  const replayCheck = await checkWebhookReplay(deliveryId);
  if (replayCheck.isReplay) {
    return { valid: false, error: replayCheck.error };
  }
  
  // Parse JSON
  let payload: any;
  try {
    payload = JSON.parse(bodyText);
  } catch (error) {
    return { valid: false, error: 'Invalid JSON payload' };
  }
  
  return { 
    valid: true, 
    eventType: eventType!,
    payload 
  };
}

/**
 * Generate webhook secret (for initial setup)
 */
export function generateWebhookSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Create a test signature for webhook testing
 */
export function createTestSignature(payload: string, secret: string): string {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return `sha256=${signature}`;
}