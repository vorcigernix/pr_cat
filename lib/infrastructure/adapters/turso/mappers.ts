/**
 * Type Mappers for Turso Database
 * Transforms database entities to domain entities and vice versa
 */

import * as DbTypes from '@/lib/types'
import {
  PullRequest,
  PullRequestSummary,
  Organization,
  User,
  Repository,
  Category
} from '../../../core/domain/entities'

/**
 * Maps database PullRequest to domain PullRequest
 */
export function mapDbPullRequestToDomain(dbPR: DbTypes.PullRequest): PullRequest {
  return {
    id: dbPR.id.toString(),
    number: dbPR.number,
    title: dbPR.title,
    description: dbPR.description,
    state: dbPR.state,
    author: {
      id: dbPR.author_id || 'unknown',
      login: 'unknown', // Would need to join with users table
      name: null,
      avatarUrl: ''
    },
    repository: {
      id: dbPR.repository_id.toString(),
      name: 'unknown', // Would need to join with repositories table
      fullName: 'unknown'
    },
    category: dbPR.category_id ? {
      id: dbPR.category_id.toString(),
      name: 'unknown' // Would need to join with categories table
    } : undefined,
    createdAt: new Date(dbPR.created_at),
    updatedAt: new Date(dbPR.updated_at),
    mergedAt: dbPR.merged_at ? new Date(dbPR.merged_at) : null,
    closedAt: dbPR.closed_at ? new Date(dbPR.closed_at) : null,
    isDraft: dbPR.draft,
    additions: dbPR.additions || 0,
    deletions: dbPR.deletions || 0,
    changedFiles: dbPR.changed_files || 0,
    reviewers: [], // Would need to join with reviews table
    labels: [], // Would need to join with labels table if implemented
    htmlUrl: `https://github.com/unknown/pull/${dbPR.number}` // Would need repository info
  }
}

/**
 * Maps database PullRequest to domain PullRequestSummary (lighter version)
 */
export function mapDbPullRequestToSummary(
  dbPR: DbTypes.PullRequest,
  repositoryName?: string,
  categoryName?: string,
  authorLogin?: string,
  authorAvatar?: string
): PullRequestSummary {
  return {
    id: dbPR.id.toString(),
    number: dbPR.number,
    title: dbPR.title,
    state: dbPR.state,
    author: {
      login: authorLogin || 'unknown',
      avatarUrl: authorAvatar || ''
    },
    repository: {
      name: repositoryName || 'unknown'
    },
    category: categoryName ? {
      name: categoryName
    } : undefined,
    createdAt: new Date(dbPR.created_at),
    mergedAt: dbPR.merged_at ? new Date(dbPR.merged_at) : null,
    additions: dbPR.additions || 0,
    deletions: dbPR.deletions || 0,
    reviewCount: 0 // Would need to count reviews
  }
}

/**
 * Maps database Organization to domain Organization
 */
export function mapDbOrganizationToDomain(dbOrg: DbTypes.Organization): Organization {
  return {
    id: dbOrg.id.toString(),
    login: dbOrg.name, // Database uses 'name' for the login
    name: dbOrg.name,
    description: null, // Not in current DB schema
    avatarUrl: dbOrg.avatar_url || '',
    type: 'Organization',
    htmlUrl: `https://github.com/${dbOrg.name}`,
    isInstalled: Boolean(dbOrg.installation_id),
    installationId: dbOrg.installation_id?.toString() || null,
    createdAt: new Date(dbOrg.created_at),
    updatedAt: new Date(dbOrg.updated_at)
  }
}

/**
 * Maps database User to domain User
 */
export function mapDbUserToDomain(dbUser: DbTypes.User): User {
  return {
    id: dbUser.id,
    login: dbUser.name || 'unknown',
    name: dbUser.name,
    email: dbUser.email,
    avatarUrl: dbUser.image || '',
    htmlUrl: `https://github.com/${dbUser.name || 'unknown'}`,
    type: 'User',
    isNewUser: false, // Would need to determine based on created_at
    hasGithubApp: true, // Assume true if they're in the database
    createdAt: new Date(dbUser.created_at),
    updatedAt: new Date(dbUser.updated_at)
  }
}

/**
 * Maps database Repository to domain Repository
 */
export function mapDbRepositoryToDomain(dbRepo: DbTypes.Repository): Repository {
  return {
    id: dbRepo.id.toString(),
    name: dbRepo.name,
    fullName: dbRepo.full_name,
    description: dbRepo.description,
    htmlUrl: `https://github.com/${dbRepo.full_name}`,
    defaultBranch: 'main', // Default assumption
    isPrivate: dbRepo.private,
    isTracked: dbRepo.is_tracked,
    isArchived: false, // Not in current schema
    language: null, // Not in current schema
    size: 0, // Not in current schema
    stargazersCount: 0, // Not in current schema
    forksCount: 0, // Not in current schema
    openIssuesCount: 0, // Not in current schema
    organizationId: dbRepo.organization_id?.toString() || '',
    createdAt: new Date(dbRepo.created_at),
    updatedAt: new Date(dbRepo.updated_at),
    pushedAt: new Date(dbRepo.updated_at) // Use updated_at as fallback
  }
}

/**
 * Maps database Category to domain Category value object
 */
export function mapDbCategoryToDomain(dbCategory: DbTypes.Category): Category {
  return Category.create(
    dbCategory.id.toString(),
    dbCategory.name,
    dbCategory.description,
    dbCategory.color || '#6b7280'
  )
}

/**
 * Utility function to calculate cycle time in hours
 */
export function calculateCycleTimeHours(createdAt: string, mergedAt: string | null): number {
  if (!mergedAt) return 0
  
  const created = new Date(createdAt)
  const merged = new Date(mergedAt)
  return (merged.getTime() - created.getTime()) / (1000 * 60 * 60)
}

/**
 * Helper to transform database query results with joins
 */
export interface PullRequestWithDetails extends DbTypes.PullRequest {
  repository_name?: string
  category_name?: string
  category_color?: string
  author_login?: string
  author_avatar?: string
}

export function mapPullRequestWithDetailsToDomain(pr: PullRequestWithDetails): PullRequest {
  const basePR = mapDbPullRequestToDomain(pr)
  return {
    ...basePR,
    author: {
      id: pr.author_id || 'unknown',
      login: pr.author_login || 'unknown',
      name: pr.author_login || null,
      avatarUrl: pr.author_avatar || ''
    },
    repository: {
      id: pr.repository_id.toString(),
      name: pr.repository_name || 'unknown',
      fullName: pr.repository_name || 'unknown'
    },
    category: pr.category_id ? {
      id: pr.category_id.toString(),
      name: pr.category_name || 'Uncategorized'
    } : undefined,
    htmlUrl: pr.repository_name ? `https://github.com/${pr.repository_name}/pull/${pr.number}` : `https://github.com/unknown/pull/${pr.number}`
  }
}

export function mapPullRequestWithDetailsToSummary(pr: PullRequestWithDetails): PullRequestSummary {
  return mapDbPullRequestToSummary(
    pr,
    pr.repository_name,
    pr.category_name,
    pr.author_login,
    pr.author_avatar
  )
}
