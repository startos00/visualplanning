import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-pdf-highlighter creates React roots on highlight-layer DOM nodes.
  // In React StrictMode (dev double-mount), those roots can be created twice and trigger:
  // "createRoot() on a container that has already been passed to createRoot()".
  // Disabling StrictMode avoids the dev-only warning and prevents duplicate root creation.
  reactStrictMode: false,
  // Turbopack can infer the wrong workspace root if there are other lockfiles
  // elsewhere on disk. Pin it to this project directory to avoid module
  // resolution oddities in dev/build.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
