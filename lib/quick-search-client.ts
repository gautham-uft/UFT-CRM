// Client helper for the Quick Tab search (/api/quick-search).
import type { EnrichedPOC, EnrichmentCompany } from "@/lib/enrichment/types";
import type { JobPosting } from "@/lib/jobs/types";

export type QuickSearchInput = { company_name: string; domain?: string; location?: string };

type ProviderMeta = {
  providers_used:      string[];
  providers_available: string[];
  provider_errors?:    Record<string, string>;
};

export type QuickSearchResult = {
  company:    EnrichmentCompany;
  pocs:       EnrichedPOC[];
  jobs:       JobPosting[];
  enrichment: ProviderMeta;
  jobs_meta:  ProviderMeta;
};

export async function quickSearch(input: QuickSearchInput): Promise<QuickSearchResult> {
  const res = await fetch("/api/quick-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error || `Search failed (${res.status})`);
  }
  return data as QuickSearchResult;
}
