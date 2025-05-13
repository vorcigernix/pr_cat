import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { NextAuthConfig } from "next-auth"
import { findUserByEmail, createUser, updateUser, getUserOrganizations, findUserById } from "@/lib/repositories/user-repository"
import { createGitHubClient } from "@/lib/github"
import type { JWT } from "next-auth/jwt"
import { execute } from "@/lib/db"

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

export const config = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email repo read:org',
          // This is the correct parameter to request organization access during OAuth
          // It will show the organization access screen during authentication
          allow_signup: 'true',
          request_specific_authorization: 'true'
        },
      },
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
      // Ensure session.user.id is the GitHub numeric ID from token.sub
      if (token.sub) { 
        session.user.id = token.sub; // token.sub IS the GitHub numeric ID
        session.user.login = token.login;
        session.user.html_url = token.html_url;
        session.user.avatar_url = token.avatar_url;
        
        if (token.accessToken) {
          session.accessToken = token.accessToken as string;
          try {
            session.organizations = await getUserOrganizations(session.user.id); 
            
            if (!session.organizations || session.organizations.length === 0) {
              const githubClient = createGitHubClient(session.accessToken);
              const githubOrgs = await githubClient.getUserOrganizations();
              session.organizations = githubOrgs.map(org => ({
                id: 0, 
                github_id: org.id,
                name: org.login,
                avatar_url: org.avatar_url,
              }));
            }
          } catch (error) {
            console.error("Error fetching GitHub organizations for session:", error);
            session.organizations = session.organizations || []; 
          }
        }
        
        // Set onboarding status flags
        // For now, we're using simple logic to determine these values
        // In a real implementation, these would come from your database
        try {
          // Check if user is newly created - this is a simplified example
          // In production, you would check creation date or a specific flag in your database
          const user = await findUserById(session.user.id);
          session.newUser = user?.created_at 
            ? new Date(user.created_at).getTime() > Date.now() - 5 * 60 * 1000 // Consider new if account less than 5 minutes old
            : true;
          
          // We'll set hasGithubApp to true if user has organizations
          // This is a simplified approach - in production, you would check if the GitHub App
          // is actually installed for any of the user's organizations
          // The actual check is handled by the OrganizationsAppStatus component on the client side
          session.hasGithubApp = !!session.organizations?.length;
        } catch (error) {
          console.error("Error setting session flags:", error);
          session.newUser = false;
          session.hasGithubApp = false;
        }
      } else {
        console.warn("Session callback: token.sub is missing for session:", session);
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      if (profile) { 
        // Ensure profile.id exists and is a number or string before converting to string
        if (typeof profile.id !== 'undefined' && profile.id !== null) {
          token.sub = profile.id.toString();
        } else {
          // Handle missing profile.id - perhaps log an error or use a fallback if appropriate
          console.error("JWT callback: GitHub profile.id is missing or null.");
        }
        const gh = profile as GitHubProfile; 
        token.login = typeof gh.login === "string" ? gh.login : undefined;
        token.html_url = typeof gh.html_url === "string" ? gh.html_url : undefined;
        token.avatar_url = typeof gh.avatar_url === "string" ? gh.avatar_url : undefined;
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async signIn({ user, account, profile }) {
      if (!user.email || !profile || typeof profile.id === 'undefined' || profile.id === null) {
        console.error("SignIn callback: Missing user.email or profile.id from GitHub.");
        return false;
      }

      const githubNumericId = profile.id.toString();

      try {
        let dbUser = await findUserById(githubNumericId);

        if (!dbUser) {
          const userByEmail = await findUserByEmail(user.email);
          if (userByEmail) {
            if (userByEmail.id !== githubNumericId) {
              console.warn(`SignIn: User with email ${user.email} found with ID ${userByEmail.id}, but GitHub Numeric ID is ${githubNumericId}. The record will be updated/re-keyed to use GitHub Numeric ID.`);
            }
          }
        }
        
        console.log(`SignIn: Upserting user with GitHub Numeric ID: ${githubNumericId}`);
        const { rowsAffected } = await execute(
          'INSERT INTO users (id, name, email, image, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now")) ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email, image = excluded.image, updated_at = datetime("now")',
          [githubNumericId, user.name ?? profile.login ?? null, user.email, user.image ?? profile.avatar_url ?? null]
        );
        console.log(`SignIn: Upsert result for ${githubNumericId}, rowsAffected: ${rowsAffected}`);

        user.id = githubNumericId;
        
        return true;
      } catch (error) {
        console.error('Error during sign in with GitHub Numeric ID:', error);
        return false;
      }
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);

// Ensure this file doesn't execute in Edge Runtime
export const runtime = 'nodejs';