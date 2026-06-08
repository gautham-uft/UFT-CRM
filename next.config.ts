import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Expose a client-visible flag for "direct cloud" data mode. On Vercel
  // (VERCEL=1 at build) the app reads/writes the JSONBin cloud directly per
  // request instead of using the browser's offline cache — so a hosted, shared
  // deployment always reflects live data. Locally it stays offline-first (fast).
  // Override by setting NEXT_PUBLIC_DIRECT_DB explicitly ("1" / "").
  env: {
    NEXT_PUBLIC_DIRECT_DB: process.env.NEXT_PUBLIC_DIRECT_DB ?? (process.env.VERCEL ? "1" : ""),
  },
};

export default nextConfig;
