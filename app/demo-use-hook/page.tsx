import { getOrganizationInstallations } from '@/app/api/services/github-orgs';
import { Suspense } from 'react';
import { SettingsContent } from '@/components/settings-content';

// Mark this route as dynamic since it uses headers() via getOrganizationInstallations
export const dynamic = 'force-dynamic';

export default async function UseHookDemoPage() {
  // Fetch data in the server component - don't await
  const organizationsPromise = getOrganizationInstallations();
  
  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">React Use Hook Demo</h1>
        <p className="text-muted-foreground">
          This page demonstrates the React use hook pattern for data fetching.
          The organization data is fetched in a Server Component and streamed to the client.
        </p>
      </div>

      <Suspense fallback={<div>Loading organizations...</div>}>
        <SettingsContent organizationsPromise={organizationsPromise} />
      </Suspense>
    </div>
  );
} 