import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { NextAuthConfig } from "next-auth"
import { findUserByEmail, createUser, updateUser, getUserOrganizations, findUserById } from "@/lib/repositories/user-repository"
import { createGitHubClient } from "@/lib/github"
import type { JWT } from "next-auth/jwt"
import { execute } from "@/lib/db"
import { GitHubService } from "@/lib/services"

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

declare module "next-auth/jwt" {
  interface JWT {
    login?: string;
    html_url?: string;
    avatar_url?: string;
    accessToken?: string;
  }
}

// Don't run migrations automatically at startup to avoid Edge Runtime errors
// Instead, we'll run them in API routes that are Node.js compatible

interface GitHubProfile {
  login?: string;
  html_url?: string;
  avatar_url?: string;
}

// Utility functions for cleaner callbacks
async function getOrganizationsForUser(userId: string, accessToken?: string) {
  try {
    let organizations = await getUserOrganizations(userId)
    
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

async function setSessionFlags(userId: string, organizations?: any[]) {
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

async function upsertUser(githubId: string, userData: any) {
  const { name, email, image } = userData
  
  const { rowsAffected } = await execute(
    `INSERT INTO users (id, name, email, image, created_at, updated_at) 
     VALUES (?, ?, ?, ?, datetime("now"), datetime("now")) 
     ON CONFLICT(id) DO UPDATE SET 
       name = excluded.name, 
       email = excluded.email, 
       image = excluded.image, 
       updated_at = datetime("now")`,
    [githubId, name, email, image]
  )
  
  return rowsAffected > 0
}

export const config = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
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
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/dashboard")) {
        return !!auth;
      }
      return true;
    },
    async session({ session, token }) {
      if (!token.sub) {
        console.warn("Session callback: token.sub is missing");
        return session;
      }

      // Set user data from token
      session.user.id = token.sub;
      session.user.login = token.login;
      session.user.html_url = token.html_url;
      session.user.avatar_url = token.avatar_url;
      
      if (token.accessToken) {
        session.accessToken = token.accessToken as string;
        
        // Safely fetch organizations with error handling to prevent session failures
        try {
          session.organizations = await getOrganizationsForUser(session.user.id, session.accessToken);
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
      if (profile && typeof profile.id !== 'undefined' && profile.id !== null) {
        token.sub = profile.id.toString();
        const gh = profile as GitHubProfile;
        token.login = gh.login;
        token.html_url = gh.html_url;
        token.avatar_url = gh.avatar_url;
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async signIn({ user, account, profile }) {
      if (!user.email || !profile || typeof profile.id === 'undefined' || profile.id === null) {
        console.error("SignIn: Missing required data");
        return false;
      }

      const githubId = profile.id.toString();

      try {
        // Upsert user
        await upsertUser(githubId, {
          name: user.name ?? profile.login ?? null,
          email: user.email,
          image: user.image ?? profile.avatar_url ?? null
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
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
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
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);

// Ensure this file doesn't execute in Edge Runtime
export const runtime = 'nodejs';