import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Packages that should NOT be bundled — resolved at runtime on the server
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node", "vader-sentiment", "sentiment"],

  // Explicitly tell Next.js/Vercel to trace and package the native binaries of onnxruntime-node
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/onnxruntime-node/bin/**/*"],
  },

  // Use Turbopack (Next.js 16 default) — no webpack config needed
  turbopack: {},
};

export default nextConfig;

