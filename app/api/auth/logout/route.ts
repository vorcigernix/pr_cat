import { signOut } from "@/auth";
import { NextRequest } from "next/server";

// Validate callback URL to prevent open redirect attacks
function isValidCallbackUrl(url: string): boolean {
  try {
    // Allow relative URLs (starting with /)
    if (url.startsWith('/')) {
      return true;
    }
    
    // For absolute URLs, check if they're from the same origin
    const parsedUrl = new URL(url);
    const currentOrigin = process.env.NEXTAUTH_URL || process.env.VERCEL_URL;
    
    if (currentOrigin) {
      const currentParsedUrl = new URL(currentOrigin);
      return parsedUrl.origin === currentParsedUrl.origin;
    }
    
    // If we can't determine the current origin, only allow relative URLs
    return false;
  } catch {
    // Invalid URL format
    return false;
  }
}

export async function GET(request: NextRequest) {
  // Extract the callback URL from the request (default to '/')
  const searchParams = request.nextUrl.searchParams;
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  
  // Validate callback URL to prevent open redirect attacks
  const safeCallbackUrl = isValidCallbackUrl(callbackUrl) ? callbackUrl : "/";
  
  if (callbackUrl !== safeCallbackUrl) {
    console.warn(`SignOut: Invalid callback URL blocked: ${callbackUrl}`);
  }
  
  // Call the NextAuth signOut function to destroy the session
  return signOut({ redirectTo: safeCallbackUrl });
} 