import { NextResponse } from "next/server";

// Internal Data API guard. Requires the x-internal-key header to match
// INTERNAL_API_KEY. When INTERNAL_API_KEY is unset (pure local dev), the guard
// is disabled so the app works with zero config — set the key to lock it down.
export function denyIfUnauthorized(req: Request): NextResponse | null {
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected) return null; // not configured → open (local dev)
  const got = req.headers.get("x-internal-key");
  if (got === expected) return null;
  return NextResponse.json({ error: "Unauthorized: invalid or missing x-internal-key." }, { status: 401 });
}
