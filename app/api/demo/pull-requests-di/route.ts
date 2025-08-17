/**
 * Demo API Route Using DI Container
 * Shows how to use the new dependency injection system
 */

import { NextRequest, NextResponse } from 'next/server'
import { ServiceLocator } from '@/lib/core'

export async function GET(request: NextRequest) {
  try {
    // Get services using the new DI container
    const prRepository = await ServiceLocator.getPullRequestRepository()
    
    // Use the service exactly like before, but now it's injected
    const recentPRs = await prRepository.getRecent('demo-org-1')
    
    return NextResponse.json({
      success: true,
      data: recentPRs,
      meta: {
        source: 'dependency-injection',
        container: ServiceLocator.getContainerStatus()
      }
    })
  } catch (error) {
    console.error('Failed to get pull requests via DI:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
