import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// CORS for the API seam (Next 16 "proxy" convention, formerly middleware).
// When the frontend runs as its own tier (a different origin) it calls this
// server's /api/* across origins, so we reflect the request Origin and answer
// preflight. No cookies are used, so this is safe. In the all-in-one run
// (same origin) these headers are simply harmless.
export function proxy(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "*";
  const cors: Record<string, string> = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-internal-key",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  // Preflight — short-circuit before the route handler.
  if (req.method === "OPTIONS") return new NextResponse(null, { status: 204, headers: cors });

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
}

export const config = { matcher: "/api/:path*" };
