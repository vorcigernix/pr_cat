/**
 * Centralized Demo Data
 * All static and generated demo data for the application
 */

// For now, we'll use inline type definitions to avoid import issues
// TODO: Fix imports once the project structure is fully established
type User = {
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

type Organization = {
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

type Repository = {
  id: string
  name: string
  fullName: string
  description: string | null
  htmlUrl: string
  defaultBranch: string
  isPrivate: boolean
  isTracked: boolean
  isArchived: boolean
  language: string | null
  size: number
  stargazersCount: number
  forksCount: number
  openIssuesCount: number
  organizationId: string
  createdAt: Date
  updatedAt: Date
  pushedAt: Date | null
}

type PullRequestSummary = {
  id: string
  number: number
  title: string
  state: 'open' | 'closed' | 'merged'
  author: {
    login: string
    avatarUrl: string
  }
  repository: {
    name: string
  }
  category?: {
    name: string
  }
  createdAt: Date
  mergedAt: Date | null
  additions: number
  deletions: number
  reviewCount: number
}

type MetricsSummary = {
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

type Recommendation = {
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

type TeamMemberStats = {
  userId: string
  name: string
  prsCreated: number
  prsReviewed: number
  avgCycleTime: number
  avgPRSize: number
  reviewThoroughness: number
  contributionScore: number
}

type CategoryDistribution = {
  categoryName: string
  count: number
  percentage: number
}

type TimeSeriesDataPoint = {
  date: string
  prThroughput: number
  cycleTime: number
  reviewTime: number
  codingHours: number
}

// Demo Users
export const DEMO_USERS: User[] = [
  {
    id: 'demo-user-1',
    login: 'alice-dev',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    avatarUrl: 'https://github.com/github.png',
    htmlUrl: 'https://github.com/alice-dev',
    type: 'User',
    isNewUser: false,
    hasGithubApp: true,
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 'demo-user-2',
    login: 'bob-smith',
    name: 'Bob Smith',
    email: 'bob@example.com',
    avatarUrl: 'https://github.com/github.png',
    htmlUrl: 'https://github.com/bob-smith',
    type: 'User',
    isNewUser: false,
    hasGithubApp: true,
    createdAt: new Date('2023-02-10'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 'demo-user-3',
    login: 'carol-davis',
    name: 'Carol Davis',
    email: 'carol@example.com',
    avatarUrl: 'https://github.com/github.png',
    htmlUrl: 'https://github.com/carol-davis',
    type: 'User',
    isNewUser: false,
    hasGithubApp: true,
    createdAt: new Date('2023-03-05'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 'demo-user-4',
    login: 'david-wilson',
    name: 'David Wilson',
    email: 'david@example.com',
    avatarUrl: 'https://github.com/github.png',
    htmlUrl: 'https://github.com/david-wilson',
    type: 'User',
    isNewUser: false,
    hasGithubApp: true,
    createdAt: new Date('2023-04-20'),
    updatedAt: new Date('2024-01-15')
  }
]

// Demo Organizations
export const DEMO_ORGANIZATIONS: Organization[] = [
  {
    id: 'demo-org-1',
    login: 'example-corp',
    name: 'Example Corp',
    description: 'A demo organization for PR Cat',
    avatarUrl: 'https://github.com/github.png',
    type: 'Organization',
    htmlUrl: 'https://github.com/example-corp',
    isInstalled: true,
    installationId: 'demo-installation-1',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-15')
  }
]

// Demo Repositories
export const DEMO_REPOSITORIES: Repository[] = [
  {
    id: 'demo-repo-1',
    name: 'frontend-app',
    fullName: 'example-corp/frontend-app',
    description: 'React frontend application',
    htmlUrl: 'https://github.com/example-corp/frontend-app',
    defaultBranch: 'main',
    isPrivate: false,
    isTracked: true,
    isArchived: false,
    language: 'TypeScript',
    size: 15420,
    stargazersCount: 42,
    forksCount: 8,
    openIssuesCount: 12,
    organizationId: 'demo-org-1',
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-01-15'),
    pushedAt: new Date('2024-01-14')
  },
  {
    id: 'demo-repo-2',
    name: 'api-server',
    fullName: 'example-corp/api-server',
    description: 'Node.js API server',
    htmlUrl: 'https://github.com/example-corp/api-server',
    defaultBranch: 'main',
    isPrivate: false,
    isTracked: true,
    isArchived: false,
    language: 'JavaScript',
    size: 8950,
    stargazersCount: 28,
    forksCount: 5,
    openIssuesCount: 8,
    organizationId: 'demo-org-1',
    createdAt: new Date('2023-02-01'),
    updatedAt: new Date('2024-01-15'),
    pushedAt: new Date('2024-01-13')
  },
  {
    id: 'demo-repo-3',
    name: 'mobile-app',
    fullName: 'example-corp/mobile-app',
    description: 'React Native mobile application',
    htmlUrl: 'https://github.com/example-corp/mobile-app',
    defaultBranch: 'main',
    isPrivate: true,
    isTracked: true,
    isArchived: false,
    language: 'JavaScript',
    size: 12300,
    stargazersCount: 15,
    forksCount: 3,
    openIssuesCount: 6,
    organizationId: 'demo-org-1',
    createdAt: new Date('2023-03-15'),
    updatedAt: new Date('2024-01-15'),
    pushedAt: new Date('2024-01-12')
  }
]

// Demo Categories
export const DEMO_CATEGORIES = [
  { id: 'feature', name: 'Feature Development', description: 'New features and enhancements', color: '#3b82f6' },
  { id: 'bugfix', name: 'Bug Fixes', description: 'Bug fixes and corrections', color: '#ef4444' },
  { id: 'techdebt', name: 'Tech Debt', description: 'Technical debt and refactoring', color: '#f97316' },
  { id: 'docs', name: 'Documentation', description: 'Documentation updates', color: '#10b981' },
  { id: 'testing', name: 'Testing', description: 'Tests and quality assurance', color: '#8b5cf6' },
  { id: 'security', name: 'Security', description: 'Security improvements', color: '#eab308' }
]

// Demo Pull Requests
export const DEMO_PULL_REQUESTS: PullRequestSummary[] = [
  {
    id: 'demo-pr-1',
    number: 123,
    title: 'Add user authentication flow',
    state: 'merged',
    author: {
      login: 'alice-dev',
      avatarUrl: 'https://github.com/github.png'
    },
    repository: {
      name: 'frontend-app'
    },
    category: {
      name: 'Feature Development'
    },
    createdAt: new Date('2024-01-10'),
    mergedAt: new Date('2024-01-12'),
    additions: 245,
    deletions: 18,
    reviewCount: 2
  },
  {
    id: 'demo-pr-2',
    number: 124,
    title: 'Fix memory leak in data processor',
    state: 'merged',
    author: {
      login: 'bob-smith',
      avatarUrl: 'https://github.com/github.png'
    },
    repository: {
      name: 'api-server'
    },
    category: {
      name: 'Bug Fixes'
    },
    createdAt: new Date('2024-01-11'),
    mergedAt: new Date('2024-01-13'),
    additions: 67,
    deletions: 42,
    reviewCount: 1
  },
  {
    id: 'demo-pr-3',
    number: 125,
    title: 'Refactor database connection pooling',
    state: 'merged',
    author: {
      login: 'carol-davis',
      avatarUrl: 'https://github.com/github.png'
    },
    repository: {
      name: 'api-server'
    },
    category: {
      name: 'Tech Debt'
    },
    createdAt: new Date('2024-01-12'),
    mergedAt: new Date('2024-01-14'),
    additions: 156,
    deletions: 203,
    reviewCount: 3
  },
  {
    id: 'demo-pr-4',
    number: 126,
    title: 'Update API documentation',
    state: 'open',
    author: {
      login: 'david-wilson',
      avatarUrl: 'https://github.com/github.png'
    },
    repository: {
      name: 'api-server'
    },
    category: {
      name: 'Documentation'
    },
    createdAt: new Date('2024-01-13'),
    mergedAt: null,
    additions: 89,
    deletions: 12,
    reviewCount: 1
  },
  {
    id: 'demo-pr-5',
    number: 127,
    title: 'Add unit tests for payment service',
    state: 'merged',
    author: {
      login: 'alice-dev',
      avatarUrl: 'https://github.com/github.png'
    },
    repository: {
      name: 'api-server'
    },
    category: {
      name: 'Testing'
    },
    createdAt: new Date('2024-01-13'),
    mergedAt: new Date('2024-01-15'),
    additions: 234,
    deletions: 5,
    reviewCount: 2
  }
]

// Demo Metrics Summary
export const DEMO_METRICS_SUMMARY: MetricsSummary = {
  trackedRepositories: 15,
  prsMergedThisWeek: 24,
  prsMergedLastWeek: 22,
  weeklyPRVolumeChange: 9.1,
  averagePRSize: 156,
  openPRCount: 12,
  categorizationRate: 85.2,
  dataUpToDate: new Date().toISOString().split('T')[0],
  lastUpdated: new Date().toISOString(),
  cacheStrategy: 'daily-complete-data',
  nextUpdateDue: new Date(Date.now() + 86400000).toISOString()
}

// Demo Recommendations
export const DEMO_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'demo-cycle-time',
    type: 'performance',
    priority: 'medium',
    title: 'Optimize Delivery Cycle Time',
    description: 'Your average cycle time is 52 hours. Consider breaking down large PRs and implementing automated pipelines.',
    impact: 'Faster delivery cycles improve developer productivity and reduce context switching costs.',
    actionItems: [
      'Break down large PRs into smaller, focused changes',
      'Implement automated CI/CD pipelines to reduce manual delays',
      'Set up PR review rotation to ensure timely reviews'
    ],
    metrics: {
      currentValue: 52,
      targetValue: 36,
      improvementPotential: '40-60% reduction in cycle time'
    },
    timeFrame: '2-4 weeks'
  },
  {
    id: 'demo-pr-size',
    type: 'quality',
    priority: 'medium',
    title: 'Reduce PR Size for Better Reviews',
    description: 'Average PR size is 340 lines of code. Smaller PRs get reviewed faster and have fewer bugs.',
    impact: 'Smaller PRs get reviewed faster, have fewer bugs, and are easier to understand.',
    actionItems: [
      'Encourage developers to make smaller, atomic commits',
      'Implement PR size linting rules in your CI pipeline',
      'Use feature flags to merge incomplete features safely'
    ],
    metrics: {
      currentValue: 340,
      targetValue: 200,
      improvementPotential: '25-40% faster review time'
    },
    timeFrame: '1-2 weeks'
  },
  {
    id: 'demo-review-coverage',
    type: 'quality',
    priority: 'low',
    title: 'Maintain Code Review Excellence',
    description: 'Great job! 94% of merged PRs receive code reviews. Keep up the excellent review culture.',
    impact: 'Consistent review coverage maintains high code quality and team collaboration.',
    actionItems: [
      'Continue current review practices',
      'Consider adding more detailed review checklists',
      'Share review best practices with new team members'
    ],
    metrics: {
      currentValue: 94,
      targetValue: 90,
      improvementPotential: 'Maintain current high standards'
    },
    timeFrame: 'Ongoing'
  }
]

// Demo Team Performance
export const DEMO_TEAM_MEMBERS: TeamMemberStats[] = [
  {
    userId: 'demo-user-1',
    name: 'Alice Johnson',
    prsCreated: 18,
    prsReviewed: 24,
    avgCycleTime: 32.4,
    avgPRSize: 165,
    reviewThoroughness: 133.3,
    contributionScore: 60
  },
  {
    userId: 'demo-user-2', 
    name: 'Bob Smith',
    prsCreated: 15,
    prsReviewed: 19,
    avgCycleTime: 28.1,
    avgPRSize: 142,
    reviewThoroughness: 126.7,
    contributionScore: 49
  },
  {
    userId: 'demo-user-3',
    name: 'Carol Davis',
    prsCreated: 12,
    prsReviewed: 22,
    avgCycleTime: 35.8,
    avgPRSize: 201,
    reviewThoroughness: 183.3,
    contributionScore: 46
  },
  {
    userId: 'demo-user-4',
    name: 'David Wilson',
    prsCreated: 9,
    prsReviewed: 16,
    avgCycleTime: 41.2,
    avgPRSize: 178,
    reviewThoroughness: 177.8,
    contributionScore: 34
  }
]

// Demo Category Distribution
export const DEMO_CATEGORY_DISTRIBUTION: CategoryDistribution[] = [
  { categoryName: 'Feature Development', count: 42, percentage: 35.0 },
  { categoryName: 'Bug Fixes', count: 28, percentage: 23.3 },
  { categoryName: 'Tech Debt', count: 21, percentage: 17.5 },
  { categoryName: 'Documentation', count: 15, percentage: 12.5 },
  { categoryName: 'Testing', count: 10, percentage: 8.3 },
  { categoryName: 'Security', count: 4, percentage: 3.4 }
]

// Generator functions for dynamic data
export class DemoDataGenerator {
  static generateTimeSeries(days: number): TimeSeriesDataPoint[] {
    const data: TimeSeriesDataPoint[] = []
    const endDate = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const currentDate = new Date(endDate)
      currentDate.setDate(currentDate.getDate() - i)
      const dayOfWeek = currentDate.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      
      // Lower activity on weekends
      const baseActivity = isWeekend ? 0.3 : 1.0
      const randomVariation = 0.7 + Math.random() * 0.6
      
      data.push({
        date: currentDate.toISOString().split('T')[0],
        prThroughput: Math.round(baseActivity * randomVariation * (3 + Math.random() * 4)),
        cycleTime: Math.round((35 + Math.random() * 30) * 10) / 10,
        reviewTime: Math.round((8 + Math.random() * 16) * 10) / 10,
        codingHours: Math.round(baseActivity * randomVariation * (2 + Math.random() * 6) * 10) / 10
      })
    }
    
    return data
  }
  
  static generateCategoryTimeSeries(days: number) {
    const categories = [
      { key: 'Feature_Development', label: 'Feature Development', color: '#3b82f6' },
      { key: 'Bug_Fixes', label: 'Bug Fixes', color: '#ef4444' },
      { key: 'Tech_Debt', label: 'Tech Debt', color: '#f97316' },
      { key: 'Documentation', label: 'Documentation', color: '#10b981' },
      { key: 'Testing', label: 'Testing', color: '#8b5cf6' },
      { key: 'Security', label: 'Security', color: '#eab308' }
    ]
    
    const timeSeriesData = []
    const endDate = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayData: { date: string; [key: string]: string | number } = { date: dateStr }
      
      categories.forEach((category, index) => {
        const baseActivity = [6, 4, 3, 2, 1, 1][index] || 1
        const dayOfWeek = date.getDay()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        const weekendMultiplier = isWeekend ? 0.3 : 1.0
        
        const count = Math.round(baseActivity * weekendMultiplier * (0.5 + Math.random()))
        dayData[category.key] = Math.max(0, count)
      })
      
      timeSeriesData.push(dayData)
    }
    
    return {
      data: timeSeriesData,
      categories
    }
  }
}
