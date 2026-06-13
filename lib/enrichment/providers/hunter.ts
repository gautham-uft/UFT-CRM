// Hunter.io adapter — finds email addresses (and their owners' names/titles)
// associated with a company DOMAIN. Domain-dependent: skips if no domain given.
// Docs: https://hunter.io/api-documentation/v2#domain-search
import type { EnrichInput, EnrichmentProvider, EnrichedPOC, ProviderOutput } from "../types";

const KEY = process.env.HUNTER_API_KEY;

type HunterEmail = {
  value?: string; first_name?: string; last_name?: string;
  position?: string; linkedin?: string; confidence?: number;
};

export const hunter: EnrichmentProvider = {
  name: "hunter",
  isConfigured: () => !!KEY,

  async enrich({ domain }: EnrichInput): Promise<ProviderOutput> {
    if (!KEY || !domain) return {};

    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=10&api_key=${KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`Hunter ${res.status}: ${msg.slice(0, 200)}`);
    }
    const json = await res.json().catch(() => null);
    const d = json?.data;
    if (!d) return {};

    const location = [d.city, d.state, d.country].filter(Boolean).join(", ");
    const pocs: EnrichedPOC[] = (d.emails ?? []).map((e: HunterEmail) => ({
      name:       [e.first_name, e.last_name].filter(Boolean).join(" ") || (e.value ?? "Unknown"),
      title:      e.position || undefined,
      email:      e.value || undefined,
      linkedin:   e.linkedin || undefined,
      confidence: typeof e.confidence === "number" ? e.confidence : undefined,
      source:     "hunter",
    }));

    return {
      company: {
        name:     d.organization || undefined,
        domain:   d.domain || domain,
        industry: d.industry || undefined,
        website:  d.domain ? `https://${d.domain}` : undefined,
        location: location || undefined,
      },
      pocs,
    };
  },
};
