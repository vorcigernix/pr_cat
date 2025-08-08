# Environment Setup & GitHub Configuration Guide

This guide explains how to configure PR Cat for local development and production deployment, including all necessary GitHub Apps, OAuth Apps, and environment variables.

## Table of Contents
1. [Overview](#overview)
2. [GitHub Configuration](#github-configuration)
3. [Environment Variables](#environment-variables)
4. [Local Development Setup](#local-development-setup)
5. [Production Deployment (Vercel)](#production-deployment-vercel)
6. [Troubleshooting](#troubleshooting)

## Overview

PR Cat requires two separate GitHub integrations:
- **GitHub OAuth App**: For user authentication and sign-in
- **GitHub App**: For repository access, webhooks, and GitHub API interactions

## GitHub Configuration

### 1. Create a GitHub OAuth App

Navigate to: **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**

#### For Local Development:
- **Application name**: `PR Cat (Local)`
- **Homepage URL**: `http://localhost:3000`
- **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`

#### For Production:
- **Application name**: `PR Cat`
- **Homepage URL**: `https://prcat.vercel.app`
- **Authorization callback URL**: `https://prcat.vercel.app/api/auth/callback/github`

After creation, you'll get:
- `Client ID` → Use as `GITHUB_CLIENT_ID`
- Generate a `Client Secret` → Use as `GITHUB_CLIENT_SECRET`

### 2. Create a GitHub App

Navigate to: **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App**

#### Configuration:
- **GitHub App name**: `PR Cat` (must be unique across GitHub)
- **Homepage URL**: Your app URL
- **Webhook URL**: 
  - Local: `http://localhost:3000/api/webhook/github` (use ngrok for testing)
  - Production: `https://prcat.vercel.app/api/webhook/github`
- **Webhook secret**: Generate a secure random string (optional but recommended for production)

#### Permissions Required:
- **Repository permissions**:
  - Contents: Read
  - Issues: Read
  - Metadata: Read
  - Pull requests: Read & Write
  - Webhooks: Read & Write
- **Organization permissions**:
  - Members: Read
  - Administration: Read

#### Subscribe to Events:
- Pull request
- Pull request review
- Pull request review comment
- Push

After creation:
1. Note the `App ID` → Use as `GITHUB_APP_ID`
2. Generate a private key → Download the `.pem` file
3. Copy the entire contents of the `.pem` file → Use as `GITHUB_APP_PRIVATE_KEY`
4. Find the app slug in the URL (`github.com/apps/your-app-slug`) → Use as `NEXT_PUBLIC_GITHUB_APP_SLUG`

## Environment Variables

### Required Variables

```bash
# Authentication
NEXTAUTH_SECRET=            # Random 32+ character string (generate with: openssl rand -base64 32)
NEXTAUTH_URL=               # http://localhost:3000 (local) or https://prcat.vercel.app (production)

# GitHub OAuth App (for user authentication)
GITHUB_CLIENT_ID=           # From OAuth App
GITHUB_CLIENT_SECRET=       # From OAuth App

# GitHub App (for repository access)
GITHUB_APP_ID=              # Numeric ID from GitHub App
GITHUB_APP_PRIVATE_KEY=     # Full contents of the .pem file (including BEGIN/END lines)
NEXT_PUBLIC_GITHUB_APP_SLUG= # The slug from github.com/apps/<slug>

# Optional but recommended for production
GITHUB_WEBHOOK_SECRET=      # Same value you set in GitHub App webhook configuration

# Application
APP_URL=                    # Base URL of your app (same as NEXTAUTH_URL)

# Database (Turso)
TURSO_URL=                  # From Turso dashboard
TURSO_TOKEN=                # From Turso dashboard

# Optional
TURSO_POOL_SIZE=5          # Database connection pool size (default: 5)
```

## Local Development Setup

### 1. Create `.env.local` file

```bash
# Copy the example file
cp environment.example .env.local
```

### 2. Fill in the environment variables

```bash
# .env.local
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=http://localhost:3000
APP_URL=http://localhost:3000

# From your local GitHub OAuth App
GITHUB_CLIENT_ID=your-oauth-client-id
GITHUB_CLIENT_SECRET=your-oauth-client-secret

# From your GitHub App
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
...rest of your private key...
-----END RSA PRIVATE KEY-----"
NEXT_PUBLIC_GITHUB_APP_SLUG=your-app-slug

# Optional for local dev
GITHUB_WEBHOOK_SECRET=

# Turso database
TURSO_URL=libsql://your-db.turso.io
TURSO_TOKEN=your-turso-token
```

### 3. Install dependencies and run

```bash
# Install dependencies
pnpm install

# Run database migrations
curl -X POST http://localhost:3000/api/migrate

# Start development server
pnpm dev
```

### 4. Testing Webhooks Locally

For local webhook testing, use [ngrok](https://ngrok.com/):

```bash
# Install ngrok
brew install ngrok  # macOS

# Start ngrok tunnel
ngrok http 3000

# Update your GitHub App webhook URL to the ngrok URL
# Example: https://abc123.ngrok.io/api/webhook/github
```

## Production Deployment (Vercel)

### 1. Set up Vercel Project

1. Import your GitHub repository to Vercel
2. Navigate to: **Project Settings → Environment Variables**

### 2. Add Environment Variables

Add all the variables from your `.env.local`, but use production values:
- `NEXTAUTH_URL` = `https://prcat.vercel.app` (or your custom domain)
- `APP_URL` = `https://prcat.vercel.app`
- Use production GitHub OAuth App credentials
- Set `GITHUB_WEBHOOK_SECRET` with a secure value

### 3. Deploy

```bash
# Deploy to production
vercel --prod

# Or push to main branch if connected to GitHub
git push origin main
```

### 4. Run Migrations

After deployment, trigger migrations:

```bash
curl -X POST https://prcat.vercel.app/api/migrate \
  -H "Authorization: Bearer your-auth-token"
```

## Troubleshooting

### Common Issues and Solutions

#### 1. "AccessDenied" Error During Sign-in
**Cause**: Mismatched OAuth callback URL
**Solution**: 
- Verify the callback URL in your GitHub OAuth App matches exactly: `${NEXTAUTH_URL}/api/auth/callback/github`
- Check that you're using the correct `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` pair

#### 2. Organizations Not Appearing
**Cause**: Organizations not synced to database
**Solution**:
1. Sign in to the app
2. Go to Settings → GitHub tab
3. Click "Sync Organizations"
4. Ensure the GitHub App is installed to your organization

#### 3. "WEBHOOK: GITHUB_WEBHOOK_SECRET not configured" Warning
**Cause**: Missing webhook secret (optional for development)
**Solution**:
- For production: Set `GITHUB_WEBHOOK_SECRET` in environment variables
- For development: This warning can be ignored; webhooks will work without verification

#### 4. Repositories Not Showing
**Cause**: GitHub App not installed or repositories not synced
**Solution**:
1. Install the GitHub App to your organization
2. Go to Settings → GitHub tab
3. Select your organization
4. Click "Sync Repositories"

#### 5. Database Connection Issues
**Cause**: Invalid Turso credentials
**Solution**:
- Verify `TURSO_URL` and `TURSO_TOKEN` are correct
- Check Turso dashboard for connection details
- Ensure your IP is whitelisted if using IP restrictions

### Debug Endpoints (Development Only)

```bash
# Check health status
curl http://localhost:3000/api/health

# Check session
curl http://localhost:3000/api/debug/session

# Check GitHub organizations
curl http://localhost:3000/api/debug/github-orgs
```

## Security Best Practices

1. **Never commit `.env.local` or any file containing secrets**
2. **Use different GitHub Apps for development and production**
3. **Rotate secrets regularly**
4. **Set `GITHUB_WEBHOOK_SECRET` in production**
5. **Use environment-specific OAuth Apps**
6. **Keep the GitHub App private key secure**

## Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [GitHub Apps Documentation](https://docs.github.com/en/developers/apps)
- [Turso Documentation](https://docs.turso.tech/)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

## Support

If you encounter issues not covered in this guide:
1. Check the server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure GitHub App permissions are configured properly
4. Check that the database migrations have run successfully
