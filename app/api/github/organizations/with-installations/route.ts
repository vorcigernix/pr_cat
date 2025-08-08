import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserWithOrganizations } from '@/lib/auth-context';
import { generateAppJwt } from '@/lib/github-app';
import { Octokit } from '@octokit/rest';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Load organizations from database for this user
    const { organizations } = await getUserWithOrganizations(request as unknown as Request);

    // List GitHub App installations (app-wide), then map to user's orgs by login/name
    const appJwt = await generateAppJwt();
    const appOctokit = new Octokit({ auth: appJwt });
    const { data: installationsData } = await appOctokit.apps.listInstallations();

    const enriched = organizations.map((org: any) => {
      const installation = installationsData.find(
        (install) => install.account && install.account.login.toLowerCase() === org.name.toLowerCase()
      );
      return {
        ...org,
        hasAppInstalled: !!installation,
        installationId: installation?.id ?? null,
      };
    });

    return NextResponse.json({ installations: enriched });
  } catch (error) {
    console.error('Error fetching organizations with installations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations with installation status' },
      { status: 500 }
    );
  }
}


