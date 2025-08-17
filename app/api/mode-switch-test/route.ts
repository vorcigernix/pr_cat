/**
 * Mode Switch Test API Route
 * Tests the DI container's ability to switch between demo and production modes
 */

import { NextRequest, NextResponse } from 'next/server'
import { ServiceLocator } from '@/lib/core'
import { EnvironmentConfig } from '@/lib/infrastructure/config'

export async function GET(request: NextRequest) {
  try {
    const envConfig = EnvironmentConfig.getInstance()
    const containerStatus = ServiceLocator.getContainerStatus()
    
    // Test getting a service in current mode
    const metricsService = await ServiceLocator.getMetricsService()
    const summary = await metricsService.getSummary('demo-org-1')
    
    return NextResponse.json({
      success: true,
      mode: envConfig.config.mode,
      isDemoMode: envConfig.isDemoMode(),
      environment: envConfig.getDebugInfo(),
      container: {
        initialized: containerStatus.initialized,
        registeredServices: containerStatus.registeredServices,
        instantiatedServices: containerStatus.instantiatedServices
      },
      testResult: {
        metricsServiceWorking: Boolean(summary),
        trackedRepositories: summary.trackedRepositories,
        dataSource: envConfig.isDemoMode() ? 'demo-adapters' : 'production-adapters'
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Mode switch test failed:', error)
    
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
