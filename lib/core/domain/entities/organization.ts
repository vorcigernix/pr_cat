/**
 * Organization Domain Entity
 * Represents a GitHub organization or user account
 */

export interface Organization {
  id: string
  login: string
  name: string | null
  description: string | null
  avatarUrl: string
  type: 'Organization' | 'User'
  htmlUrl: string
  isInstalled: boolean
  installationId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface OrganizationMember {
  id: string
  login: string
  name: string | null
  email: string | null
  avatarUrl: string
  role: 'admin' | 'member'
  joinedAt: Date
}

export interface OrganizationSettings {
  organizationId: string
  aiCategorization: boolean
  webhookEnabled: boolean
  syncInterval: number // in minutes
  categories: Array<{
    id: string
    name: string
    description: string | null
    color: string
  }>
}

export interface OrganizationMetrics {
  organizationId: string
  totalRepositories: number
  trackedRepositories: number
  totalContributors: number
  totalPullRequests: number
  averageCycleTime: number
  averagePRSize: number
  categorizationRate: number
  healthScore: number
  period: {
    start: Date
    end: Date
  }
}
