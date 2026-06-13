import { NextResponse } from "next/server";

// Seam A — Application API (v1): optional outbound bridge to the uftech.in
// talent-acquisition module. The scout request itself is stored by the client
// through the normal data layer (useCollection → Seam A → Postgres); this route
// only forwards to SCOUT_WEBHOOK_URL when configured. The TA module reports back
// via /api/naukri-callback.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const hook = process.env.SCOUT_WEBHOOK_URL;
  if (!hook) return NextResponse.json({ ok: true, forwarded: false });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const base = process.env.APP_BASE_URL?.replace(/\/$/, "")
    || (() => { const h = req.headers; const proto = h.get("x-forwarded-proto") || "http"; const host = h.get("host") || ""; return host ? `${proto}://${host}` : ""; })();

  try {
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, callback_url: base ? `${base}/api/naukri-callback` : undefined }),
    });
  } catch {
    return NextResponse.json({ ok: true, forwarded: false });
  }
  return NextResponse.json({ ok: true, forwarded: true });
}
