import { NextResponse } from "next/server";
import { getPgRepository } from "@/lib/data/pg";
import { denyIfUnauthorized } from "../_guard";

// Seam B — Data API: persistent-baseline admin (reset / save).
// Guarded by INTERNAL_API_KEY.
export const dynamic = "force-dynamic";

const repo = getPgRepository();

// GET /api/internal/v1/data/admin — is a persistent baseline configured?
export async function GET(req: Request) {
  const denied = denyIfUnauthorized(req); if (denied) return denied;
  return NextResponse.json({ persistent: await repo.persistentConfigured() });
}

// POST /api/internal/v1/data/admin  { action: "reset" | "save" }
//   reset → clear working, copy persistent → working
//   save  → overwrite persistent with working
export async function POST(req: Request) {
  const denied = denyIfUnauthorized(req); if (denied) return denied;
  if (!(await repo.persistentConfigured())) {
    return NextResponse.json({ error: "Persistent database is not configured." }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const action = body && typeof body === "object" ? (body as { action?: string }).action : undefined;
  try {
    if (action === "reset") await repo.resetFromPersistent();
    else if (action === "save") await repo.saveToPersistent();
    else return NextResponse.json({ error: 'Invalid action. Use "reset" or "save".' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Operation failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, action });
}
