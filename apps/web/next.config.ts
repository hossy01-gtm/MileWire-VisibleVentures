import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Turbopack's minifier rewrites a binary string inside Cesium into a
    // template literal containing an octal escape, which is a SyntaxError in
    // the browser and stops the 3D view from mounting.
    turbopackMinify: false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
