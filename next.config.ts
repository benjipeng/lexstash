import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // NOTE: If deploying to a project page (e.g. username.github.io/repo-name),
  // you might need to set basePath: '/repo-name' here.
};

export default nextConfig;
