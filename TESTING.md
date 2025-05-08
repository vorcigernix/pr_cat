# PR Cat - Testing Guide

This guide walks you through the process of testing the GitHub integration and database functionality in PR Cat.

## Prerequisites

Before testing, make sure you have:

1. Set up the environment as described in the README.md
2. A GitHub account with access to test repositories

## 0. Database Initialization

The application has been optimized to work with Edge Runtime, which means the database migrations need to be run explicitly:

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Check the database status:
   ```bash
   curl http://localhost:3000/api/status
   ```

3. If you see "migrationNeeded": true, run the migrations by visiting:
   ```bash
   curl http://localhost:3000/api/migrate
   ```
   Note: You may need to be authenticated to run migrations.

4. Verify the database is properly initialized:
   ```bash
   curl http://localhost:3000/api/status
   ```
   You should see "migrationNeeded": false and "version": 1

## 1. Testing Authentication

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Open http://localhost:3000 in your browser
3. Click "Sign In" and authorize with your GitHub account
4. Verify that you are redirected to the dashboard
5. Check the database to confirm user creation:
   ```bash
   turso db shell prcatdb
   SELECT * FROM users;
   ```

## 2. Testing GitHub API Integration

### 2.1 User Profile

1. Navigate to the dashboard (http://localhost:3000/dashboard)
2. Your GitHub profile information should be displayed in the sidebar
3. Verify API endpoint directly:
   ```bash
   curl -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" http://localhost:3000/api/github/user
   ```

### 2.2 Organizations

1. Navigate to the Teams view (http://localhost:3000/dashboard/team)
2. Your GitHub organizations should be listed
3. Verify organizations API endpoint:
   ```bash
   curl -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" http://localhost:3000/api/github/organizations
   ```
4. Check the database:
   ```sql
   SELECT * FROM organizations;
   SELECT * FROM user_organizations;
   ```

### 2.3 Repositories

1. Navigate to the Projects view (http://localhost:3000/dashboard/projects)
2. Click on an organization to view its repositories
3. Verify repositories API endpoint:
   ```bash
   curl -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" http://localhost:3000/api/github/organizations/YOUR_ORG_NAME/repositories
   ```
4. Also test fetching user repositories:
   ```bash
   curl -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" http://localhost:3000/api/github/repositories
   ```
5. Check the database:
   ```sql
   SELECT * FROM repositories;
   ```

## 3. Testing Repository Tracking

### 3.1 Setup Repository Tracking

1. In the Projects view, find a test repository and click "Track Repository"
2. The application should set up a webhook and mark the repository as tracked
3. Verify the API directly:
   ```bash
   curl -X POST -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" http://localhost:3000/api/github/repositories/REPO_ID/webhook
   ```
4. Check that the repository is marked as tracked in the database:
   ```sql
   SELECT * FROM repositories WHERE id = REPO_ID;
   ```
5. Verify the webhook was created in GitHub:
   - Go to your repository settings on GitHub
   - Navigate to "Webhooks"
   - Confirm a webhook pointing to your application URL exists

### 3.2 Testing PR Synchronization

1. After tracking a repository, click "Sync Pull Requests"
2. The application should fetch all PRs from the repository
3. Test the sync API endpoint directly:
   ```bash
   curl -X POST -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" http://localhost:3000/api/github/repositories/REPO_ID/sync
   ```
4. Check the database for pull requests:
   ```sql
   SELECT * FROM pull_requests WHERE repository_id = REPO_ID;
   ```

## 4. Testing Webhooks with Ngrok

For testing webhooks locally, you need to expose your local server to the internet.

### 4.1 Setting Up Ngrok

1. Start your Next.js development server:
   ```bash
   pnpm dev
   ```

2. In a new terminal, start ngrok on port 3000:
   ```bash
   ngrok http 3000
   ```

3. Ngrok will provide a public URL (e.g., https://a1b2c3d4.ngrok.io)

4. Update your .env.local file with this URL:
   ```
   APP_URL=https://a1b2c3d4.ngrok.io
   ```

5. Restart your Next.js development server

### 4.2 Testing Real-time Webhook Updates

1. Create a new PR in your tracked GitHub repository
2. The webhook should trigger and add the PR to your database
3. Check the server logs for webhook processing events
4. Verify in the database:
   ```sql
   SELECT * FROM pull_requests WHERE repository_id = REPO_ID ORDER BY created_at DESC LIMIT 1;
   ```

5. Update an existing PR (title, description, or status)
6. The webhook should trigger and update the PR data
7. Verify in the database that the PR was updated

## 5. Testing Webhook Removal

1. In the Projects view, find your tracked repository and click "Untrack Repository"
2. The application should remove the webhook and mark the repository as not tracked
3. Test the API directly:
   ```bash
   curl -X DELETE -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" http://localhost:3000/api/github/repositories/REPO_ID/webhook
   ```
4. Check the database:
   ```sql
   SELECT * FROM repositories WHERE id = REPO_ID;
   ```
5. Verify the webhook was removed in GitHub:
   - Go to your repository settings on GitHub
   - Navigate to "Webhooks"
   - Confirm the webhook was removed

## 6. Debugging Tips

### Viewing Database Contents

To explore the database directly:

```bash
turso db shell prcatdb
```

Useful queries:

```sql
-- Check users
SELECT * FROM users;

-- Check repositories
SELECT * FROM repositories;

-- Check pull requests
SELECT * FROM pull_requests;

-- Check PR count by repository
SELECT r.name, COUNT(pr.id) as pr_count 
FROM repositories r
LEFT JOIN pull_requests pr ON r.id = pr.repository_id
GROUP BY r.name;
```

### Troubleshooting Webhooks

If webhooks aren't working:

1. Check the Turso database URL and auth token are correct (TURSO_URL and TURSO_TOKEN)
2. Verify the webhook URL in GitHub settings points to your Ngrok URL
3. Check your server logs for webhook events
4. Ensure the webhook secret in GitHub matches your GITHUB_WEBHOOK_SECRET env variable
5. Test the webhook manually using the GitHub repository settings page (Send test payload)

### API Debugging

For debugging API requests:

1. Use browser developer tools Network tab to monitor request/response
2. Check server logs for errors
3. Use curl with verbose flag for detailed API interactions:
   ```bash
   curl -v -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" http://localhost:3000/api/status
   ``` 