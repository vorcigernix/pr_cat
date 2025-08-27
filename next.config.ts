import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  /* config options here */
  
  // External packages that should be bundled with server components
  serverExternalPackages: ['@libsql/client'],
  
  // Set default runtime
  experimental: {
    // Note: Edge is already the default in Next.js 15
    // Only specify runtime options that differ from defaults
    ppr: 'incremental',
  },
};

export default nextConfig;
