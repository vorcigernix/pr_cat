import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { RepositoryService } from "@/lib/services/repository-service";
import { findUserById } from "@/lib/repositories";

export async function GET() {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  try {
    const user = await findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Use the repository service to get repositories by organization
    const organizationsWithRepositories = await RepositoryService.getRepositoriesForUserOrganizations(user.id);
    
    return NextResponse.json({ 
      organizationsWithRepositories 
    });
    
  } catch (error) {
    console.error("Error fetching organization repositories:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" }, 
      { status: 500 }
    );
  }
} 