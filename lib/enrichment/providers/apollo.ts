// Apollo.io adapter — organization enrichment + people search to find the
// hiring/HR point of contact by job title. Best provider for the recruitment
// use case. Note: Apollo masks emails ("email_not_unlocked@…") unless the plan
// has unlock credits — we drop masked values and keep name/title/LinkedIn.
//
// Docs: https://docs.apollo.io/reference/organization-enrichment
//       https://docs.apollo.io/reference/people-search
import type { EnrichInput, EnrichmentProvider, EnrichedPOC, EnrichmentCompany, ProviderOutput } from "../types";

const KEY = process.env.APOLLO_API_KEY;

// Default titles tuned for a manpower/recruitment use case: who decides hiring.
const DEFAULT_TITLES = [
  "Human Resources", "HR Manager", "Talent Acquisition", "Recruiter",
  "Hiring Manager", "Head of HR", "Founder", "CEO", "Director",
];

const BASE = "https://api.apollo.io/api/v1";

function headers() {
  return { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": KEY ?? "" };
}

// Turn an Apollo error response into a clear message. API_INACCESSIBLE means the
// endpoint isn't on the key's plan (Apollo gates all API access behind paid plans).
async function readApolloError(r: Response): Promise<string> {
  const body = await r.json().catch(() => null);
  if (body?.error_code === "API_INACCESSIBLE") {
    return "Apollo API not accessible on this plan — a paid Apollo plan is required for API access.";
  }
  return `Apollo ${r.status}: ${body?.error || "check APOLLO_API_KEY / plan access"}`;
}

type ApolloOrg = {
  name?: string; primary_domain?: string; website_url?: string; industry?: string;
  estimated_num_employees?: number; city?: string; state?: string; country?: string;
  short_description?: string;
};
type ApolloPerson = {
  name?: string; first_name?: string; last_name?: string; title?: string;
  email?: string; linkedin_url?: string;
};

export const apollo: EnrichmentProvider = {
  name: "apollo",
  isConfigured: () => !!KEY,

  async enrich({ domain, company_name, titles }: EnrichInput): Promise<ProviderOutput> {
    if (!KEY) return {};

    let company: Partial<EnrichmentCompany> | undefined;

    // 1) Organization enrichment (needs a domain).
    if (domain) {
      const r = await fetch(
        `${BASE}/organizations/enrich?domain=${encodeURIComponent(domain)}`,
        { method: "POST", headers: headers() },
      );
      if (r.ok) {
        const j = await r.json().catch(() => null);
        const o: ApolloOrg | undefined = j?.organization;
        if (o) {
          const location = [o.city, o.state, o.country].filter(Boolean).join(", ");
          company = {
            name:        o.name || undefined,
            domain:      o.primary_domain || domain,
            industry:    o.industry || undefined,
            size:        o.estimated_num_employees ? String(o.estimated_num_employees) : undefined,
            website:     o.website_url || undefined,
            location:    location || undefined,
            description: o.short_description || undefined,
          };
        }
      } else {
        throw new Error(await readApolloError(r));
      }
    }

    // 2) People search by title at the organization.
    const body: Record<string, unknown> = {
      page: 1,
      per_page: 10,
      person_titles: titles?.length ? titles : DEFAULT_TITLES,
    };
    if (domain) body.q_organization_domains = domain;
    else if (company_name) body.q_organization_name = company_name;

    const pr = await fetch(`${BASE}/mixed_people/search`, {
      method: "POST", headers: headers(), body: JSON.stringify(body),
    });

    let pocs: EnrichedPOC[] = [];
    if (pr.ok) {
      const j = await pr.json().catch(() => null);
      const people: ApolloPerson[] = j?.people ?? [];
      pocs = people.map((p) => {
        const email = typeof p.email === "string" && !p.email.includes("email_not_unlocked") ? p.email : undefined;
        return {
          name:     p.name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown",
          title:    p.title || undefined,
          email,
          linkedin: p.linkedin_url || undefined,
          source:   "apollo",
        };
      });
    } else {
      throw new Error(await readApolloError(pr));
    }

    return { company, pocs };
  },
};
