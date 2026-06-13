import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";

// Seam A — Application API (v1): reset / sync between the working and persistent
// databases. Thin controller → Repository admin ops.
export const dynamic = "force-dynamic";

// GET /api/v1/admin/db-sync — is a persistent baseline configured?
export async function GET() {
  return NextResponse.json({ persistent: await getRepository().persistentConfigured() });
}

// POST /api/v1/admin/db-sync { direction: "persistent-to-working" | "working-to-persistent" }
export async function POST(req: Request) {
  const repo = getRepository();
  if (!(await repo.persistentConfigured())) {
    return NextResponse.json({ error: "Persistent database is not configured. Set PERSISTENT_DATABASE_URL in .env.local." }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const direction = body && typeof body === "object" ? (body as { direction?: string }).direction : undefined;
  try {
    if (direction === "persistent-to-working") await repo.resetFromPersistent();
    else if (direction === "working-to-persistent") await repo.saveToPersistent();
    else return NextResponse.json({ error: 'Invalid direction. Use "persistent-to-working" or "working-to-persistent".' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Sync failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, direction });
}
