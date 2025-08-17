/**
 * Turso Repository Adapter
 * Implements IRepository using real database operations
 */

import { IRepository } from '../../../core/ports'
import { Repository, RepositoryMetrics } from '../../../core/domain/entities'
import { Pagination, PaginatedResult, TimeRange } from '../../../core/domain/value-objects'
import { query, execute } from '@/lib/db'
import * as RepositoryRepository from '@/lib/repositories/repository-repository'
import { mapDbRepositoryToDomain } from './mappers'
import * as DbTypes from '@/lib/types'

export class TursoRepository implements IRepository {
  
  async getById(repositoryId: string): Promise<Repository | null> {
    try {
      const dbRepo = await RepositoryRepository.findRepositoryById(parseInt(repositoryId))
      return dbRepo ? mapDbRepositoryToDomain(dbRepo) : null
    } catch (error) {
      console.error('Error getting repository by ID:', error)
      return null
    }
  }

  async getByOrganization(
    organizationId: string,
    filters?: {
      isTracked?: boolean
      isArchived?: boolean
      language?: string
    }
  ): Promise<Repository[]> {
    try {
      const orgId = parseInt(organizationId)
      let whereClause = 'WHERE organization_id = ?'
      const params: any[] = [orgId]

      if (filters?.isTracked !== undefined) {
        whereClause += ' AND is_tracked = ?'
        params.push(filters.isTracked ? 1 : 0)
      }

      // Note: isArchived and language filters would need additional DB columns

      const repositories = await query<DbTypes.Repository>(`
        SELECT * FROM repositories
        ${whereClause}
        ORDER BY name ASC
      `, params)

      return repositories.map(mapDbRepositoryToDomain)
    } catch (error) {
      console.error('Error getting organization repositories:', error)
      return []
    }
  }

  async getByFullName(fullName: string): Promise<Repository | null> {
    try {
      const repositories = await query<DbTypes.Repository>(`
        SELECT * FROM repositories WHERE full_name = ?
      `, [fullName])
      
      return repositories.length > 0 ? mapDbRepositoryToDomain(repositories[0]) : null
    } catch (error) {
      console.error('Error getting repository by full name:', error)
      return null
    }
  }

  async update(
    repositoryId: string,
    updates: Partial<Repository>
  ): Promise<Repository> {
    try {
      const repoId = parseInt(repositoryId)
      
      // Map domain updates to database updates
      const dbUpdates: Partial<DbTypes.Repository> = {}
      
      if (updates.name) dbUpdates.name = updates.name
      if (updates.description !== undefined) dbUpdates.description = updates.description
      if (updates.isPrivate !== undefined) dbUpdates.private = updates.isPrivate
      if (updates.isTracked !== undefined) dbUpdates.is_tracked = updates.isTracked

      const updatedRepo = await RepositoryRepository.updateRepository(repoId, dbUpdates)
      
      if (!updatedRepo) {
        throw new Error(`Repository ${repositoryId} not found`)
      }

      return mapDbRepositoryToDomain(updatedRepo)
    } catch (error) {
      console.error('Error updating repository:', error)
      throw new Error('Failed to update repository')
    }
  }

  async setTrackingStatus(
    repositoryId: string,
    isTracked: boolean
  ): Promise<void> {
    try {
      await this.update(repositoryId, { isTracked })
    } catch (error) {
      console.error('Error setting tracking status:', error)
      throw new Error('Failed to set tracking status')
    }
  }

  async getMetrics(repositoryId: string): Promise<RepositoryMetrics> {
    try {
      const repoId = parseInt(repositoryId)
      
      // Get repository info
      const repository = await this.getById(repositoryId)
      if (!repository) {
        throw new Error(`Repository ${repositoryId} not found`)
      }

      // Get repository metrics
      const metricsResult = await query<{
        total_prs: number
        open_prs: number
        avg_cycle_time: number
        avg_pr_size: number
        categorized_prs: number
        contributor_count: number
      }>(`
        SELECT 
          COUNT(pr.id) as total_prs,
          SUM(CASE WHEN pr.state = 'open' THEN 1 ELSE 0 END) as open_prs,
          AVG(CASE 
            WHEN pr.state = 'merged' AND pr.merged_at IS NOT NULL
            THEN CAST((julianday(pr.merged_at) - julianday(pr.created_at)) * 24 AS REAL)
            ELSE NULL
          END) as avg_cycle_time,
          AVG(COALESCE(pr.additions, 0) + COALESCE(pr.deletions, 0)) as avg_pr_size,
          SUM(CASE WHEN pr.category_id IS NOT NULL THEN 1 ELSE 0 END) as categorized_prs,
          COUNT(DISTINCT pr.author_id) as contributor_count
        FROM pull_requests pr
        WHERE pr.repository_id = ?
        AND pr.created_at >= datetime('now', '-90 days')
      `, [repoId])

      const metrics = metricsResult[0] || {
        total_prs: 0,
        open_prs: 0,
        avg_cycle_time: 0,
        avg_pr_size: 0,
        categorized_prs: 0,
        contributor_count: 0
      }

      const categorizationRate = metrics.total_prs > 0 
        ? (metrics.categorized_prs / metrics.total_prs) * 100 
        : 0

      const activityScore = Math.min(100, metrics.total_prs * 2)
      
      // Get review coverage for this repository
      const reviewCoverageResult = await query<{
        total_prs: number
        reviewed_prs: number
      }>(`
        SELECT 
          COUNT(DISTINCT pr.id) as total_prs,
          COUNT(DISTINCT CASE 
            WHEN EXISTS(SELECT 1 FROM pr_reviews rev WHERE rev.pull_request_id = pr.id) 
            THEN pr.id 
          END) as reviewed_prs
        FROM pull_requests pr
        WHERE pr.repository_id = ?
        AND pr.created_at >= datetime('now', '-90 days')
      `, [repoId])

      const reviewCoverage = reviewCoverageResult[0]?.total_prs > 0
        ? (reviewCoverageResult[0].reviewed_prs / reviewCoverageResult[0].total_prs) * 100
        : 0

      // Calculate health score
      const healthFactors = [
        Math.min(100, reviewCoverage),
        Math.min(100, categorizationRate),
        Math.max(0, 100 - (metrics.avg_cycle_time || 0)),
        Math.min(100, activityScore)
      ]
      const healthScore = healthFactors.reduce((sum, factor) => sum + factor, 0) / healthFactors.length

      return {
        repositoryId,
        name: repository.name,
        fullName: repository.fullName,
        isTracked: repository.isTracked,
        hasData: metrics.total_prs > 0,
        metrics: {
          totalPRs: metrics.total_prs,
          openPRs: metrics.open_prs,
          avgCycleTime: Math.round((metrics.avg_cycle_time || 0) * 10) / 10,
          avgPRSize: Math.round(metrics.avg_pr_size || 0),
          categorizationRate: Math.round(categorizationRate * 10) / 10,
          activityScore: Math.round(activityScore),
          contributorCount: metrics.contributor_count,
          reviewCoverage: Math.round(reviewCoverage * 10) / 10,
          healthScore: Math.round(healthScore * 10) / 10
        },
        trends: {
          prVelocityTrend: 'stable' as const, // Would need historical data for real trends
          cycleTimeTrend: 'stable' as const,
          qualityTrend: 'stable' as const
        }
      }
    } catch (error) {
      console.error('Error getting repository metrics:', error)
      throw new Error('Failed to get repository metrics')
    }
  }

  async getOrganizationRepositories(organizationId: string): Promise<Repository[]> {
    return this.getByOrganization(organizationId)
  }

  async search(
    organizationId: string,
    searchQuery: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<Repository>> {
    const page = pagination || Pagination.create(1, 10)
    const offset = page.offset
    const limit = page.limit
    const orgId = parseInt(organizationId)
    const searchTerm = `%${searchQuery}%`

    try {
      const repositories = await query<DbTypes.Repository>(`
        SELECT * FROM repositories
        WHERE organization_id = ?
        AND (
          name LIKE ? OR
          full_name LIKE ? OR
          description LIKE ?
        )
        ORDER BY name ASC
        LIMIT ? OFFSET ?
      `, [orgId, searchTerm, searchTerm, searchTerm, limit, offset])

      const countResult = await query<{ total: number }>(`
        SELECT COUNT(*) as total
        FROM repositories
        WHERE organization_id = ?
        AND (
          name LIKE ? OR
          full_name LIKE ? OR
          description LIKE ?
        )
      `, [orgId, searchTerm, searchTerm, searchTerm])

      const total = countResult[0]?.total || 0
      const data = repositories.map(mapDbRepositoryToDomain)

      return {
        data,
        pagination: {
          page: page.page,
          limit: page.limit,
          total,
          totalPages: Math.ceil(total / page.limit),
          hasNext: offset + limit < total,
          hasPrev: page.page > 1
        }
      }
    } catch (error) {
      console.error('Error searching repositories:', error)
      return {
        data: [],
        pagination: {
          page: page.page,
          limit: page.limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      }
    }
  }

  async syncFromGitHub(repositoryId: string): Promise<Repository> {
    try {
      const repository = await this.getById(repositoryId)
      if (!repository) {
        throw new Error(`Repository ${repositoryId} not found`)
      }

      // In a full implementation, this would sync from GitHub API
      // For now, just update the timestamp
      return this.update(repositoryId, {
        updatedAt: new Date(),
        pushedAt: new Date()
      })
    } catch (error) {
      console.error('Error syncing repository from GitHub:', error)
      throw new Error('Failed to sync repository')
    }
  }

  async bulkUpdate(
    updates: Array<{
      id: string
      updates: Partial<Repository>
    }>
  ): Promise<Repository[]> {
    const updatedRepositories = []
    
    for (const update of updates) {
      try {
        const updatedRepo = await this.update(update.id, update.updates)
        updatedRepositories.push(updatedRepo)
      } catch (error) {
        console.error(`Failed to update repository ${update.id}:`, error)
      }
    }
    
    return updatedRepositories
  }

  async getActivitySummary(
    repositoryId: string,
    timeRange?: TimeRange
  ): Promise<{
    pullRequests: number
    commits: number
    contributors: number
    lastActivity: Date
  }> {
    try {
      const repoId = parseInt(repositoryId)
      const range = timeRange || TimeRange.fromPreset('30d')

      const activityResult = await query<{
        pull_requests: number
        contributors: number
        last_activity: string
      }>(`
        SELECT 
          COUNT(pr.id) as pull_requests,
          COUNT(DISTINCT pr.author_id) as contributors,
          MAX(pr.updated_at) as last_activity
        FROM pull_requests pr
        WHERE pr.repository_id = ?
        AND pr.created_at >= ?
        AND pr.created_at <= ?
      `, [repoId, range.start.toISOString(), range.end.toISOString()])

      const activity = activityResult[0] || {
        pull_requests: 0,
        contributors: 0,
        last_activity: new Date().toISOString()
      }

      return {
        pullRequests: activity.pull_requests,
        commits: activity.pull_requests * 3, // Estimate 3 commits per PR
        contributors: activity.contributors,
        lastActivity: new Date(activity.last_activity)
      }
    } catch (error) {
      console.error('Error getting repository activity summary:', error)
      throw new Error('Failed to get activity summary')
    }
  }
}
