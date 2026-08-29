import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/",                destination: "/simplified" },
        { source: "/start",           destination: "/simplified/start" },
        { source: "/about",           destination: "/simplified/about" },
        { source: "/health",          destination: "/simplified/health" },
        { source: "/children",        destination: "/simplified/children" },
        { source: "/parents",         destination: "/simplified/parents" },
        { source: "/resources",       destination: "/simplified/resources" },
        { source: "/resources/:slug", destination: "/simplified/resources/:slug" },
        { source: "/roadmap",         destination: "/simplified/roadmap" },
        { source: "/profile",         destination: "/simplified/profile" },
      ],
    };
  },
  async redirects() {
    // 307 (temporary) intentionally — switch to permanent: true after a stable week.
    // Keeps rollback clean: any browser that visited /simplified/* before rollback
    // won't have the redirect permanently cached.
    return [
      { source: "/simplified",        destination: "/",      permanent: false },
      { source: "/simplified/:path*", destination: "/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
