import { NextResponse } from "next/server";
import { getOne, updateOne, deleteOne, isCollection } from "@/lib/db";

type Ctx = { params: Promise<{ collection: string; id: string }> };

// GET /api/leads/:id
export async function GET(_req: Request, ctx: Ctx) {
  const { collection, id } = await ctx.params;
  if (!isCollection(collection)) {
    return NextResponse.json({ error: `Unknown collection: ${collection}` }, { status: 404 });
  }
  const row = await getOne(collection, id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

// PATCH /api/leads/:id  (partial update)
export async function PATCH(req: Request, ctx: Ctx) {
  const { collection, id } = await ctx.params;
  if (!isCollection(collection)) {
    return NextResponse.json({ error: `Unknown collection: ${collection}` }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const updated = await updateOne(collection, id, body as Record<string, unknown>);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

// DELETE /api/leads/:id
export async function DELETE(_req: Request, ctx: Ctx) {
  const { collection, id } = await ctx.params;
  if (!isCollection(collection)) {
    return NextResponse.json({ error: `Unknown collection: ${collection}` }, { status: 404 });
  }
  const ok = await deleteOne(collection, id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
