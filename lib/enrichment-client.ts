// Client helper: call the server enrichment route (/api/enrich-lead).
// Throws with a readable message on failure (e.g. no provider configured).
import type { EnrichInput, EnrichmentResult } from "@/lib/enrichment/types";

export async function enrichLeadRequest(input: EnrichInput): Promise<EnrichmentResult> {
  const res = await fetch("/api/enrich-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error || `Enrichment failed (${res.status})`);
  }
  return data as EnrichmentResult;
}
