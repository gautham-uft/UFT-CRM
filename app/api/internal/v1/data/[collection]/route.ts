import { NextResponse } from "next/server";
import { isCollection } from "@/lib/contracts/collections";
import { getPgRepository } from "@/lib/data/pg";
import { denyIfUnauthorized } from "../_guard";

// Seam B — Data API: collection-level operations. Backed directly by Postgres
// (this IS the data service). Guarded by INTERNAL_API_KEY.
export const dynamic = "force-dynamic";

const repo = getPgRepository();

// GET /api/internal/v1/data/:collection — list
export async function GET(req: Request, ctx: { params: Promise<{ collection: string }> }) {
  const denied = denyIfUnauthorized(req); if (denied) return denied;
  const { collection } = await ctx.params;
  if (!isCollection(collection)) return NextResponse.json({ error: `Unknown collection: ${collection}` }, { status: 404 });
  return NextResponse.json(await repo.list(collection));
}

// POST /api/internal/v1/data/:collection — create
export async function POST(req: Request, ctx: { params: Promise<{ collection: string }> }) {
  const denied = denyIfUnauthorized(req); if (denied) return denied;
  const { collection } = await ctx.params;
  if (!isCollection(collection)) return NextResponse.json({ error: `Unknown collection: ${collection}` }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  return NextResponse.json(await repo.create(collection, body as Record<string, unknown>), { status: 201 });
}

// PUT /api/internal/v1/data/:collection — replace entire collection
export async function PUT(req: Request, ctx: { params: Promise<{ collection: string }> }) {
  const denied = denyIfUnauthorized(req); if (denied) return denied;
  const { collection } = await ctx.params;
  if (!isCollection(collection)) return NextResponse.json({ error: `Unknown collection: ${collection}` }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!Array.isArray(body)) return NextResponse.json({ error: "Expected an array of rows" }, { status: 400 });
  return NextResponse.json(await repo.replace(collection, body));
}
