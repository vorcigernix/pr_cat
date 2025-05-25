import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

export default auth(async (req) => {
  const isAuth = !!req.auth;
  const { pathname } = req.nextUrl;
  const isProduction = req.nextUrl.hostname === 'prcat.vercel.app';
  
  // If running on production, check organization access
  if (isProduction && pathname.startsWith('/dashboard') && pathname !== '/dashboard/help') {
    if (!isAuth) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
    
    try {
      // Check if user belongs to any organization with production access
      const userOrgsWithAccess = await query(`
        SELECT o.production_access 
        FROM organizations o
        JOIN user_organizations uo ON o.id = uo.organization_id
        WHERE uo.user_id = ? AND o.production_access = 1
        LIMIT 1
      `, [req.auth?.user?.id]);
      
      if (userOrgsWithAccess.length === 0) {
        return NextResponse.redirect(new URL('/dashboard/help', req.url));
      }
    } catch (error) {
      console.error('Production access check failed:', error);
      return NextResponse.redirect(new URL('/dashboard/help', req.url));
    }
  }
  
  // If user tries to access sign-up, redirect to sign-in
  if (pathname.startsWith('/sign-up')) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }
  
  // If authenticated user tries to access signin page, redirect to dashboard
  if (isAuth && pathname.startsWith('/sign-in')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 