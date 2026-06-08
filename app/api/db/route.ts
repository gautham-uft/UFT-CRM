import { NextResponse } from "next/server";
import { getDB, putDB } from "@/lib/db";

// Always run on the server and read fresh from the online bin (never cached).
export const dynamic = "force-dynamic";

// GET /api/db — the entire cloud database in one round trip.
export async function GET() {
  return NextResponse.json(await getDB());
}

// PUT /api/db — overwrite the entire cloud database (Local → Cloud sync).
export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Expected a database object" }, { status: 400 });
  }
  const saved = await putDB(body as Record<string, unknown>);
  return NextResponse.json(saved);
}
