# PR Cat - AI-powered PR Categorization Tool

PR Cat is an AI-powered GitHub PR categorization and analytics tool. It helps engineering teams understand how they're investing their time across different areas of their codebase.

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvorcigernix%2Fpr_cat&env=GITHUB_CLIENT_ID,GITHUB_CLIENT_SECRET,GITHUB_WEBHOOK_SECRET,GITHUB_APP_ID,GITHUB_APP_PRIVATE_KEY,NEXT_PUBLIC_GITHUB_APP_SLUG,TURSO_URL,TURSO_TOKEN,NEXTAUTH_SECRET,NEXTAUTH_URL,APP_URL,PORT&envDescription=Required%20environment%20variables%20for%20PR%20Cat&envLink=https%3A%2F%2Fgithub.com%2Fvorcigernix%2Fpr_cat%23environment-setup&project-name=pr-cat&repository-name=pr-cat)

## Features

- **GitHub Integration**: Connect to your GitHub repositories and automatically track pull requests
- **PR Categorization**: Automatically categorize PRs into investment areas
- **Analytics Dashboard**: Visualize how your team is spending their engineering time
- **Lifecycle Analysis**: Understand your PR workflow and identify bottlenecks
- **Team Insights**: Get insights into team collaboration patterns

## Setup Instructions

### Prerequisites

- Node.js 18+ and pnpm (required package manager)
- GitHub account with access to repositories you want to track
- Turso database account (for development and production)

### Environment Setup

1. Clone the repository
2. Copy the `.env.example` file to `.env.local` and fill in the values:

```bash
# GitHub OAuth Configuration (Required)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret

# GitHub App Configuration (Required for advanced features)
GITHUB_APP_ID=your_github_app_id
GITHUB_APP_PRIVATE_KEY=your_github_app_private_key
NEXT_PUBLIC_GITHUB_APP_SLUG=your-github-app-slug

# Turso Database Configuration (Required)
TURSO_URL=libsql://your-database-url.turso.io
TURSO_TOKEN=your_turso_auth_token

# NextAuth Configuration (Required)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Application URL (Required for webhooks and callbacks)
APP_URL=http://localhost:3000

# Optional: Port configuration
PORT=3000
```

**Note for Deployment:**
- For **basic functionality**: You need all variables marked as "Required"
- For **GitHub App features** (advanced repository management): You need the GitHub App configuration variables
- For **production deployment**: Make sure to update `NEXTAUTH_URL` and `APP_URL` to your production domain

3. Install dependencies:

```bash
pnpm install
```

4. Run the development server:

```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Setting Up GitHub OAuth

1. Go to your GitHub account settings
2. Navigate to Developer Settings > OAuth Apps > New OAuth App
3. Fill in the application details:
   - Application name: PR Cat (Development)
   - Homepage URL: http://localhost:3000
   - Authorization callback URL: http://localhost:3000/api/auth/callback/github

### Setting Up Turso Database

1. Install the Turso CLI: https://docs.turso.tech/cli/installation
2. Create a new Turso database:
   ```bash
   turso db create prcatdb
   ```
3. Get your database URL:
   ```bash
   turso db show prcatdb --url
   ```
4. Create an auth token:
   ```bash
   turso db tokens create prcatdb
   ```
5. Add these values to your `.env.local` file as TURSO_URL and TURSO_TOKEN

## Development

The application uses Next.js 15 with the App Router and is structured as follows:

- `app/`: Next.js app router pages and API routes
- `components/`: UI components
- `lib/`: Core application logic and utilities
  - `repositories/`: Database access layer
  - `services/`: Business logic services
  - `schema.sql`: Database schema
  - `migrate.ts`: Database migration utilities
  - `github.ts`: GitHub API client
  - `types.ts`: TypeScript type definitions

## Deployment

The application is designed to be deployed on Vercel:

1. Connect your repository to Vercel
2. Configure the environment variables
3. Deploy!

For production deployment, make sure to:
- Create a separate GitHub OAuth application
- Set up a production Turso database
- Configure the correct webhook URLs
