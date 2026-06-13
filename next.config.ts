import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the native `pg` driver out of the bundle — it's a server-only Node
  // module loaded by the /api/* route handlers (lib/db.ts).
  serverExternalPackages: ["pg"],
};

export default nextConfig;
