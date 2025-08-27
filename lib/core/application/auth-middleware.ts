/**
 * Authentication Middleware for DDD/Hexagonal Architecture
 * Handles authentication at the application boundary
 */

import { NextRequest, NextResponse } from 'next/server'
import { ServiceLocator } from '../container'
import { 
  ApplicationContext, 
  RequestContext,
  AnonymousContext,
  createApplicationContext,
  createAnonymousContext,
  UserPermissions
} from './context'


export type AuthenticatedHandler<TRequest = NextRequest, TResponse = NextResponse> = 
  (context: ApplicationContext, request: TRequest) => Promise<TResponse>

export type OptionalAuthHandler<TRequest = NextRequest, TResponse = NextResponse> = 
  (context: RequestContext, request: TRequest) => Promise<TResponse>

/**
 * Middleware that requires authentication and passes ApplicationContext to handler
 */
export function withAuth<TRequest = NextRequest, TResponse = NextResponse>(
  handler: AuthenticatedHandler<TRequest, TResponse>
): (request: TRequest) => Promise<TResponse | NextResponse> {
  return async (request: TRequest) => {
    try {
      const context = await createAuthenticatedContext(request)
      
      if (!context) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      return await handler(context, request)
    } catch (error) {
      console.error('Authentication middleware error:', error)
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
  }
}

/**
 * Middleware that allows both authenticated and anonymous access
 */
export function withOptionalAuth<TRequest = NextRequest, TResponse = NextResponse>(
  handler: OptionalAuthHandler<TRequest, TResponse>
): (request: TRequest) => Promise<TResponse> {
  return async (request: TRequest) => {
    try {
      const context = await createRequestContext(request)
      return await handler(context, request)
    } catch (error) {
      console.error('Optional auth middleware error:', error)
      const anonymousContext = createAnonymousContext(generateRequestId())
      return await handler(anonymousContext, request)
    }
  }
}

/**
 * Create authenticated context or return null if not authenticated
 */
async function createAuthenticatedContext(request: unknown): Promise<ApplicationContext | null> {
  try {
    const authService = await ServiceLocator.getAuthService()
    const session = await authService.getSession()
    
    if (!session?.user || !session.organizations?.length) {
      return null
    }

    const primaryOrganization = session.primaryOrganization || session.organizations[0]
    
    // Get user permissions for the primary organization
    const permissions: UserPermissions = await authService.getUserPermissions(
      session.user.id,
      primaryOrganization.id
    )

    return createApplicationContext(
      session.user,
      session.organizations,
      primaryOrganization,
      permissions,
      generateRequestId()
    )
  } catch (error) {
    console.error('Error creating authenticated context:', error)
    return null
  }
}

/**
 * Create request context (authenticated or anonymous)
 */
async function createRequestContext(request: unknown): Promise<RequestContext> {
  const authenticatedContext = await createAuthenticatedContext(request)
  
  if (authenticatedContext) {
    return authenticatedContext
  }

  return createAnonymousContext(generateRequestId())
}

/**
 * Generate unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Extract organization ID from request context with fallback
 */
export function getOrganizationId(context: RequestContext, fallback = 'demo-org-1'): string {
  if ('user' in context) {
    return context.organizationId
  }
  return fallback
}

/**
 * Type guard to ensure context has required permissions
 */
export function requirePermissions(
  context: RequestContext, 
  requiredPermissions: Partial<UserPermissions>
): context is ApplicationContext {
  if (!('user' in context)) {
    throw new Error('Authentication required')
  }

  const { permissions } = context
  
  if (requiredPermissions.canRead && !permissions.canRead) {
    throw new Error('Read permission required')
  }
  
  if (requiredPermissions.canWrite && !permissions.canWrite) {
    throw new Error('Write permission required')
  }
  
  if (requiredPermissions.canAdmin && !permissions.canAdmin) {
    throw new Error('Admin permission required')
  }

  return true
}
