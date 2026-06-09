import { NextResponse } from "next/server";
import { getOne, updateOne, createOne } from "@/lib/db";

// Records a scout's Naukri verdict for a request. Used by BOTH the in-app scout
// queue and (when wired) the external uftech.in TA module reporting back.
// Updates the scoutRequest, mirrors the result onto the lead's profile
// (naukri_status / naukri_url — the fields shown in the Lead Profile tab), and
// logs an activity so the requester sees the outcome.
export const dynamic = "force-dynamic";

type Row = { id: string; [k: string]: unknown };

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

  const reqRow = (await getOne("scoutRequests", request_id)) as Row | undefined;
  if (!reqRow) {
    return NextResponse.json({ error: "Verification request not found." }, { status: 404 });
  }

  const respondedAt = new Date().toISOString();
  await updateOne("scoutRequests", request_id, {
    status, naukri_url: naukri_url ?? "", note: note ?? "", responded_at: respondedAt, responded_by: responded_by ?? "",
  });

  // Mirror onto the lead's profile (merge — never clobber the rest of profile).
  const leadId = String(reqRow.lead_id ?? "");
  if (leadId) {
    const lead = (await getOne("leads", leadId)) as Row | undefined;
    if (lead) {
      const profile = (lead.profile && typeof lead.profile === "object" ? lead.profile : {}) as Record<string, unknown>;
      await updateOne("leads", leadId, {
        profile: {
          ...profile,
          naukri_status: status,                       // "found" | "not_found"
          naukri_url:    naukri_url ?? profile.naukri_url ?? "",
          last_updated:  respondedAt.slice(0, 10),
        },
      });
    }
  }

  await createOne("activities", {
    user: responded_by || "Scout", entity_type: "lead",
    entity_name: String(reqRow.lead_name ?? "Lead"),
    activity_type: "note",
    description: `Naukri verification: ${status === "found" ? "FOUND" : "NOT FOUND"}${reqRow.poc_name ? ` — ${reqRow.poc_name}` : ""}${reqRow.company_name ? ` @ ${reqRow.company_name}` : ""}${naukri_url ? ` (${naukri_url})` : ""}`,
    created_at: respondedAt,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
