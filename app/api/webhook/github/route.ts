/**
 * GitHub Webhook Handler
 * Processes GitHub webhook events using hexagonal architecture
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateWebhook, releaseWebhookDelivery } from '@/lib/webhook-security'
import { getService } from '@/lib/core/container/di-container'
import { IGitHubService } from '@/lib/core/ports'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let reservedDelivery: string | undefined
  let processed = false
  try {
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET ?? process.env.GITHUB_OAUTH_CLIENT_SECRET
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }
    const validation = await validateWebhook(request, webhookSecret)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    reservedDelivery = validation.deliveryId

    const { eventType, payload } = validation
    console.log(`[Webhook] Processing event: ${eventType}.${payload?.action || 'unknown'}`)

    // Get GitHub service from DI container
    const githubService = await getService<IGitHubService>('GitHubService')
    
    // Process the webhook event
    const result = await githubService.processWebhookEvent(eventType!, payload)
    
    processed = result.processed
    if (processed) {
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
  } finally {
    if (reservedDelivery && !processed) releaseWebhookDelivery(reservedDelivery)
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
