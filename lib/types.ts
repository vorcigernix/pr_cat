// Database entity types

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: number;
  github_id: number;
  name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  installation_id?: number | null;
}

export interface UserOrganization {
  user_id: string;
  organization_id: number;
  role: 'member' | 'admin' | 'owner';
  created_at: string;
}

export interface Repository {
  id: number;
  github_id: number;
  organization_id: number | null;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  is_tracked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  organization_id: number | null;
  name: string;
  description: string | null;
  color: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PullRequest {
  id: number;
  github_id: number;
  repository_id: number;
  number: number;
  title: string;
  description: string | null;
  author_id: string | null;
  state: 'open' | 'closed' | 'merged';
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  draft: boolean;
  additions: number | null;
  deletions: number | null;
  changed_files: number | null;
  category_id: number | null;
  category_confidence: number | null;
  embedding_id: number | null;
  ai_status?: 'pending' | 'processing' | 'completed' | 'error' | 'skipped' | string | null;
  error_message?: string | null;
}

export interface PRReview {
  id: number;
  github_id: number;
  pull_request_id: number;
  reviewer_id: string | null;
  state: 'approved' | 'changes_requested' | 'commented' | 'dismissed';
  submitted_at: string;
}

export interface Setting {
  id: number;
  user_id: string | null;
  organization_id: number | null;
  key: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export interface Recommendation {
  id: number;
  organization_id: number;
  title: string;
  description: string;
  recommendation_type: 'process' | 'technical' | 'workflow' | string;
  status: 'open' | 'accepted' | 'rejected' | 'implemented';
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface Embedding {
  id: number;
  source_type: 'pull_request' | 'category' | string;
  source_id: number;
  vector: Uint8Array | null;
  created_at: string;
}

export interface Team {
  id: number;
  organization_id: number;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: number;
  team_id: number;
  user_id: string;
  role: 'member' | 'lead' | 'admin';
  joined_at: string;
  created_at: string;
  updated_at: string;
}

// Extended types for UI components
export interface TeamWithMembers extends Team {
  members: (TeamMember & { user: User })[];
  member_count: number;
}

export interface UserWithTeams extends User {
  teams: (TeamMember & { team: Team })[];
}

// GitHub API response types

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  name?: string;
  email?: string;
}

export interface GitHubOrganization {
  id: number;
  login: string;
  avatar_url: string;
  description?: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    id: number;
    login: string;
    type: 'User' | 'Organization';
  };
  installation?: {
    id: number;
  };
  html_url: string;
  description?: string;
  private: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  language?: string;
  default_branch: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  state: string;
  title: string;
  body?: string;
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  draft: boolean;
  additions?: number;
  deletions?: number;
  changed_files?: number;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
} 