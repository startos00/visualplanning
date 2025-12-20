import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack can infer the wrong workspace root if there are other lockfiles
  // elsewhere on disk. Pin it to this project directory to avoid module
  // resolution oddities in dev/build.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
