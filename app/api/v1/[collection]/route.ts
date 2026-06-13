import { NextResponse } from "next/server";
import { isCollection } from "@/lib/contracts/collections";
import { getRepository } from "@/lib/data";

// Seam A — Application API (v1): generic collection CRUD for the UI. Thin
// controller → Repository (which reaches Postgres through the Seam B Data API).
export const dynamic = "force-dynamic";

// GET /api/v1/:collection — list
export async function GET(_req: Request, ctx: { params: Promise<{ collection: string }> }) {
  const { collection } = await ctx.params;
  if (!isCollection(collection)) return NextResponse.json({ error: `Unknown collection: ${collection}` }, { status: 404 });
  return NextResponse.json(await getRepository().list(collection));
}

// POST /api/v1/:collection — create
export async function POST(req: Request, ctx: { params: Promise<{ collection: string }> }) {
  const { collection } = await ctx.params;
  if (!isCollection(collection)) return NextResponse.json({ error: `Unknown collection: ${collection}` }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  return NextResponse.json(await getRepository().create(collection, body as Record<string, unknown>), { status: 201 });
}

// PUT /api/v1/:collection — replace entire collection
export async function PUT(req: Request, ctx: { params: Promise<{ collection: string }> }) {
  const { collection } = await ctx.params;
  if (!isCollection(collection)) return NextResponse.json({ error: `Unknown collection: ${collection}` }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!Array.isArray(body)) return NextResponse.json({ error: "Expected an array of rows" }, { status: 400 });
  return NextResponse.json(await getRepository().replace(collection, body));
}
