import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findUserById } from "@/lib/repositories";
import { syncSingleOrganizationRepositories } from "@/lib/services/github-service";
import { findOrganizationByNameAndUser } from "@/lib/repositories/organization-repository";

interface RouteParams {
  params: {
    orgName: string;
  };
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { orgName } = params;
  if (!orgName) {
    return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
  }

  try {
    const user = await findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the organization by name and ensure user has access (e.g., via user_organizations or GitHub App installation check)
    // This might involve checking if the user has an installation for this org.
    const organization = await findOrganizationByNameAndUser(orgName, user.id);
    if (!organization) {
      return NextResponse.json({ error: `Organization '${orgName}' not found or not accessible by user.` }, { status: 404 });
    }

    // We need the GitHub App installation ID for this organization to act on its behalf
    if (!organization.installation_id) {
        return NextResponse.json({ error: `GitHub App not installed or installation ID missing for ${orgName}`}, { status: 403 });
    }

    // Sync repositories for this specific organization
    // This function will need to use the installation_id to create an authenticated GitHub client
    const syncResult = await syncSingleOrganizationRepositories(organization.installation_id, organization.name, organization.id);

    return NextResponse.json({ 
      message: `Successfully initiated sync for ${orgName}.`,
      syncedRepositories: syncResult.syncedCount, // Example response
      newRepositories: syncResult.newCount,
      updatedRepositories: syncResult.updatedCount,
    });

  } catch (error) {
    console.error(`Error syncing repositories for organization ${orgName}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during organization sync";
    
    if (errorMessage.includes('syncSingleOrganizationRepositories is not a function') || errorMessage.includes('findOrganizationByNameAndUser is not a function')) {
        return NextResponse.json(
            { error: `API endpoint for syncing ${orgName} is under development. Missing service functions.` }, 
            { status: 501 } // Not Implemented
        );
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 