/**
 * GitHub App Installations API
 * Lists and manages GitHub App installations
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getService } from '@/lib/core/container/di-container'
import { IGitHubAppService } from '@/lib/core/ports'


export const runtime = 'nodejs'

/**
 * GET /api/github-app/installations
 * List all GitHub App installations
 */
export async function GET() {
  try {


    const session = await auth()
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[GitHubApp API] Fetching installations...')

    const githubAppService = await getService<IGitHubAppService>('GitHubAppService')
    
    // Validate GitHub App configuration first
    const config = await githubAppService.validateConfiguration()
    if (!config.isValid) {
      console.warn('[GitHubApp API] GitHub App not properly configured:', config.errors)
      return NextResponse.json({
        installations: [],
        configured: false,
        errors: config.errors
      })
    }

    // Get all installations
    const installations = await githubAppService.listInstallations()
    
    // Filter to only organizations (if needed)
    const organizationInstallations = installations.filter(
      installation => installation.account.type === 'Organization'
    )

    console.log(`[GitHubApp API] Found ${organizationInstallations.length} organization installations`)

    return NextResponse.json({
      installations: organizationInstallations,
      configured: true,
      total: organizationInstallations.length
    })

  } catch (error) {
    console.error('[GitHubApp API] Error fetching installations:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch installations',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

/**
 * POST /api/github-app/installations
 * Sync all installations with database
 */
export async function POST() {
  try {


    const session = await auth()
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[GitHubApp API] Starting installation sync...')

    const githubAppService = await getService<IGitHubAppService>('GitHubAppService')
    
    // Validate configuration
    const config = await githubAppService.validateConfiguration()
    if (!config.isValid) {
      return NextResponse.json({
        error: 'GitHub App not properly configured',
        details: config.errors
      }, { status: 400 })
    }

    // Get all installations
    const installations = await githubAppService.listInstallations()
    const organizationInstallations = installations.filter(
      installation => installation.account.type === 'Organization'
    )

    // Sync each installation
    const results = []
    const errors = []

    for (const installation of organizationInstallations) {
      try {
        console.log(`[GitHubApp API] Syncing installation ${installation.id} for org ${installation.account.login}`)
        
        const syncResult = await githubAppService.syncInstallation(installation.id)
        results.push({
          installationId: installation.id,
          organization: syncResult.organization.name,
          repositoriesCount: syncResult.repositories.length,
          errors: syncResult.errors
        })
        
        if (syncResult.errors.length > 0) {
          errors.push(...syncResult.errors)
        }
      } catch (error) {
        const errorMsg = `Failed to sync installation ${installation.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(`[GitHubApp API] ${errorMsg}`)
      }
    }

    console.log(`[GitHubApp API] Sync completed. Processed ${results.length} installations, ${errors.length} errors`)

    return NextResponse.json({
      success: true,
      synced: results,
      totalInstallations: organizationInstallations.length,
      totalErrors: errors.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('[GitHubApp API] Error syncing installations:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync installations',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
