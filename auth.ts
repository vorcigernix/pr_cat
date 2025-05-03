import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { NextAuthConfig } from "next-auth"

export const config = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
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
    session({ session, token }) {
      if (token && session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);