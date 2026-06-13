// ─────────────────────────────────────────────────────────────────────────
// Core — Scout (Naukri verification) service.
//
// Records a scout's Naukri verdict: updates the scoutRequest, mirrors the
// result onto the lead's profile (naukri_status / naukri_url), and logs an
// activity so the requester sees the outcome. Transport-agnostic (uses a
// Repository).
// ─────────────────────────────────────────────────────────────────────────

import type { Repository } from "@/lib/data/repository";

export type ScoutVerdictInput = {
  request_id: string;
  status: "found" | "not_found";
  naukri_url?: string;
  note?: string;
  responded_by?: string;
};

export class NotFoundError extends Error {}

export async function recordVerdict(repo: Repository, input: ScoutVerdictInput): Promise<void> {
  const { request_id, status, naukri_url, note, responded_by } = input;

  const reqRow = await repo.get("scoutRequests", request_id);
  if (!reqRow) throw new NotFoundError("Verification request not found.");

  const respondedAt = new Date().toISOString();
  await repo.update("scoutRequests", request_id, {
    status, naukri_url: naukri_url ?? "", note: note ?? "",
    responded_at: respondedAt, responded_by: responded_by ?? "",
  });

  // Mirror onto the lead's profile (merge — never clobber the rest of profile).
  const leadId = String(reqRow.lead_id ?? "");
  if (leadId) {
    const lead = await repo.get("leads", leadId);
    if (lead) {
      const profile = (lead.profile && typeof lead.profile === "object" ? lead.profile : {}) as Record<string, unknown>;
      await repo.update("leads", leadId, {
        profile: {
          ...profile,
          naukri_status: status,
          naukri_url: naukri_url ?? profile.naukri_url ?? "",
          last_updated: respondedAt.slice(0, 10),
        },
      });
    }
  }

  await repo.create("activities", {
    user: responded_by || "Scout", entity_type: "lead",
    entity_name: String(reqRow.lead_name ?? "Lead"),
    activity_type: "note",
    description: `Naukri verification: ${status === "found" ? "FOUND" : "NOT FOUND"}${reqRow.poc_name ? ` — ${reqRow.poc_name}` : ""}${reqRow.company_name ? ` @ ${reqRow.company_name}` : ""}${naukri_url ? ` (${naukri_url})` : ""}`,
    created_at: respondedAt,
  }).catch(() => {});
}
