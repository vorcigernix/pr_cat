import { z } from 'zod';

// Define the environment schema
const envSchema = z.object({
  // Database
  TURSO_URL: z.string().url().min(1, "TURSO_URL is required"),
  TURSO_TOKEN: z.string().min(1, "TURSO_TOKEN is required"),
  TURSO_POOL_SIZE: z.string().regex(/^\d+$/).optional(),
  
  // GitHub OAuth
  GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required"),
  GITHUB_CLIENT_SECRET: z.string().min(1, "GITHUB_CLIENT_SECRET is required"),
  
  // GitHub App
  GITHUB_APP_ID: z.string().min(1, "GITHUB_APP_ID is required"),
  GITHUB_APP_PRIVATE_KEY: z.string().min(1, "GITHUB_APP_PRIVATE_KEY is required"),
  // If you don't use a separate webhook secret, we will fallback to GITHUB_CLIENT_SECRET at runtime
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_GITHUB_APP_SLUG: z.string().min(1, "GitHub App slug is required"),
  
  // NextAuth
  NEXTAUTH_URL: z.string().url().min(1, "NEXTAUTH_URL is required"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  
  // App Configuration
  APP_URL: z.string().url().min(1, "APP_URL is required"),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),
  
  // AI Configuration (optional)
  AI_PROVIDER: z.enum(['openai', 'anthropic', 'google', 'none']).optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
});

type EnvSchema = z.infer<typeof envSchema>;

// Validate environment variables
export function validateEnv(): EnvSchema {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => err.path.join('.')).join(', ');
      console.error('❌ Environment validation failed:');
      console.error(`Missing or invalid variables: ${missingVars}`);
      error.errors.forEach(err => {
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