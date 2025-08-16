/**
 * Demo Mode Configuration
 * Provides static demo data when external services aren't configured
 */

export const isDemoMode = (): boolean => {
  // Check if required external services are configured
  const hasDatabase = Boolean(process.env.TURSO_URL && process.env.TURSO_TOKEN);
  const hasGitHubApp = Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY);
  
  // Enable demo mode if external services aren't configured
  return !hasDatabase || !hasGitHubApp || process.env.DEMO_MODE === 'true';
};

export const getDemoModeInfo = () => {
  const missing = [];
  
  if (!process.env.TURSO_URL || !process.env.TURSO_TOKEN) {
    missing.push('Database (Turso)');
  }
  
  if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_APP_PRIVATE_KEY) {
    missing.push('GitHub App');
  }
  
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    missing.push('GitHub OAuth');
  }
  
  return {
    isDemoMode: isDemoMode(),
    missingServices: missing,
    canUpgrade: missing.length > 0
  };
};

// Static demo data paths
export const DEMO_DATA_PATHS = {
  pullRequests: '/dashboard/pull-requests.json',
  repositories: '/dashboard/repositories.json',
  developers: '/dashboard/developers.json',
  timeSeries: '/dashboard/time-series.json',
  metricsSummary: '/dashboard/metrics-summary.json',
  allData: '/dashboard/all-data.json'
} as const;

// Demo organization info
export const DEMO_ORG = {
  id: 'demo-org',
  name: 'Demo Organization',
  login: 'demo-org',
  description: 'This is a demo organization showing sample data. Connect your GitHub account for real data.',
  members_count: 12,
  public_repos: 25,
  private_repos: 15
};

// Demo user info
export const DEMO_USER = {
  id: 'demo-user',
  login: 'demo-user',
  name: 'Demo User',
  email: 'demo@example.com',
  avatar_url: '/api/placeholder/avatar/demo-user'
};

export const DEMO_REPOSITORIES = [
  {
    id: 1,
    name: 'web-app',
    full_name: 'demo-org/web-app',
    description: 'Main web application',
    language: 'TypeScript',
    stars: 234,
    forks: 45,
    open_issues: 12
  },
  {
    id: 2,
    name: 'api-service',
    full_name: 'demo-org/api-service',
    description: 'REST API backend service',
    language: 'Python',
    stars: 156,
    forks: 28,
    open_issues: 8
  },
  {
    id: 3,
    name: 'mobile-app',
    full_name: 'demo-org/mobile-app',
    description: 'Mobile application for iOS and Android',
    language: 'React Native',
    stars: 89,
    forks: 15,
    open_issues: 5
  }
];
