/**
 * User Domain Entity
 * Represents a GitHub user
 */

export interface User {
  id: string
  login: string
  name: string | null
  email: string | null
  avatarUrl: string
  htmlUrl: string
  type: 'User' | 'Bot'
  isNewUser: boolean
  hasGithubApp: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UserSession {
  user: User
  organizations: Organization[]
  primaryOrganization: Organization
  accessToken?: string
  expires: Date
}

export interface UserMetrics {
  userId: string
  organizationId: string
  prsCreated: number
  prsReviewed: number
  averageCycleTime: number
  averagePRSize: number
  reviewThoroughness: number // ratio of reviews given vs PRs created
  contributionScore: number
  period: {
    start: Date
    end: Date
  }
}

// Import Organization type
import type { Organization } from './organization'
