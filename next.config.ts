import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't let ESLint warnings/errors block the production build (Vercel). Type
  // errors are still enforced via `next build`, and `npm run lint` still runs
  // locally. This keeps demo deploys green without refactoring pre-existing
  // lint findings.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
