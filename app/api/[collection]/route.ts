import { NextResponse } from "next/server";
import { getAll, createOne, replaceAll, isCollection } from "@/lib/db";

// List a collection: GET /api/leads
export async function GET(_req: Request, ctx: { params: Promise<{ collection: string }> }) {
  const { collection } = await ctx.params;
  if (!isCollection(collection)) {
    return NextResponse.json({ error: `Unknown collection: ${collection}` }, { status: 404 });
  }
  return NextResponse.json(await getAll(collection));
}

// Create a row: POST /api/leads
export async function POST(req: Request, ctx: { params: Promise<{ collection: string }> }) {
  const { collection } = await ctx.params;
  if (!isCollection(collection)) {
    return NextResponse.json({ error: `Unknown collection: ${collection}` }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const created = await createOne(collection, body as Record<string, unknown>);
  return NextResponse.json(created, { status: 201 });
}

// Replace an entire collection: PUT /api/roles  (body: array of rows)
export async function PUT(req: Request, ctx: { params: Promise<{ collection: string }> }) {
  const { collection } = await ctx.params;
  if (!isCollection(collection)) {
    return NextResponse.json({ error: `Unknown collection: ${collection}` }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Expected an array of rows" }, { status: 400 });
  }
  const rows = await replaceAll(collection, body);
  return NextResponse.json(rows);
}
