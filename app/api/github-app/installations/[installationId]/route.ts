/**
 * GitHub App Installation Management API
 * Manages individual GitHub App installations
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getService } from '@/lib/core/container/di-container'
import { IGitHubAppService } from '@/lib/core/ports'

export const runtime = 'nodejs'

/**
 * GET /api/github-app/installations/[installationId]
 * Get details for a specific installation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ installationId: string }> }
) {
  try {
    const { installationId } = await params
    const session = await auth()
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const installationIdNum = parseInt(installationId)
    if (isNaN(installationIdNum)) {
      return NextResponse.json({ error: 'Invalid installation ID' }, { status: 400 })
    }

    console.log(`[GitHubApp API] Fetching installation ${installationIdNum}...`)

    const githubAppService = await getService<IGitHubAppService>('GitHubAppService')
    
    // Get installation details
    const installation = await githubAppService.getInstallation(installationIdNum)
    
    // Get repositories if requested
    const includeRepos = request.nextUrl.searchParams.get('include_repositories') === 'true'
    let repositories: any[] | undefined = undefined
    
    if (includeRepos) {
      try {
        repositories = await githubAppService.getInstallationRepositories(installationIdNum)
        console.log(`[GitHubApp API] Found ${repositories.length} repositories for installation ${installationIdNum}`)
      } catch (error) {
        console.warn(`[GitHubApp API] Could not fetch repositories for installation ${installationIdNum}:`, error)
        repositories = undefined
      }
    }

    return NextResponse.json({
      installation,
      repositories,
      repositoryCount: repositories?.length
    })

  } catch (error) {
    console.error(`[GitHubApp API] Error fetching installation:`, error)
    
    if (error instanceof Error && error.message.includes('Not Found')) {
      return NextResponse.json({ error: 'Installation not found' }, { status: 404 })
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch installation',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

/**
 * POST /api/github-app/installations/[installationId]/sync
 * Sync a specific installation with database
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ installationId: string }> }
) {
  try {
    const { installationId } = await params
    const session = await auth()
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const installationIdNum = parseInt(installationId)
    if (isNaN(installationIdNum)) {
      return NextResponse.json({ error: 'Invalid installation ID' }, { status: 400 })
    }

    console.log(`[GitHubApp API] Syncing installation ${installationIdNum}...`)

    const githubAppService = await getService<IGitHubAppService>('GitHubAppService')
    
    // Sync the installation
    const syncResult = await githubAppService.syncInstallation(installationIdNum)

    console.log(`[GitHubApp API] Sync completed for installation ${installationIdNum}: org=${syncResult.organization.name}, repos=${syncResult.repositories.length}, errors=${syncResult.errors.length}`)

    return NextResponse.json({
      success: true,
      organization: {
        id: syncResult.organization.id,
        name: syncResult.organization.name,
        login: syncResult.organization.login
      },
      repositories: {
        count: syncResult.repositories.length,
        items: syncResult.repositories.map(repo => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.fullName,
          isPrivate: repo.isPrivate
        }))
      },
      errors: syncResult.errors.length > 0 ? syncResult.errors : undefined
    })

  } catch (error) {
    console.error(`[GitHubApp API] Error syncing installation:`, error)
    
    if (error instanceof Error && error.message.includes('Not Found')) {
      return NextResponse.json({ error: 'Installation not found' }, { status: 404 })
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to sync installation',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/github-app/installations/[installationId]/cache
 * Clear cached tokens for an installation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ installationId: string }> }
) {
  try {
    const { installationId } = await params
    const session = await auth()
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const installationIdNum = parseInt(installationId)
    if (isNaN(installationIdNum)) {
      return NextResponse.json({ error: 'Invalid installation ID' }, { status: 400 })
    }

    console.log(`[GitHubApp API] Clearing token cache for installation ${installationIdNum}...`)

    const githubAppService = await getService<IGitHubAppService>('GitHubAppService')
    
    // Clear the token cache
    await githubAppService.clearTokenCache(installationIdNum)

    return NextResponse.json({
      success: true,
      message: `Token cache cleared for installation ${installationIdNum}`
    })

  } catch (error) {
    console.error(`[GitHubApp API] Error clearing token cache:`, error)
    return NextResponse.json(
      { 
        error: 'Failed to clear token cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
