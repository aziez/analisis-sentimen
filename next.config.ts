import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Packages that should NOT be bundled — resolved at runtime on the server
  serverExternalPackages: ["@xenova/transformers", "vader-sentiment", "sentiment"],

  // Use Turbopack (Next.js 16 default) — no webpack config needed
  turbopack: {},
};

export default nextConfig;

