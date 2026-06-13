import { NextResponse } from "next/server";
import { isCollection } from "@/lib/contracts/collections";
import { getPgRepository } from "@/lib/data/pg";
import { denyIfUnauthorized } from "../../_guard";

// Seam B — Data API: single-row operations. Guarded by INTERNAL_API_KEY.
export const dynamic = "force-dynamic";

const repo = getPgRepository();
type Ctx = { params: Promise<{ collection: string; id: string }> };

// GET /api/internal/v1/data/:collection/:id
export async function GET(req: Request, ctx: Ctx) {
  const denied = denyIfUnauthorized(req); if (denied) return denied;
  const { collection, id } = await ctx.params;
  if (!isCollection(collection)) return NextResponse.json({ error: `Unknown collection: ${collection}` }, { status: 404 });
  const row = await repo.get(collection, id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

// PATCH /api/internal/v1/data/:collection/:id — partial update
export async function PATCH(req: Request, ctx: Ctx) {
  const denied = denyIfUnauthorized(req); if (denied) return denied;
  const { collection, id } = await ctx.params;
  if (!isCollection(collection)) return NextResponse.json({ error: `Unknown collection: ${collection}` }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const updated = await repo.update(collection, id, body as Record<string, unknown>);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

// DELETE /api/internal/v1/data/:collection/:id
export async function DELETE(req: Request, ctx: Ctx) {
  const denied = denyIfUnauthorized(req); if (denied) return denied;
  const { collection, id } = await ctx.params;
  if (!isCollection(collection)) return NextResponse.json({ error: `Unknown collection: ${collection}` }, { status: 404 });
  const ok = await repo.remove(collection, id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
