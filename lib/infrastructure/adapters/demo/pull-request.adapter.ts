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

export class DemoPullRequestRepository implements IPullRequestRepository {
  
  async getRecent(
    organizationId: string, 
    pagination?: Pagination
  ): Promise<PaginatedResult<PullRequestSummary>> {
    const page = pagination || Pagination.create(1, 10)
    const startIndex = page.offset
    const endIndex = startIndex + page.limit
    
    // Sort by creation date (newest first)
    const sortedPRs = [...DEMO_PULL_REQUESTS].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    const paginatedData = sortedPRs.slice(startIndex, endIndex)
    const total = sortedPRs.length
    
    return {
      data: paginatedData.map(summary => ({
        id: summary.id,
        number: summary.number,
        title: summary.title,
        developer: {
          id: summary.author.login,
          name: summary.author.login.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
        },
        repository: {
          id: summary.repository.name.replace(/[^a-zA-Z0-9]/g, ''),
          name: summary.repository.name
        },
        status: summary.state,
        createdAt: summary.createdAt.toISOString(),
        mergedAt: summary.mergedAt ? summary.mergedAt.toISOString() : '',
        cycleTime: summary.mergedAt ? 
          Math.round((summary.mergedAt.getTime() - summary.createdAt.getTime()) / (1000 * 60 * 60) * 10) / 10 : 0,
        investmentArea: summary.category?.name || 'Feature Development',
        linesAdded: summary.additions,
        files: Math.floor((summary.additions + summary.deletions) / 50) + 1
      })),
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
    if (!summary) return null

    // Convert summary to full PR (mock additional data)
    const fullPR: PullRequest = {
      ...summary,
      author: {
        id: `demo-user-${summary.author.login}`,
        login: summary.author.login,
        name: summary.author.login.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        avatarUrl: summary.author.avatarUrl
      },
      repository: {
        id: `demo-repo-${summary.repository.name}`,
        name: summary.repository.name,
        fullName: `example-corp/${summary.repository.name}`
      },
      category: summary.category ? {
        id: summary.category.name.toLowerCase().replace(/\s+/g, '-'),
        name: summary.category.name
      } : undefined,
      description: `Detailed description for PR #${summary.number}`,
      isDraft: false,
      changedFiles: Math.floor(summary.additions / 20) + Math.floor(summary.deletions / 20),
      reviewers: [
        {
          id: 'demo-reviewer-1',
          login: 'reviewer1',
          name: 'Code Reviewer'
        }
      ],
      labels: [
        {
          id: 'enhancement',
          name: 'enhancement',
          color: '#a2eeef'
        }
      ],
      htmlUrl: `https://github.com/example-corp/${summary.repository.name}/pull/${summary.number}`,
      updatedAt: summary.mergedAt || summary.createdAt,
      closedAt: summary.state === 'closed' ? summary.mergedAt : null
    }

    return fullPR
  }

  async getByCategory(
    organizationId: string, 
    categoryId?: string,
    timeRange?: TimeRange
  ): Promise<PullRequest[]> {
    let filteredPRs = DEMO_PULL_REQUESTS

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
    timeRange?: TimeRange
  ): Promise<CategoryDistribution[]> {
    // For simplicity, return static data regardless of time range
    return DEMO_CATEGORY_DISTRIBUTION
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
    const openCount = prs.filter(pr => pr.state === 'open').length
    const mergedCount = prs.filter(pr => pr.state === 'merged').length
    const closedCount = prs.filter(pr => pr.state === 'closed').length

    // Calculate average cycle time for merged PRs
    const mergedPRs = prs.filter(pr => pr.state === 'merged' && pr.mergedAt)
    const averageCycleTime = mergedPRs.length > 0 
      ? mergedPRs.reduce((sum, pr) => {
          const cycleTimeHours = (new Date(pr.mergedAt!).getTime() - new Date(pr.createdAt).getTime()) / (1000 * 60 * 60)
          return sum + cycleTimeHours
        }, 0) / mergedPRs.length
      : 0

    const averageSize = prs.length > 0
      ? prs.reduce((sum, pr) => sum + pr.additions + pr.deletions, 0) / prs.length
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

  async getByRepository(
    repositoryId: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<PullRequestSummary>> {
    const repoPRs = DEMO_PULL_REQUESTS.filter(pr => 
      pr.repository.name === repositoryId || pr.id === repositoryId
    )
    
    const page = pagination || Pagination.create(1, 10)
    const startIndex = page.offset
    const endIndex = startIndex + page.limit
    const paginatedData = repoPRs.slice(startIndex, endIndex)
    const total = repoPRs.length

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
        pr.repository.name === filters.repositoryId
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
