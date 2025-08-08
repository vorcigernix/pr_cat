Guide (where to get each value)
- NEXTAUTH_SECRET
  - What: Random 32+ char secret for session signing.
  - Where: Generate locally (e.g., openssl rand -base64 32) and put into your env.

- GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
  - What: OAuth App credentials for user login.
  - Where: GitHub → Settings → Developer settings → OAuth Apps → Your OAuth App.
    - Client ID: shown on app page.
    - Client Secret: “Generate a new client secret”.
    - Authorization callback URL: set to NEXTAUTH_URL + /api/auth/callback/github (e.g., https://prcat.vercel.app/api/auth/callback/github).

- GITHUB_APP_ID
  - What: GitHub App ID (numeric).
  - Where: GitHub → Settings → Developer settings → GitHub Apps → Your GitHub App → App ID.

- GITHUB_APP_PRIVATE_KEY
  - What: Private key PEM for the GitHub App (used to mint installation tokens).
  - Where: GitHub → Settings → Developer settings → GitHub Apps → Your GitHub App → Generate a private key → download .pem, paste full contents (including BEGIN/END).

- NEXT_PUBLIC_GITHUB_APP_SLUG
  - What: The slug of your GitHub App (public, used client-side).
  - Where: GitHub App page URL path (apps/<slug>) or shown near the app name.

- GITHUB_WEBHOOK_SECRET (optional, recommended for prod)
  - What: Secret used to sign/verify webhooks.
  - Where (GitHub App webhooks): GitHub → Your GitHub App → Webhook → “Webhook secret”.
  - Notes:
    - We also use this value for repository webhooks we create via API.
    - If not set, code falls back to GITHUB_CLIENT_SECRET; in non-production, verification is skipped if neither is set.

- APP_URL
  - What: Base URL of your deployment (used to build webhook URLs).
  - Where: Your production domain, e.g., https://prcat.vercel.app.

- NEXTAUTH_URL
  - What: Base URL for NextAuth callbacks.
  - Where: Same as APP_URL per environment (prod, preview, local).

- TURSO_URL / TURSO_TOKEN
  - What: Database URL and token.
  - Where: Turso dashboard → your DB → Connection details.

Environment tips
- Production:
  - OAuth App callback: https://prcat.vercel.app/api/auth/callback/github
  - Set NEXTAUTH_URL=https://prcat.vercel.app and APP_URL=https://prcat.vercel.app
  - Prefer a dedicated GITHUB_WEBHOOK_SECRET and set the same in GitHub App Webhook settings.
- Local:
  - Use a separate OAuth App for localhost with callback http://localhost:3000/api/auth/callback/github
  - Set NEXTAUTH_URL=http://localhost:3000 and APP_URL=http://localhost:3000
  - GITHUB_WEBHOOK_SECRET optional; dev skips verification if unset.

This aligns envs with GitHub’s UI and our code’s expectations.