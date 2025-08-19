/**
 * GitHub Webhook Handler
 * Processes GitHub webhook events using hexagonal architecture
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateWebhook } from '@/lib/webhook-security'
import { getService } from '@/lib/core/container/di-container'
import { IGitHubService } from '@/lib/core/ports'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  console.log('[Webhook] Received GitHub webhook event')
  
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET ?? process.env.GITHUB_OAUTH_CLIENT_SECRET
    
    if (!webhookSecret) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[Webhook] GITHUB_WEBHOOK_SECRET not configured in production')
        return NextResponse.json(
          { error: 'Webhook secret not configured' }, 
          { status: 500 }
        )
      } else {
        console.warn('[Webhook] GITHUB_WEBHOOK_SECRET not configured - skipping signature verification in development')
      }
    }
    
    // Validate webhook signature and payload
    let validation
    if (webhookSecret) {
      validation = await validateWebhook(request, webhookSecret)
      
      if (!validation.valid) {
        console.error(`[Webhook] Validation failed: ${validation.error}`)
        return NextResponse.json(
          { error: validation.error }, 
          { status: 400 }
        )
      }
    } else {
      // In development, read the payload manually
      const eventType = request.headers.get('x-github-event')
      const bodyText = await request.text()
      
      try {
        const payload = JSON.parse(bodyText)
        validation = {
          valid: true,
          eventType: eventType || 'unknown',
          payload
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid JSON payload' }, 
          { status: 400 }
        )
      }
    }

    const { eventType, payload } = validation
    console.log(`[Webhook] Processing event: ${eventType}.${payload?.action || 'unknown'}`)

    // Get GitHub service from DI container
    const githubService = await getService<IGitHubService>('GitHubService')
    
    // Process the webhook event
    const result = await githubService.processWebhookEvent(eventType!, payload)
    
    if (result.processed) {
      console.log(`[Webhook] Successfully processed ${eventType} event:`, result.actions)
      return NextResponse.json({ 
        success: true, 
        actions: result.actions 
      })
    } else {
      console.warn(`[Webhook] Failed to process ${eventType} event:`, result.errors)
      return NextResponse.json({
        success: false,
        errors: result.errors
      }, { status: 422 })
    }

  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error)
    return NextResponse.json(
      { 
        error: `Failed to process webhook: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }, 
      { status: 500 }
    )
  }
}

/**
 * Health check endpoint for webhook configuration
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    webhook_url: process.env.APP_URL ? `${process.env.APP_URL}/api/webhook/github` : 'not configured'
  })
}
