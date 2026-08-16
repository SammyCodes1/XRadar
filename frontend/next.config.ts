import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ["@xradar/shared"],
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.resolve(frontendRoot, ".."),
  },
};

export default nextConfig;
