/**
 * Demo Fallback Utilities
 * Provides fallback mechanisms for API routes when external services aren't available
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from './demo-mode';

export type DemoFallbackConfig = {
  demoDataUrl?: string;
  fallbackData?: any;
  requiresAuth?: boolean;
  requiresDatabase?: boolean;
  requiresGitHubApp?: boolean;
};

/**
 * Wraps an API route handler with demo mode fallback
 */
export function withDemoFallback(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: DemoFallbackConfig = {}
) {
  return async function (request: NextRequest): Promise<NextResponse> {
    // Check if we should use demo mode for this endpoint
    const shouldUseDemoMode = isDemoMode();
    const missingRequiredService = 
      (config.requiresDatabase && (!process.env.TURSO_URL || !process.env.TURSO_TOKEN)) ||
      (config.requiresGitHubApp && (!process.env.GITHUB_APP_ID || !process.env.GITHUB_APP_PRIVATE_KEY)) ||
      (config.requiresAuth && (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET));

    if (shouldUseDemoMode || missingRequiredService) {
      return handleDemoFallback(request, config);
    }

    try {
      // Try to run the real handler
      return await handler(request);
    } catch (error) {
      console.error('API route error, falling back to demo mode:', error);
      return handleDemoFallback(request, config);
    }
  };
}

async function handleDemoFallback(
  request: NextRequest,
  config: DemoFallbackConfig
): Promise<NextResponse> {
  try {
    // If a demo data URL is provided, try to fetch from it
    if (config.demoDataUrl) {
      const demoResponse = await fetch(`${request.nextUrl.origin}${config.demoDataUrl}`, {
        method: request.method,
        headers: request.headers,
      });
      
      if (demoResponse.ok) {
        const data = await demoResponse.json();
        return NextResponse.json({
          ...data,
          isDemoData: true,
          message: 'This is demo data. Configure your environment for real data.'
        });
      }
    }

    // Fall back to provided fallback data
    if (config.fallbackData) {
      return NextResponse.json({
        success: true,
        data: config.fallbackData,
        isDemoData: true,
        message: 'This is demo data. Configure your environment for real data.'
      });
    }

    // Default empty response
    return NextResponse.json({
      success: true,
      data: null,
      isDemoData: true,
      message: 'Demo mode active. Configure your environment to see real data.',
      setupRequired: true
    });

  } catch (error) {
    console.error('Demo fallback failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Service unavailable in demo mode',
      isDemoData: true,
      message: 'Please configure your environment to access this feature.'
    }, { status: 503 });
  }
}

/**
 * Check if a specific service is available
 */
export function isServiceAvailable(service: 'database' | 'github-app' | 'github-oauth'): boolean {
  switch (service) {
    case 'database':
      return Boolean(process.env.TURSO_URL && process.env.TURSO_TOKEN);
    case 'github-app':
      return Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY);
    case 'github-oauth':
      return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
    default:
      return false;
  }
}

/**
 * Create a demo-safe response that includes helpful information about missing services
 */
export function createDemoResponse(data: any, missingServices: string[] = []) {
  return NextResponse.json({
    success: true,
    data,
    isDemoData: true,
    message: missingServices.length > 0 
      ? `Demo mode: Missing ${missingServices.join(', ')}. Configure these services for real data.`
      : 'This is demo data. Configure your environment for real data.',
    missingServices,
    setupHelp: '/dashboard/settings'
  });
}

/**
 * Utility to safely run database queries with demo fallback
 */
export async function queryWithFallback<T>(
  queryFn: () => Promise<T>,
  fallbackData: T
): Promise<{ data: T; isDemoData: boolean }> {
  if (!isServiceAvailable('database')) {
    return { data: fallbackData, isDemoData: true };
  }

  try {
    const data = await queryFn();
    return { data, isDemoData: false };
  } catch (error) {
    console.error('Database query failed, using fallback:', error);
    return { data: fallbackData, isDemoData: true };
  }
}
