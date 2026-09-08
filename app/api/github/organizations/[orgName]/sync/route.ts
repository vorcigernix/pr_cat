import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { findUserById } from "@/lib/repositories";
import { syncSingleOrganizationRepositories } from "@/lib/services/github-service";
import { findOrganizationByNameAndUser } from "@/lib/repositories/organization-repository";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgName: string }> }
) {
  const { orgName } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!orgName) {
    return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
  }

  try {
    const user = await findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const organization = await findOrganizationByNameAndUser(orgName, user.id);
    if (!organization) {
      return NextResponse.json({ error: `Organization '${orgName}' not found or not accessible by user.` }, { status: 404 });
    }

    // We need the GitHub App installation ID for this organization to act on its behalf
    if (!organization.installation_id) {
        return NextResponse.json({ error: `GitHub App not installed or installation ID missing for ${orgName}`}, { status: 403 });
    }

    const syncResult = await syncSingleOrganizationRepositories(organization.installation_id, organization.name, organization.id);

    return NextResponse.json({ 
      message: syncResult.errors.length > 0 ? `Sync incomplete for ${orgName}.` : `Synchronized repositories for ${orgName}.`,
      errors: syncResult.errors,
      syncedRepositories: syncResult.syncedCount,
      newRepositories: syncResult.newCount,
      updatedRepositories: syncResult.updatedCount,
    }, { status: syncResult.errors.length > 0 ? 502 : 200 });

  } catch (error) {
    console.error(`Error syncing repositories for organization ${orgName}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during organization sync";
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 