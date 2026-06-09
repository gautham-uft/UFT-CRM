// Enrichment orchestrator. Runs every CONFIGURED provider in parallel, then
// merges their output into one result:
//   • company  — fields filled in provider-priority order (first non-empty wins)
//   • pocs     — concatenated and de-duplicated (by email, else name+title)
// Add a provider's API key to .env.local and it activates automatically.
import type { EnrichInput, EnrichmentResult, EnrichmentCompany, EnrichedPOC, EnrichmentProvider } from "./types";
import { apollo } from "./providers/apollo";
import { hunter } from "./providers/hunter";
import { pdl } from "./providers/pdl";

// Priority order for filling company fields (best company data first).
const PROVIDERS: EnrichmentProvider[] = [apollo, pdl, hunter];

export function configuredProviders(): string[] {
  return PROVIDERS.filter(p => p.isConfigured()).map(p => p.name);
}

// Coerce a provider's POC to safe types (providers occasionally return numbers
// or objects where we expect strings).
function normalizePoc(p: EnrichedPOC): EnrichedPOC {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  return {
    name:       str(p.name) ?? "Unknown",
    title:      str(p.title),
    email:      str(p.email),
    linkedin:   str(p.linkedin),
    confidence: typeof p.confidence === "number" ? p.confidence : undefined,
    source:     str(p.source) ?? "unknown",
  };
}

function mergeCompany(base: EnrichmentCompany, incoming?: Partial<EnrichmentCompany>): EnrichmentCompany {
  if (!incoming) return base;
  const out = { ...base };
  (Object.keys(incoming) as (keyof EnrichmentCompany)[]).forEach((k) => {
    if (!out[k] && incoming[k]) out[k] = incoming[k];
  });
  return out;
}

function dedupePocs(pocs: EnrichedPOC[]): EnrichedPOC[] {
  const seen = new Map<string, EnrichedPOC>();
  for (const p of pocs) {
    const email = typeof p.email === "string" ? p.email : "";
    const key = (email || `${p.name ?? ""}|${p.title ?? ""}`).toLowerCase().trim();
    const existing = seen.get(key);
    if (!existing) { seen.set(key, p); continue; }
    // Merge: keep the richer record, prefer one that has an email.
    seen.set(key, {
      ...existing,
      email:      existing.email || p.email,
      title:      existing.title || p.title,
      linkedin:   existing.linkedin || p.linkedin,
      confidence: existing.confidence ?? p.confidence,
      source:     existing.source === p.source ? existing.source : `${existing.source}, ${p.source}`,
    });
  }
  return Array.from(seen.values());
}

// Rank POCs so the most useful "first point of contact" floats to the top:
// has email > has title match > has confidence.
function rankPocs(pocs: EnrichedPOC[]): EnrichedPOC[] {
  const score = (p: EnrichedPOC) =>
    (p.email ? 100 : 0) +
    (p.title ? 30 : 0) +
    (p.confidence ?? 0) / 10 +
    (p.linkedin ? 5 : 0);
  return [...pocs].sort((a, b) => score(b) - score(a));
}

export async function enrichLead(input: EnrichInput): Promise<EnrichmentResult> {
  const active = PROVIDERS.filter(p => p.isConfigured());
  const available = active.map(p => p.name);

  const settled = await Promise.allSettled(active.map(p => p.enrich(input)));

  let company: EnrichmentCompany = {};
  let pocs: EnrichedPOC[] = [];
  const used: string[] = [];
  const errors: Record<string, string> = {};

  settled.forEach((r, i) => {
    const name = active[i].name;
    if (r.status === "rejected") {
      errors[name] = r.reason instanceof Error ? r.reason.message : String(r.reason);
      return;
    }
    const out = r.value;
    const gotData = (out.company && Object.keys(out.company).length > 0) || (out.pocs && out.pocs.length > 0);
    if (gotData) used.push(name);
    company = mergeCompany(company, out.company);
    if (out.pocs?.length) pocs = pocs.concat(out.pocs.map(normalizePoc));
  });

  // Carry the input domain/name through if no provider filled it.
  if (!company.domain && input.domain) company.domain = input.domain;
  if (!company.name && input.company_name) company.name = input.company_name;

  return {
    company,
    pocs: rankPocs(dedupePocs(pocs)),
    providers_used: used,
    providers_available: available,
    ...(Object.keys(errors).length ? { provider_errors: errors } : {}),
  };
}
