import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

const monorepoRoot = path.resolve(frontendRoot, "..");

const nextConfig: NextConfig = {
  transpilePackages: ["@xradar/shared", "@xradar/services"],
  outputFileTracingRoot: monorepoRoot,
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: monorepoRoot,
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
