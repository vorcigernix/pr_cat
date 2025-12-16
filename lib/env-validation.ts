import { z } from 'zod';

// Define the environment schema
const envSchema = z.object({
  // Database (optional for demo mode)
  TURSO_URL: z.url().optional(),
  TURSO_TOKEN: z.string().optional(),
  TURSO_POOL_SIZE: z.string().regex(/^\d+$/).optional(),
  
  // GitHub OAuth (optional for demo mode)
  GITHUB_OAUTH_CLIENT_ID: z.string().optional(),
  GITHUB_OAUTH_CLIENT_SECRET: z.string().optional(),
  
  // GitHub App (optional for demo mode)
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  // If you don't use a separate webhook secret, we will fallback to GITHUB_OAUTH_CLIENT_SECRET at runtime
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_GITHUB_APP_SLUG: z.string().optional(),
  
  // NextAuth
  NEXTAUTH_URL: z.url().optional(),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters").optional(),
  
  // App Configuration
  APP_URL: z.url().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).prefault('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).prefault('3000'),
  
  // AI Configuration (optional)
  AI_PROVIDER: z.enum(['openai', 'anthropic', 'google', 'none']).optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
});

type EnvSchema = z.infer<typeof envSchema>;

// Generate secure defaults for missing environment variables
function generateDefaults(env: any) {
  const defaults = { ...env };
  
  // Auto-generate NEXTAUTH_SECRET if not provided (for demo mode)
  if (!defaults.NEXTAUTH_SECRET) {
    // Generate a secure 32-byte random string
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    defaults.NEXTAUTH_SECRET = result;
    console.log('🔐 Auto-generated NEXTAUTH_SECRET for demo mode');
  }
  
  // Auto-generate NEXTAUTH_URL and APP_URL based on environment
  if (!defaults.NEXTAUTH_URL) {
    if (process.env.VERCEL_URL) {
      defaults.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
    } else if (process.env.NODE_ENV === 'development') {
      defaults.NEXTAUTH_URL = `http://localhost:${defaults.PORT || 3000}`;
    } else {
      defaults.NEXTAUTH_URL = 'http://localhost:3000';
    }
    console.log(`🌐 Auto-generated NEXTAUTH_URL: ${defaults.NEXTAUTH_URL}`);
  }
  
  if (!defaults.APP_URL) {
    defaults.APP_URL = defaults.NEXTAUTH_URL;
    console.log(`🌐 Auto-generated APP_URL: ${defaults.APP_URL}`);
  }
  
  return defaults;
}

// Validate environment variables
export function validateEnv(): EnvSchema {
  try {
    const processedEnv = generateDefaults(process.env);
    return envSchema.parse(processedEnv);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(err => err.path.join('.')).join(', ');
      console.error('❌ Environment validation failed:');
      console.error(`Missing or invalid variables: ${missingVars}`);
      error.issues.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      
      // In development, provide helpful setup instructions
      if (process.env.NODE_ENV === 'development') {
        console.error('\n📝 To fix this:');
        console.error('1. Copy .env.example to .env.local');
        console.error('2. Fill in the required values');
        console.error('3. Restart the development server\n');
      }
      
      throw new Error('Environment validation failed. Check the logs above.');
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();
