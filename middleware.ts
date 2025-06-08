import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth(async (req) => {
  const isAuth = !!req.auth;
  const { pathname } = req.nextUrl;
  const isProduction = req.nextUrl.hostname === 'prcat.vercel.app';
  
  // Handle sign-up redirect (force users to sign-in instead)
  if (pathname.startsWith('/sign-up')) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }
  
  // If authenticated user tries to access signin page, redirect to dashboard
  if (isAuth && pathname.startsWith('/sign-in')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  // Protect dashboard routes
  if (pathname.startsWith('/dashboard') && pathname !== '/dashboard/help') {
    if (!isAuth) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
    
    // On production, check if user has organization access
    // We'll do this check in the component level instead of middleware for better performance
    // The session already contains organization information
    if (isProduction && req.auth?.organizations?.length === 0) {
      return NextResponse.redirect(new URL('/dashboard/help', req.url));
    }
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 