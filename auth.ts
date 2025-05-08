import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { NextAuthConfig } from "next-auth"
import { findUserByEmail, createUser, updateUser, getUserOrganizations } from "@/lib/repositories/user-repository"
import { createGitHubClient } from "@/lib/github"
import type { JWT } from "next-auth/jwt"

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
      if (token && session.user && token.sub) {
        // Basic user data from token
        session.user.id = token.sub;
        session.user.login = token.login;
        session.user.html_url = token.html_url;
        session.user.avatar_url = token.avatar_url;
        
        // Store the access token for GitHub API calls
        if (token.accessToken) {
          session.accessToken = token.accessToken as string;
          
          try {
            // Create GitHub client and fetch organizations
            const githubClient = createGitHubClient(session.accessToken);
            
            // First get organizations from database
            session.organizations = await getUserOrganizations(session.user.id);
            
            // If we have access token, fetch and sync organizations from GitHub
            if (session.organizations.length === 0) {
              const githubOrgs = await githubClient.getUserOrganizations();
              
              // We'll let the API endpoint handle syncing to DB when accessed
              // This just gives immediate access to org data in session
              session.organizations = githubOrgs.map(org => ({
                id: 0, // Temporary ID since not yet in DB
                github_id: org.id,
                name: org.login,
                avatar_url: org.avatar_url,
              }));
            }
          } catch (error) {
            console.error("Error fetching GitHub organizations:", error);
          }
        }
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      // Save extra info from GitHub profile to the token
      if (account && profile) {
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
      if (!user.email || !user.id) {
        return false;
      }

      try {
        // Check if user exists
        const dbUser = await findUserByEmail(user.email);
        
        if (!dbUser) {
          // Create new user
          await createUser({
            id: user.id,
            name: user.name ?? null,
            email: user.email,
            image: user.image ?? null,
          });
        } else if (dbUser.id !== user.id) {
          // User exists with this email but has a different ID
          // This is a common case with OAuth providers where IDs can change
          console.log('User exists with different ID. Database ID:', dbUser.id, 'Auth ID:', user.id);
          
          // Simply update the existing user with new information
          // We'll continue using the database's existing ID
          await updateUser(dbUser.id, {
            name: user.name ?? null,
            image: user.image ?? null,
          });
          
          // IMPORTANT: Override the user ID to match our database
          // This keeps our app consistent with our database
          user.id = dbUser.id;
        } else {
          // Update existing user information
          await updateUser(user.id, {
            name: user.name ?? null,
            image: user.image ?? null,
          });
        }
        
        return true;
      } catch (error) {
        console.error('Error during sign in:', error);
        return false;
      }
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);

// Ensure this file doesn't execute in Edge Runtime
export const runtime = 'nodejs';