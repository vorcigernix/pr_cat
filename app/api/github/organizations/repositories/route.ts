import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { RepositoryService } from "@/lib/services/repository-service";
import { findUserById } from "@/lib/repositories";

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  try {
    const user = await findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const orgIdParam = searchParams.get("orgId");

    if (orgIdParam) {
      const organizationId = parseInt(orgIdParam, 10);
      if (isNaN(organizationId)) {
        return NextResponse.json({ error: "Invalid organizationId parameter" }, { status: 400 });
      }
      // This new service method will need to be implemented
      // It should fetch only the specific organization's details and its repositories
      const organizationWithRepos = await RepositoryService.getRepositoriesForSingleOrganization(user.id, organizationId);
      
      if (!organizationWithRepos) {
        return NextResponse.json({ error: "Organization not found or user has no access." }, { status: 404 });
      }
      // Return only the repositories for the specific organization
      return NextResponse.json({ repositories: organizationWithRepos.repositories });

    } else {
      // Original behavior: fetch all organizations with their repositories
      const organizationsWithRepositories = await RepositoryService.getRepositoriesForUserOrganizations(user.id);
      return NextResponse.json({ 
        organizationsWithRepositories 
      });
    }
    
  } catch (error) {
    console.error("Error fetching organization repositories:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error fetching repositories";
    // Check if the error is about the specific method not existing yet (during development)
    if (errorMessage.includes('getRepositoriesForSingleOrganization is not a function')) {
        return NextResponse.json(
            { error: "API endpoint for single organization repositories is under development." }, 
            { status: 501 } // Not Implemented
        );
    }
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  }
} 