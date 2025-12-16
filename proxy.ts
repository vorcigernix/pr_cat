import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiting for Edge Runtime
// This is supplementary to Vercel's platform-level rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export async function proxy(request: NextRequest) {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Skip rate limiting for health checks and status endpoints
  if (request.nextUrl.pathname === '/api/status') {
    return NextResponse.next();
  }

  // Skip rate limiting for webhooks (handled by Vercel Firewall)
  if (request.nextUrl.pathname.startsWith('/api/webhook/')) {
    // But add timestamp validation for webhook security
    const timestamp = request.headers.get('x-hub-signature-256');
    if (timestamp) {
      // Webhook requests should have recent timestamps (within 5 minutes)
      const webhookTime = request.headers.get('x-github-delivery');
      if (webhookTime) {
        const requestTime = new Date(webhookTime).getTime();
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        if (Math.abs(now - requestTime) > fiveMinutes) {
          return NextResponse.json(
            { error: 'Webhook timestamp too old' },
            { status: 401 }
          );
        }
      }
    }
    return NextResponse.next();
  }

  // Get identifier (IP address or authenticated user)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const pathname = request.nextUrl.pathname;
  const identifier = `${ip}:${pathname}`;

  // Define rate limits based on endpoint
  let limit = 100; // Default: 100 requests per minute
  let window = 60000; // 1 minute in milliseconds

  // Stricter limits for sensitive endpoints
  if (pathname.startsWith('/api/auth/')) {
    limit = 10; // Auth endpoints: 10 requests per minute
  } else if (pathname.includes('/sync')) {
    limit = 5; // Sync operations: 5 requests per minute
    window = 300000; // 5 minutes
  } else if (pathname.startsWith('/api/migrate')) {
    limit = 2; // Migration: 2 requests per minute
  }

  // Check rate limit
  const now = Date.now();
  let requestData = requestCounts.get(identifier);
  
  if (!requestData || now > requestData.resetTime) {
    requestData = { count: 1, resetTime: now + window };
  } else {
    requestData.count++;
  }

  requestCounts.set(identifier, requestData);

  // Clean old entries periodically (1% chance per request)
  if (Math.random() < 0.01) {
    for (const [key, data] of requestCounts.entries()) {
      if (now > data.resetTime) {
        requestCounts.delete(key);
      }
    }
  }

  // Check if rate limit exceeded
  const remaining = Math.max(0, limit - requestData.count);
  const resetTime = new Date(requestData.resetTime).toISOString();

  if (requestData.count > limit) {
    return NextResponse.json(
      { 
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again after ${resetTime}`
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetTime,
          'Retry-After': Math.ceil((requestData.resetTime - now) / 1000).toString(),
        }
      }
    );
  }

  // Add rate limit headers to successful responses
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', resetTime);

  return response;
}

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Exclude static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};