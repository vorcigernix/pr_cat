import NextAuth from "next-auth"
import type { NextAuthOptions } from "next-auth"
import { getServerSession } from "next-auth/next"
import GitHub from "next-auth/providers/github"
import { getUserOrganizations, findUserById } from "@/lib/repositories/user-repository"
import { createGitHubClient } from "@/lib/github"
import { execute } from "@/lib/db"
import { GitHubService } from "@/lib/services"

// Use fixed demo secret for consistent JWT handling
function ensureNextAuthSecret(): string {
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET;
  }
  
  // Use a fixed demo secret to avoid JWT decryption issues
  const DEMO_SECRET = 'demo-secret-for-pr-cat-this-is-only-for-demo-mode-not-production-use-64chars';
  
  // Set it in process.env so NextAuth can find it
  process.env.NEXTAUTH_SECRET = DEMO_SECRET;
  console.log('🔐 Using fixed demo secret for consistent JWT handling');
  
  return DEMO_SECRET;
}

// Generate the secret before NextAuth config
const NEXTAUTH_SECRET = ensureNextAuthSecret();

// Extend the Session interface to include accessToken and organizations
// and GitHub profile fields
// (You may want to move this to a types file for larger projects)
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      login?: string;
      html_url?: string;
      avatar_url?: string;
    };
    organizations?: {
      id: number;
      github_id: number;
      name: string;
      avatar_url: string | null;
    }[];
    // Added flags for onboarding and setup status
    newUser?: boolean;
    hasGithubApp?: boolean;
  }
}

// Don't run migrations automatically at startup to avoid Edge Runtime errors
// Instead, we'll run them in API routes that are Node.js compatible

type SessionOrganization = {
  id: number;
  github_id: number;
  name: string;
  avatar_url: string | null;
};

type UpsertUserData = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

// Utility functions for cleaner callbacks
async function getOrganizationsForUser(userId: string, accessToken?: string) {
  try {
    const organizations = await getUserOrganizations(userId)
    
    if ((!organizations || organizations.length === 0) && accessToken) {
      const githubClient = createGitHubClient(accessToken)
      const githubOrgs = await githubClient.getUserOrganizations()
      // Map GitHub orgs to the expected session format (not full Organization type)
      const mappedOrgs = githubOrgs.map(org => ({
        id: 0, 
        github_id: org.id,
        name: org.login,
        avatar_url: org.avatar_url,
      }))
      return mappedOrgs
    }
    
    return organizations || []
  } catch (error) {
    console.error("Error fetching organizations:", error)
    return []
  }
}

async function setSessionFlags(userId: string, organizations?: SessionOrganization[]) {
  try {
    const user = await findUserById(userId)
    const newUser = user?.created_at 
      ? new Date(user.created_at).getTime() > Date.now() - 5 * 60 * 1000
      : true
    
    const hasGithubApp = !!(organizations && organizations.length > 0)
    
    return { newUser, hasGithubApp }
  } catch (error) {
    console.error("Error setting session flags:", error)
    return { newUser: false, hasGithubApp: false }
  }
}

async function upsertUser(githubId: string, userData: UpsertUserData) {
  const { name, email, image } = userData
  
  const { rowsAffected } = await execute(
    `INSERT INTO users (id, name, email, image, created_at, updated_at) 
     VALUES (?, ?, ?, ?, datetime("now"), datetime("now")) 
     ON CONFLICT(id) DO UPDATE SET 
       name = excluded.name, 
       email = excluded.email, 
       image = excluded.image, 
       updated_at = datetime("now")`,
    [githubId, name ?? null, email ?? null, image ?? null]
  )
  
  return rowsAffected > 0
}

export const config = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_OAUTH_CLIENT_ID || 'demo-client-id',
      clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET || 'demo-client-secret',
      authorization: {
        params: {
          scope: 'read:user user:email repo read:org',
        },
      },
      // Try without explicit PKCE configuration
      // checks: ["pkce"],
    }),
  ],
  pages: {
    signIn: "/sign-in",
    signOut: "/",
    error: "/error",
  },
  callbacks: {
    async session({ session, token }) {
      if (!token.sub) {
        console.warn("Session callback: token.sub is missing");
        return session;
      }

      // Check if we're in demo mode (no real GitHub config)
      const isDemoMode = !process.env.GITHUB_OAUTH_CLIENT_ID || process.env.GITHUB_OAUTH_CLIENT_ID === 'demo-client-id';
      
      if (isDemoMode) {
        // Demo mode: use simple session without database calls
        session.user.id = token.sub;
        session.user.login = asOptionalString(token.login) ?? 'demo-user';
        session.user.html_url = asOptionalString(token.html_url) ?? 'https://github.com/demo-user';
        session.user.avatar_url = asOptionalString(token.avatar_url) ?? '/api/placeholder/avatar/demo';
        session.organizations = [];
        session.newUser = false;
        session.hasGithubApp = false;
        return session;
      }

      // Real mode: full session handling
      session.user.id = token.sub;
      session.user.login = asOptionalString(token.login);
      session.user.html_url = asOptionalString(token.html_url);
      session.user.avatar_url = asOptionalString(token.avatar_url);
      
      const accessToken = asOptionalString(token.accessToken);
      if (accessToken && accessToken.length > 0) {
        session.accessToken = accessToken;
        
        // Safely fetch organizations with error handling to prevent session failures
        try {
          session.organizations = await getOrganizationsForUser(session.user.id, accessToken);
        } catch (error) {
          console.error("Session callback: Failed to fetch organizations", error);
          // Degrade gracefully - set empty organizations array
          session.organizations = [];
        }
      }
      
      // Set session flags with error handling
      try {
        const flags = await setSessionFlags(session.user.id, session.organizations);
        session.newUser = flags.newUser;
        session.hasGithubApp = flags.hasGithubApp;
      } catch (error) {
        console.error("Session callback: Failed to set session flags", error);
        // Degrade gracefully with default values
        session.newUser = false;
        session.hasGithubApp = false;
      }
      
      return session;
    },
    async jwt({ token, account, profile }) {
      const gh = profile as Record<string, unknown> | undefined;
      if (gh && typeof gh.id !== 'undefined' && gh.id !== null) {
        token.sub = gh.id.toString();
        token.login = asOptionalString(gh.login);
        token.html_url = asOptionalString(gh.html_url);
        token.avatar_url = asOptionalString(gh.avatar_url);
      }
      if (account) {
        token.accessToken = asOptionalString(account.access_token);
      }
      return token;
    },
    async signIn({ user, account, profile }) {
      // Skip database operations if GitHub credentials not properly configured (demo mode)
      const hasGitHubCredentials = process.env.GITHUB_OAUTH_CLIENT_ID && 
                                   process.env.GITHUB_OAUTH_CLIENT_SECRET && 
                                   process.env.GITHUB_OAUTH_CLIENT_ID !== 'demo-client-id';
      
      if (!hasGitHubCredentials) {
        // Demo mode: allow sign-in without database operations  
        console.log('🎯 Demo mode: Allowing sign-in without database operations');
        user.id = 'demo-user-123';
        return true;
      }

      // Production mode: full sign-in process with database operations
      const profileData = profile as Record<string, unknown> | undefined;
      if (!profileData || typeof profileData.id === 'undefined' || profileData.id === null) {
        console.error("SignIn: Missing required profile.id");
        return false;
      }

      const githubId = profileData.id.toString();
      const profileLogin = asOptionalString(profileData.login);
      const profileAvatarUrl = asOptionalString(profileData.avatar_url);

      try {
        // Upsert user
        await upsertUser(githubId, {
          name: user.name ?? profileLogin ?? null,
          // Email may be null/undefined if not provided by GitHub; allow null in DB
          email: user.email ?? null,
          image: user.image ?? profileAvatarUrl ?? null
        });
        
        user.id = githubId;
        
        // Sync organizations if we have an access token
        if (account?.access_token) {
          try {
            const githubService = new GitHubService(account.access_token);
            await githubService.syncUserOrganizations(githubId);
          } catch (syncError) {
            console.error(`Organization sync failed for user ${githubId}:`, syncError);
          }
        }
        
        return true;
      } catch (error) {
        console.error(`SignIn failed for user ${githubId}:`, error);
        return false;
      }
    },
  },
  session: {
    strategy: "jwt",
  },
  // Add additional security configuration
  secret: NEXTAUTH_SECRET,
  // Add cookie configuration to help with PKCE
  cookies: {
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true
      }
    }
  },
} satisfies NextAuthOptions;

const handler = NextAuth(config);

export const handlers = {
  GET: handler,
  POST: handler,
};

export function auth() {
  return getServerSession(config);
}

// Ensure this file doesn't execute in Edge Runtime
export const runtime = 'nodejs';
