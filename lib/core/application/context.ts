/**
 * Application Context for DDD/Hexagonal Architecture
 * Carries authenticated user and organization context to domain services
 */

import { User, Organization } from '../domain/entities'

export interface ApplicationContext {
  readonly user: User
  readonly organizationId: string
  readonly primaryOrganization: Organization
  readonly organizations: Organization[]
  readonly permissions: UserPermissions
  readonly requestId?: string
}

export interface UserPermissions {
  readonly canRead: boolean
  readonly canWrite: boolean
  readonly canAdmin: boolean
  readonly role: 'admin' | 'member' | 'viewer'
}

export interface AnonymousContext {
  readonly isAnonymous: true
  readonly requestId?: string
}

export type RequestContext = ApplicationContext | AnonymousContext

export function isAuthenticated(context: RequestContext): context is ApplicationContext {
  return 'user' in context && !('isAnonymous' in context)
}

export function requireAuthentication(context: RequestContext): ApplicationContext {
  if (!isAuthenticated(context)) {
    throw new Error('Authentication required')
  }
  return context
}

export function createApplicationContext(
  user: User,
  organizations: Organization[],
  primaryOrganization: Organization,
  permissions: UserPermissions,
  requestId?: string
): ApplicationContext {
  return {
    user,
    organizationId: primaryOrganization.id,
    primaryOrganization,
    organizations,
    permissions,
    requestId
  }
}

export function createAnonymousContext(requestId?: string): AnonymousContext {
  return {
    isAnonymous: true,
    requestId
  }
}
