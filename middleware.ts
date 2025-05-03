import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const isAuth = !!req.auth;
  const { pathname } = req.nextUrl;
  
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