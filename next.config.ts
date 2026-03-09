import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/21Cloud-Dashboard",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
