import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { RealGitHubAPIService } from '@/lib/infrastructure/adapters/github/real-github.adapter';
import { findOrganizationByNameAndUser } from '@/lib/repositories/organization-repository';


// Use the context object directly with proper typing for Next.js route handler
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgName: string }> }
) {
  const { orgName } = await params;
  
  const session = await auth();
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (!session.accessToken) {
    return NextResponse.json({ error: 'No GitHub access token' }, { status: 400 });
  }
  
  try {
    const organization = await findOrganizationByNameAndUser(orgName, session.user.id);
    if (!organization) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    const page = Number(request.nextUrl.searchParams.get('page') ?? '1');
    if (!Number.isSafeInteger(page) || page < 1) return NextResponse.json({ error: 'Invalid page' }, { status: 400 });
    const client = new RealGitHubAPIService(session.accessToken);
    const repositories = await client.getOrganizationRepositories(organization.name, { page });
    return NextResponse.json({ repositories, errors: [] });
  } catch (error) {
    console.error('GitHub API error:', error);
    return NextResponse.json(
      { error: `Failed to fetch repositories for organization: ${orgName}` }, 
      { status: 500 }
    );
  }
} 