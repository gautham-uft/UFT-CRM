import { NextResponse } from "next/server";
import { getPgRepository } from "@/lib/data/pg";
import { denyIfUnauthorized } from "../_guard";

// Seam B — Data API: whole-database snapshot/load. Guarded by INTERNAL_API_KEY.
export const dynamic = "force-dynamic";

const repo = getPgRepository();

// GET /api/internal/v1/data/db — full snapshot
export async function GET(req: Request) {
  const denied = denyIfUnauthorized(req); if (denied) return denied;
  return NextResponse.json(await repo.snapshot());
}

// PUT /api/internal/v1/data/db — overwrite the whole working database
export async function PUT(req: Request) {
  const denied = denyIfUnauthorized(req); if (denied) return denied;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Expected a database object" }, { status: 400 });
  }
  return NextResponse.json(await repo.load(body as Record<string, unknown>));
}
