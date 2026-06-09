import { NextResponse } from "next/server";
import { createOne } from "@/lib/db";

// Creates a Naukri-verification request for a lead's point of contact and (if
// configured) forwards it to the external uftech.in talent-acquisition module
// via a webhook. The scout later reports back through /api/naukri-callback.
//
// Optional env:
//   SCOUT_WEBHOOK_URL — if set, the request is POSTed here for the TA module.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as Record<string, string | undefined>;
  if (!b.lead_id) {
    return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
  }

  let created;
  try {
    created = await createOne("scoutRequests", {
      lead_id:      b.lead_id,
      lead_name:    b.lead_name ?? "",
      company_name: b.company_name ?? "",
      poc_name:     b.poc_name ?? "",
      poc_title:    b.poc_title ?? "",
      poc_email:    b.poc_email ?? "",
      poc_linkedin: b.poc_linkedin ?? "",
      requested_by: b.requested_by ?? "",
      assigned_to:  b.assigned_to ?? "",
      status:       "pending",
      requested_at: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Could not save the verification request." }, { status: 500 });
  }

  // Optional outbound bridge to the uftech.in TA module. Fire-and-forget: a
  // webhook failure must not fail the request (the in-app scout queue still works).
  const hook = process.env.SCOUT_WEBHOOK_URL;
  if (hook) {
    const base = process.env.APP_BASE_URL?.replace(/\/$/, "")
      || (() => { const h = req.headers; const proto = h.get("x-forwarded-proto") || "http"; const host = h.get("host") || ""; return host ? `${proto}://${host}` : ""; })();
    fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...created,
        // Where the TA module reports its result back to:
        callback_url: base ? `${base}/api/naukri-callback` : undefined,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, request: created });
}
