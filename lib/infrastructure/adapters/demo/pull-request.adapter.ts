/**
 * Demo Pull Request Repository Adapter
 * Implements IPullRequestRepository using static demo data
 */

import { IPullRequestRepository } from '../../../core/ports'
import { 
  PullRequest, 
  PullRequestSummary, 
  PullRequestMetrics,
  CategoryDistribution,
  CategoryTimeSeriesData
} from '../../../core/domain/entities'
import { TimeRange, Pagination, PaginatedResult } from '../../../core/domain/value-objects'
import { 
  DEMO_PULL_REQUESTS, 
  DEMO_CATEGORY_DISTRIBUTION,
  DemoDataGenerator
} from './data/demo-data'

function mapDemoPullRequest(summary: typeof DEMO_PULL_REQUESTS[number]): PullRequestSummary {
  const createdAt = summary.createdAt
  const mergedAt = summary.mergedAt
  return {
    id: summary.id,
    number: summary.number,
    title: summary.title,
    developer: {
      id: summary.author.login,
      name: summary.author.login.replace('-', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
    },
    repository: { id: summary.repository.id, name: summary.repository.name },
    status: summary.state,
    createdAt: createdAt.toISOString(),
    mergedAt: mergedAt?.toISOString() || '',
    cycleTime: mergedAt ? Math.round((mergedAt.getTime() - createdAt.getTime()) / 3600000 * 10) / 10 : 0,
    investmentArea: summary.category?.name || 'Uncertain',
    linesAdded: summary.additions,
    linesRemoved: summary.deletions,
    files: Math.floor((summary.additions + summary.deletions) / 50) + 1
  }
}

export class DemoPullRequestRepository implements IPullRequestRepository {
  
  async getRecent(
    organizationId: string, 
    pagination?: Pagination,
    teamId?: number,
    timeRange?: string,
    repositoryId?: string
  ): Promise<PaginatedResult<PullRequestSummary>> {
    const page = pagination || Pagination.create(1, 10)
    const startIndex = page.offset
    const endIndex = startIndex + page.limit
    
    const now = Date.now()
    const cutoff = timeRange ? now - Number.parseInt(timeRange, 10) * 86400000 : 0
    const sortedPRs = DemoDataGenerator.getPullRequests(organizationId, teamId, repositoryId)
      .filter(pr => pr.createdAt.getTime() >= cutoff && pr.createdAt.getTime() <= now)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    
    const paginatedData = sortedPRs.slice(startIndex, endIndex)
    const total = sortedPRs.length
    
    return {
      data: paginatedData.map(mapDemoPullRequest),
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

  async getById(pullRequestId: string): Promise<PullRequest | null> {
    const summary = DEMO_PULL_REQUESTS.find(pr => pr.id === pullRequestId)
    return summary ? mapDemoPullRequest(summary) : null
  }

  async getByCategory(
    organizationId: string, 
    categoryId?: string,
    timeRange?: TimeRange
  ): Promise<PullRequest[]> {
    let filteredPRs = DemoDataGenerator.getPullRequests(organizationId)

    // Filter by category if specified
    if (categoryId) {
      filteredPRs = filteredPRs.filter(pr => 
        pr.category?.name.toLowerCase().replace(/\s+/g, '') === categoryId.toLowerCase()
      )
    }

    // Filter by time range if specified
    if (timeRange) {
      filteredPRs = filteredPRs.filter(pr => 
        timeRange.contains(new Date(pr.createdAt))
      )
    }

    // Convert to full PR objects
    const fullPRs = await Promise.all(
      filteredPRs.map(async summary => {
        const fullPR = await this.getById(summary.id)
        return fullPR!
      })
    )

    return fullPRs
  }

  async getCategoryDistribution(
    organizationId: string,
    timeRange?: TimeRange,
    teamId?: number,
    repositoryId?: string
  ): Promise<CategoryDistribution[]> {
    const prs = DemoDataGenerator.getPullRequests(organizationId, teamId, repositoryId)
      .filter(pr => !timeRange || timeRange.contains(pr.createdAt))
    const counts = new Map<string, number>()
    for (const pr of prs) {
      const category = pr.category?.name || 'Uncategorized'
      counts.set(category, (counts.get(category) || 0) + 1)
    }
    return [...counts].map(([categoryName, count]) => ({ categoryName, count, percentage: count / prs.length * 100 }))
      .sort((a, b) => b.count - a.count)
  }

  async getCategoryTimeSeries(
    organizationId: string,
    days: number
  ): Promise<CategoryTimeSeriesData> {
    return DemoDataGenerator.generateCategoryTimeSeries(days)
  }

  async getMetrics(
    organizationId: string,
    timeRange?: TimeRange
  ): Promise<PullRequestMetrics> {
    const prs = await this.getByCategory(organizationId, undefined, timeRange)
    
    const totalCount = prs.length
    const openCount = prs.filter(pr => pr.status === 'open').length
    const mergedCount = prs.filter(pr => pr.status === 'merged').length
    const closedCount = prs.filter(pr => pr.status === 'closed').length

    // Calculate average cycle time for merged PRs
    const mergedPRs = prs.filter(pr => pr.status === 'merged' && pr.mergedAt)
    const averageCycleTime = mergedPRs.length > 0 
      ? mergedPRs.reduce((sum, pr) => {
          const cycleTimeHours = (new Date(pr.mergedAt!).getTime() - new Date(pr.createdAt).getTime()) / (1000 * 60 * 60)
          return sum + cycleTimeHours
        }, 0) / mergedPRs.length
      : 0

    const averageSize = prs.length > 0
      ? prs.reduce((sum, pr) => sum + (pr.linesAdded || 0), 0) / prs.length
      : 0

    return {
      totalCount,
      openCount,
      mergedCount,
      closedCount,
      averageCycleTime,
      averageReviewTime: averageCycleTime * 0.3, // Assume review time is 30% of cycle time
      averageSize,
      categoryDistribution: DEMO_CATEGORY_DISTRIBUTION
    }
  }

  async getByAuthor(
    organizationId: string,
    authorId: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<PullRequestSummary>> {
    const authorPRs = DEMO_PULL_REQUESTS.filter(pr => pr.author.login === authorId)
    
    const page = pagination || Pagination.create(1, 10)
    const startIndex = page.offset
    const endIndex = startIndex + page.limit
    const paginatedData = authorPRs.slice(startIndex, endIndex)
    const total = authorPRs.length

    return {
      data: paginatedData.map(mapDemoPullRequest),
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

  async getByRepository(
    repositoryId: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<PullRequestSummary>> {
    const repoPRs = DEMO_PULL_REQUESTS.filter(pr => 
      pr.repository.id === repositoryId || pr.repository.name === repositoryId
    )
    
    const page = pagination || Pagination.create(1, 10)
    const startIndex = page.offset
    const endIndex = startIndex + page.limit
    const paginatedData = repoPRs.slice(startIndex, endIndex)
    const total = repoPRs.length

    return {
      data: paginatedData.map(mapDemoPullRequest),
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

  async search(
    organizationId: string,
    query: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<PullRequestSummary>> {
    const searchTerm = query.toLowerCase()
    const matchingPRs = DEMO_PULL_REQUESTS.filter(pr =>
      pr.title.toLowerCase().includes(searchTerm) ||
      pr.author.login.toLowerCase().includes(searchTerm) ||
      pr.repository.name.toLowerCase().includes(searchTerm)
    )
    
    const page = pagination || Pagination.create(1, 10)
    const startIndex = page.offset
    const endIndex = startIndex + page.limit
    const paginatedData = matchingPRs.slice(startIndex, endIndex)
    const total = matchingPRs.length

    return {
      data: paginatedData.map(mapDemoPullRequest),
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

  async getCount(
    organizationId: string,
    filters?: {
      state?: 'open' | 'closed' | 'merged'
      categoryId?: string
      repositoryId?: string
      authorId?: string
      timeRange?: TimeRange
    }
  ): Promise<number> {
    let filteredPRs = [...DEMO_PULL_REQUESTS]

    if (filters?.state) {
      filteredPRs = filteredPRs.filter(pr => pr.state === filters.state)
    }

    if (filters?.categoryId) {
      filteredPRs = filteredPRs.filter(pr => 
        pr.category?.name.toLowerCase().replace(/\s+/g, '') === filters.categoryId?.toLowerCase()
      )
    }

    if (filters?.repositoryId) {
      filteredPRs = filteredPRs.filter(pr => 
        pr.repository.id === filters.repositoryId || pr.repository.name === filters.repositoryId
      )
    }

    if (filters?.authorId) {
      filteredPRs = filteredPRs.filter(pr => 
        pr.author.login === filters.authorId
      )
    }

    if (filters?.timeRange) {
      filteredPRs = filteredPRs.filter(pr => 
        filters.timeRange!.contains(new Date(pr.createdAt))
      )
    }

    return filteredPRs.length
  }
}
