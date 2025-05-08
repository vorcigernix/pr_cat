import { signOut } from "@/auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // Extract the callback URL from the request (default to '/')
  const searchParams = request.nextUrl.searchParams;
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  
  // Call the NextAuth signOut function to destroy the session
  return signOut({ redirectTo: callbackUrl });
} 