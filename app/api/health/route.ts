import { NextResponse } from 'next/server';
import { checkDbHealth, getConnectionStatus } from '@/lib/db';
import { auth } from '@/auth';

export async function GET() {
  try {
    // Check database connectivity
    const dbStatus = await checkDbHealth();
    const connectionStatus = getConnectionStatus();
    
    // Get basic system info (no sensitive data)
    const systemInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      // Don't expose actual env vars, just check if they exist
      envVarsConfigured: {
        turso: !!process.env.TURSO_URL && !!process.env.TURSO_TOKEN,
        github: !!process.env.GITHUB_OAUTH_CLIENT_ID && !!process.env.GITHUB_OAUTH_CLIENT_SECRET,
        nextauth: !!process.env.NEXTAUTH_SECRET,
      }
    };

    // Check auth system (basic check, no sensitive data)
    let authStatus = 'unknown';
    try {
      const session = await auth();
      authStatus = session ? 'authenticated' : 'not_authenticated';
    } catch (error) {
      authStatus = 'error';
    }

    const status = {
      status: dbStatus && connectionStatus.isConnected ? 'healthy' : 'unhealthy',
      database: {
        connected: connectionStatus.isConnected,
        hasClient: connectionStatus.hasClient,
        healthy: dbStatus
      },
      auth: {
        status: authStatus
      },
      system: systemInfo
    };

    return NextResponse.json(status, {
      status: status.status === 'healthy' ? 200 : 503
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}