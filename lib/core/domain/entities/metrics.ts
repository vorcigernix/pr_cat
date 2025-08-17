/**
 * Metrics Domain Entities
 * Core business entities for analytics and metrics
 */

export interface MetricsSummary {
  trackedRepositories: number
  prsMergedThisWeek: number
  prsMergedLastWeek: number
  weeklyPRVolumeChange: number
  averagePRSize: number
  openPRCount: number
  categorizationRate: number
  dataUpToDate: string
  lastUpdated: string
  cacheStrategy: string
  nextUpdateDue: string
}

export interface TimeSeriesDataPoint {
  date: string
  prThroughput: number
  cycleTime: number
  reviewTime: number
  codingHours: number
}

export interface CategoryDistribution {
  categoryName: string
  count: number
  percentage: number
}

export interface CategoryTimeSeriesData {
  data: Array<{
    date: string
    [categoryKey: string]: string | number
  }>
  categories: Array<{
    key: string
    label: string
    color: string
  }>
}

export interface Recommendation {
  id: string
  type: 'performance' | 'quality' | 'collaboration' | 'process'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
  actionItems: string[]
  metrics: {
    currentValue: number
    targetValue: number
    improvementPotential: string
  }
  affectedRepositories?: string[]
  timeFrame: string
}

export interface RecommendationsResponse {
  recommendations: Recommendation[]
  summary: {
    totalRecommendations: number
    highPriorityCount: number
    estimatedImpact: string
    focusAreas: string[]
  }
}

export interface TeamMemberStats {
  userId: string
  name: string
  prsCreated: number
  prsReviewed: number
  avgCycleTime: number
  avgPRSize: number
  reviewThoroughness: number
  contributionScore: number
}

export interface TeamPerformanceMetrics {
  teamMembers: TeamMemberStats[]
  totalContributors: number
  avgTeamCycleTime: number
  avgTeamPRSize: number
  collaborationIndex: number
  reviewCoverage: number
}
