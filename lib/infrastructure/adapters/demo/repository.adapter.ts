/**
 * Demo Repository Adapter
 * Implements IRepository using static demo data
 */

import { IRepository } from '../../../core/ports'
import { Repository, RepositoryMetrics } from '../../../core/domain/entities'
import { Pagination, PaginatedResult, TimeRange } from '../../../core/domain/value-objects'
import { DEMO_REPOSITORIES } from './data/demo-data'

export class DemoRepository implements IRepository {
  
  async getById(repositoryId: string): Promise<Repository | null> {
    return DEMO_REPOSITORIES.find(repo => repo.id === repositoryId) || null
  }

  async getByOrganization(
    organizationId: string,
    filters?: {
      isTracked?: boolean
      isArchived?: boolean
      language?: string
    }
  ): Promise<Repository[]> {
    let repositories = DEMO_REPOSITORIES.filter(repo => repo.organizationId === organizationId)

    if (filters?.isTracked !== undefined) {
      repositories = repositories.filter(repo => repo.isTracked === filters.isTracked)
    }

    if (filters?.isArchived !== undefined) {
      repositories = repositories.filter(repo => repo.isArchived === filters.isArchived)
    }

    if (filters?.language) {
      repositories = repositories.filter(repo => repo.language === filters.language)
    }

    return repositories
  }

  async getByFullName(fullName: string): Promise<Repository | null> {
    return DEMO_REPOSITORIES.find(repo => repo.fullName === fullName) || null
  }

  async update(
    repositoryId: string,
    updates: Partial<Repository>
  ): Promise<Repository> {
    const repository = await this.getById(repositoryId)
    if (!repository) {
      throw new Error(`Repository ${repositoryId} not found`)
    }

    // In demo mode, return updated repository (not persistent)
    return {
      ...repository,
      ...updates,
      updatedAt: new Date()
    }
  }

  async setTrackingStatus(
    repositoryId: string,
    isTracked: boolean
  ): Promise<void> {
    const repository = await this.getById(repositoryId)
    if (!repository) {
      throw new Error(`Repository ${repositoryId} not found`)
    }
    
    // In demo mode, this would update tracking status (not persistent)
    repository.isTracked = isTracked
  }

  async getMetrics(repositoryId: string): Promise<RepositoryMetrics> {
    const repository = await this.getById(repositoryId)
    if (!repository) {
      throw new Error(`Repository ${repositoryId} not found`)
    }

    // Generate demo metrics based on repository
    const demoMetrics = this.generateDemoMetrics(repository)
    
    return {
      repositoryId: repository.id,
      name: repository.name,
      fullName: repository.fullName,
      isTracked: repository.isTracked,
      hasData: repository.isTracked,
      metrics: demoMetrics.metrics,
      trends: demoMetrics.trends
    }
  }

  private generateDemoMetrics(repository: Repository) {
    // Generate consistent but varied demo metrics based on repository properties
    const hash = this.simpleHash(repository.id)
    const baseMetrics = {
      totalPRs: 20 + (hash % 40), // 20-60 PRs
      openPRs: 3 + (hash % 10), // 3-12 open PRs
      avgCycleTime: 24 + ((hash % 48)), // 24-72 hours
      avgPRSize: 120 + ((hash % 200)), // 120-320 lines
      categorizationRate: 75 + ((hash % 25)), // 75-100%
      activityScore: 50 + ((hash % 50)), // 50-100
      contributorCount: 2 + ((hash % 8)), // 2-10 contributors
      reviewCoverage: 80 + ((hash % 20)), // 80-100%
    }

    // Calculate health score from other metrics
    const healthFactors = [
      Math.min(100, baseMetrics.reviewCoverage),
      Math.min(100, baseMetrics.categorizationRate),
      Math.max(0, 100 - (baseMetrics.avgCycleTime * 1.5)),
      Math.max(0, 100 - (baseMetrics.avgPRSize / 5)),
    ]
    const healthScore = healthFactors.reduce((sum, factor) => sum + factor, 0) / healthFactors.length

    return {
      metrics: {
        ...baseMetrics,
        healthScore: Math.round(healthScore * 10) / 10
      },
      trends: {
        prVelocityTrend: this.getTrendDirection(hash, 0) as 'up' | 'down' | 'stable',
        cycleTimeTrend: this.getTrendDirection(hash, 1) as 'up' | 'down' | 'stable',
        qualityTrend: this.getTrendDirection(hash, 2) as 'up' | 'down' | 'stable'
      }
    }
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  private getTrendDirection(hash: number, offset: number): string {
    const value = (hash + offset) % 3
    return ['up', 'stable', 'down'][value]
  }

  async getOrganizationRepositories(organizationId: string): Promise<Repository[]> {
    return this.getByOrganization(organizationId)
  }

  async search(
    organizationId: string,
    query: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<Repository>> {
    const searchTerm = query.toLowerCase()
    const orgRepositories = await this.getByOrganization(organizationId)
    
    const matchingRepos = orgRepositories.filter(repo =>
      repo.name.toLowerCase().includes(searchTerm) ||
      repo.fullName.toLowerCase().includes(searchTerm) ||
      repo.description?.toLowerCase().includes(searchTerm) ||
      repo.language?.toLowerCase().includes(searchTerm)
    )
    
    const page = pagination || Pagination.create(1, 10)
    const startIndex = page.offset
    const endIndex = startIndex + page.limit
    const paginatedData = matchingRepos.slice(startIndex, endIndex)
    const total = matchingRepos.length

    return {
      data: paginatedData,
      pagination: {
        page: page.page,
        limit: page.limit,
        total,
        totalPages: Math.ceil(total / page.limit),
        hasNext: endIndex < total,
        hasPrev: page.page > 1
      }
    }
  }

  async syncFromGitHub(repositoryId: string): Promise<Repository> {
    const repository = await this.getById(repositoryId)
    if (!repository) {
      throw new Error(`Repository ${repositoryId} not found`)
    }

    // In demo mode, return repository with updated timestamp
    return {
      ...repository,
      updatedAt: new Date(),
      pushedAt: new Date()
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
    const repository = await this.getById(repositoryId)
    if (!repository) {
      throw new Error(`Repository ${repositoryId} not found`)
    }

    // Generate demo activity data
    const hash = this.simpleHash(repositoryId)
    const daysInRange = timeRange ? timeRange.getDays() : 30
    
    return {
      pullRequests: Math.floor((hash % 10) * (daysInRange / 30)), // Scale with time range
      commits: Math.floor((hash % 50) * (daysInRange / 30)),
      contributors: 2 + (hash % 6), // 2-8 contributors
      lastActivity: repository.pushedAt || repository.updatedAt
    }
  }
}
