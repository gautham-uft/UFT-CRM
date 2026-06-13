import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { recordVerdict, NotFoundError } from "@/lib/core/scout";

// Records a scout's Naukri verdict for a request (in-app queue + external
// uftech.in TA module). Thin controller → core/scout service.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { request_id, status, naukri_url, note, responded_by } = body as {
    request_id?: string; status?: string; naukri_url?: string; note?: string; responded_by?: string;
  };
  if (!request_id || (status !== "found" && status !== "not_found")) {
    return NextResponse.json({ error: "request_id and status ('found' | 'not_found') are required." }, { status: 400 });
  }

  try {
    await recordVerdict(getRepository(), { request_id, status, naukri_url, note, responded_by });
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
