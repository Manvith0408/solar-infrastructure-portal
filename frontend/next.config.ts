import type { NextConfig } from "next";

const isStaticExport = process.env.STATIC_EXPORT === 'true' || process.env.OUTPUT_EXPORT === 'true';

const backendUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:5000";
const cleanBackendUrl = backendUrl.replace(/\/api\/?$/, "");

const nextConfig: NextConfig = {
  // @ts-ignore Next.js 16 AI agent rules toggle
  agentRules: false,
  ...(isStaticExport
    ? { output: 'export' as const }
    : {
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: `${cleanBackendUrl}/api/:path*`
            }
          ];
        }
      })
};

export default nextConfig;
