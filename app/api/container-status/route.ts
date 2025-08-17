/**
 * DI Container Status API Route
 * Shows the current state of the dependency injection container
 */

import { NextRequest, NextResponse } from 'next/server'
import { DIContainer } from '@/lib/core'

export async function GET(request: NextRequest) {
  try {
    const container = DIContainer.getInstance()
    const status = container.getStatus()
    
    return NextResponse.json({
      success: true,
      ...status,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to get container status:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
