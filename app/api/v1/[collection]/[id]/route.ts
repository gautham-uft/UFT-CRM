import { NextResponse } from "next/server";
import { isCollection } from "@/lib/contracts/collections";
import { getRepository } from "@/lib/data";

// Seam A — Application API (v1): single-row CRUD. Thin controller → Repository.
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ collection: string; id: string }> };

// GET /api/v1/:collection/:id
export async function GET(_req: Request, ctx: Ctx) {
  const { collection, id } = await ctx.params;
  if (!isCollection(collection)) return NextResponse.json({ error: `Unknown collection: ${collection}` }, { status: 404 });
  const row = await getRepository().get(collection, id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

// PATCH /api/v1/:collection/:id — partial update
export async function PATCH(req: Request, ctx: Ctx) {
  const { collection, id } = await ctx.params;
  if (!isCollection(collection)) return NextResponse.json({ error: `Unknown collection: ${collection}` }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const updated = await getRepository().update(collection, id, body as Record<string, unknown>);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

// DELETE /api/v1/:collection/:id
export async function DELETE(_req: Request, ctx: Ctx) {
  const { collection, id } = await ctx.params;
  if (!isCollection(collection)) return NextResponse.json({ error: `Unknown collection: ${collection}` }, { status: 404 });
  const ok = await getRepository().remove(collection, id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
