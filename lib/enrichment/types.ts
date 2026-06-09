// Shared types for the lead-enrichment layer. Pure types only (no server-only
// imports) so they're safe to use from client components too.

export type EnrichInput = {
  company_name?: string;
  domain?:       string;
  titles?:       string[]; // preferred POC job titles to search for
};

// A point of contact discovered during enrichment.
export type EnrichedPOC = {
  name:        string;
  title?:      string;
  email?:      string;
  linkedin?:   string;
  confidence?: number; // 0-100 when the provider reports it
  source:      string; // which provider surfaced this person
};

export type EnrichmentCompany = {
  name?:        string;
  domain?:      string;
  industry?:    string;
  size?:        string; // employee count or band, e.g. "51-200"
  website?:     string;
  location?:    string;
  description?: string;
};

// What a single provider returns (partial — the orchestrator merges).
export type ProviderOutput = {
  company?: Partial<EnrichmentCompany>;
  pocs?:    EnrichedPOC[];
};

export interface EnrichmentProvider {
  name:         string;
  isConfigured(): boolean;           // true when its API key is present
  enrich(input: EnrichInput): Promise<ProviderOutput>;
}

// The merged result returned by /api/enrich-lead.
export type EnrichmentResult = {
  company:             EnrichmentCompany;
  pocs:                EnrichedPOC[];
  providers_used:      string[];                 // providers that returned data
  providers_available: string[];                 // providers with keys configured
  provider_errors?:    Record<string, string>;   // provider -> error (debugging)
};
