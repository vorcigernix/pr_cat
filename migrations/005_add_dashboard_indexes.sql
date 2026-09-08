-- Organization date-range queries join repositories before filtering pull requests.
-- The created_at index also serves repository activity ordered by creation time.
CREATE INDEX IF NOT EXISTS idx_pull_requests_repo_created_at ON pull_requests(repository_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pull_requests_repo_state_merged_at ON pull_requests(repository_id, state, merged_at);
