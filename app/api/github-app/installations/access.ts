import type { Session } from 'next-auth';
import type { InstallationInfo } from '@/lib/core/ports/github-app.port';
import { GitHubClient } from '@/lib/github';
import { getUserOrganizations } from '@/lib/repositories/user-repository';

export async function accessibleInstallations(installations: InstallationInfo[], session: Session): Promise<InstallationInfo[]> {
  const organizations = await getUserOrganizations(session.user.id);
  const organizationIds = new Set(organizations.map(org => org.github_id));
  const candidates = installations.filter(installation => installation.account.type === 'Organization');
  const accessibleIds = new Set(candidates.filter(installation => organizationIds.has(installation.account.id)).map(installation => installation.id));
  if (session.accessToken && candidates.some(installation => !accessibleIds.has(installation.id))) {
    // A newly installed app may not have local membership yet. Confirm access with the user's token.
    const client = new GitHubClient(session.accessToken);
    try {
      const githubOrganizationIds = new Set<number>();
      for (let page = 1; ; page++) {
        const organizations = await client.getUserOrganizations(page);
        organizations.forEach(org => githubOrganizationIds.add(org.id));
        if (organizations.length < 100) break;
      }
      for (let page = 1; ; page++) {
        const response = await client.octokitClient.apps.listInstallationsForAuthenticatedUser({ page, per_page: 100 });
        response.data.installations.forEach(installation => {
          if (installation.account && githubOrganizationIds.has(installation.account.id)) accessibleIds.add(installation.id);
        });
        if (response.data.installations.length < 100) break;
      }
    } catch (error) {
      const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
      if (status !== 401 && status !== 403) throw error;
    }
  }
  return candidates.filter(installation => accessibleIds.has(installation.id));
}
