import { EnvironmentConfig } from '@/lib/infrastructure/config/environment';

describe('Environment configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXTAUTH_URL;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
    EnvironmentConfig.getInstance().refresh();
  });

  it.each([
    ['https://app.example.com', undefined, 'https://app.example.com'],
    ['https://app.example.com', 'preview.vercel.app', 'https://app.example.com'],
    [undefined, 'preview.vercel.app', 'https://preview.vercel.app'],
    [undefined, undefined, 'http://localhost:3000'],
  ])('resolves auth URL from explicit %s and deployment %s', (authUrl, deploymentUrl, expected) => {
    if (authUrl) process.env.NEXTAUTH_URL = authUrl;
    if (deploymentUrl) process.env.VERCEL_URL = deploymentUrl;
    const environment = EnvironmentConfig.getInstance();
    environment.refresh();

    expect(environment.config.auth?.url).toBe(expected);
  });

  it('reports the GitHub private key variable that the loader actually reads', () => {
    delete process.env.GITHUB_APP_PRIVATE_KEY;
    const environment = EnvironmentConfig.getInstance();
    environment.refresh();

    expect(environment.getDebugInfo().missingEnvVars).toContain('GITHUB_APP_PRIVATE_KEY');
    expect(environment.getDebugInfo().missingEnvVars).not.toContain('GITHUB_PRIVATE_KEY');
  });
});
