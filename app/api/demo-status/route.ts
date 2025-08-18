import { NextResponse } from 'next/server';
import { EnvironmentConfig } from '@/lib/core';

/**
 * Demo Status API
 * Returns information about demo mode status and missing services
 * This is a zero-cost endpoint that doesn't connect to external services
 */
export async function GET() {
  try {
    const environmentConfig = EnvironmentConfig.getInstance();
    const isDemoMode = environmentConfig.isDemoMode();
    
    // Determine missing services
    const missingServices = [];
    const hasDatabase = environmentConfig.hasFeature('database');
    const hasGitHub = environmentConfig.hasFeature('github');
    const hasGitHubAuth = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
    
    if (!hasDatabase) missingServices.push('Database (Turso)');
    if (!hasGitHub) missingServices.push('GitHub App');
    if (!hasGitHubAuth) missingServices.push('GitHub OAuth');
    
    return NextResponse.json({
      success: true,
      data: {
        isDemoMode,
        missingServices,
        canUpgrade: missingServices.length > 0,
        availableFeatures: {
          dashboard: true, // Always available with demo data
          githubAuth: hasGitHubAuth,
          githubApp: hasGitHub,
          database: hasDatabase,
          webhooks: Boolean(process.env.GITHUB_WEBHOOK_SECRET),
        },
        setupGuide: {
          nextStep: missingServices[0] || null,
          estimatedTime: getSetupTime(missingServices),
          helpUrl: 'https://github.com/vorcigernix/pr_cat#environment-setup'
        }
      }
    });
  } catch (error) {
    console.error('Demo status check failed:', error);
    
    // Return safe fallback - assume demo mode if there's any error
    return NextResponse.json({
      success: true,
      data: {
        isDemoMode: true,
        missingServices: ['Unknown'],
        canUpgrade: true,
        availableFeatures: {
          dashboard: true,
          githubAuth: false,
          githubApp: false,
          database: false,
          webhooks: false,
        },
        setupGuide: {
          nextStep: 'Check environment variables',
          estimatedTime: '5 minutes',
          helpUrl: 'https://github.com/vorcigernix/pr_cat#environment-setup'
        }
      }
    });
  }
}

function getSetupTime(missingServices: string[]): string {
  if (missingServices.length === 0) return '0 minutes';
  if (missingServices.length === 1 && missingServices[0] === 'GitHub OAuth') return '5 minutes';
  if (missingServices.length <= 2) return '10 minutes';
  return '15 minutes';
}

// This endpoint doesn't need authentication and should work in demo mode
export const dynamic = 'force-dynamic';
