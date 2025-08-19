/**
 * GitHub App Status API
 * Provides configuration and status information for GitHub App
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getService } from '@/lib/core/container/di-container'
import { IGitHubAppService } from '@/lib/core/ports'

export const runtime = 'nodejs'

/**
 * GET /api/github-app/status
 * Get GitHub App configuration and status
 */
export async function GET() {
  try {
    const session = await auth()
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[GitHubApp API] Checking GitHub App status...')

    const githubAppService = await getService<IGitHubAppService>('GitHubAppService')
    
    // Validate configuration
    const config = await githubAppService.validateConfiguration()
    
    let installationCount = 0
    let organizationCount = 0
    let lastError = null

    // If configured, get installation info
    if (config.isValid) {
      try {
        const installations = await githubAppService.listInstallations()
        installationCount = installations.length
        organizationCount = installations.filter(
          inst => inst.account.type === 'Organization'
        ).length
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to fetch installations'
        console.warn('[GitHubApp API] Error fetching installations for status:', error)
      }
    }

    const status = {
      configured: config.isValid,
      appId: config.appId,
      hasPrivateKey: config.hasPrivateKey,
      errors: config.errors.length > 0 ? config.errors : undefined,
      installations: {
        total: installationCount,
        organizations: organizationCount
      },
      lastError: lastError || undefined,
      environment: {
        hasAppId: !!process.env.GITHUB_APP_ID,
        hasPrivateKey: !!process.env.GITHUB_APP_PRIVATE_KEY,
        hasWebhookSecret: !!process.env.GITHUB_WEBHOOK_SECRET,
        hasClientId: !!process.env.GITHUB_OAUTH_CLIENT_ID,
        hasClientSecret: !!process.env.GITHUB_OAUTH_CLIENT_SECRET
      },
      requiredEnvVars: [
        'GITHUB_APP_ID',
        'GITHUB_APP_PRIVATE_KEY'
      ],
      optionalEnvVars: [
        'GITHUB_WEBHOOK_SECRET',
        'GITHUB_OAUTH_CLIENT_ID', 
        'GITHUB_OAUTH_CLIENT_SECRET'
      ]
    }

    console.log(`[GitHubApp API] Status check complete: configured=${config.isValid}, installations=${installationCount}`)

    return NextResponse.json(status)

  } catch (error) {
    console.error('[GitHubApp API] Error checking GitHub App status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check GitHub App status',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
