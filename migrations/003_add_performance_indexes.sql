-- Add performance indexes for common queries
-- These indexes will significantly improve sync and fetch operations

-- Index for pull requests by repository and PR number (used in webhook lookups)
CREATE INDEX IF NOT EXISTS idx_pull_requests_repo_number ON pull_requests(repository_id, number);

-- Index for pull requests by GitHub ID (used in webhook upserts)
CREATE INDEX IF NOT EXISTS idx_pull_requests_github_id ON pull_requests(github_id);

-- Index for PR reviews by pull request (used when fetching reviews for a PR)
CREATE INDEX IF NOT EXISTS idx_pr_reviews_pull_request_id ON pr_reviews(pull_request_id);

-- Index for repositories by organization (used in organization dashboard views)
CREATE INDEX IF NOT EXISTS idx_repositories_organization_id ON repositories(organization_id);

-- Composite index for user organizations (used in auth and permission checks)
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_org ON user_organizations(user_id, organization_id);

-- Additional useful indexes for common queries
-- Index for pull requests by author (used in developer metrics)
CREATE INDEX IF NOT EXISTS idx_pull_requests_author_id ON pull_requests(author_id);

-- Index for pull requests by state and repository (used in metrics calculations)
CREATE INDEX IF NOT EXISTS idx_pull_requests_state_repo ON pull_requests(state, repository_id);

-- Index for pull requests by created date (used in time-series queries)
CREATE INDEX IF NOT EXISTS idx_pull_requests_created_at ON pull_requests(created_at);

-- Index for PR reviews by reviewer (used in team performance metrics)
CREATE INDEX IF NOT EXISTS idx_pr_reviews_reviewer_id ON pr_reviews(reviewer_id);