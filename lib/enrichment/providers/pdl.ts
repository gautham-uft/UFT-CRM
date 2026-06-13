// People Data Labs adapter — company enrichment + person search by title.
// Strong global + India coverage. Single API key.
//
// Docs: https://docs.peopledatalabs.com/docs/company-enrichment-api
//       https://docs.peopledatalabs.com/docs/person-search-api
import type { EnrichInput, EnrichmentProvider, EnrichedPOC, EnrichmentCompany, ProviderOutput } from "../types";

const KEY = process.env.PDL_API_KEY;

const DEFAULT_TITLE_TERMS = ["human resources", "talent acquisition", "recruiter", "hiring", "founder", "ceo"];

type PDLCompany = {
  name?: string; website?: string; industry?: string; size?: string;
  location?: { name?: string }; summary?: string;
};
type PDLPerson = {
  full_name?: string; job_title?: string; linkedin_url?: string;
  work_email?: string; emails?: { address?: string }[];
  mobile_phone?: string; phone_numbers?: string[];
};

export const pdl: EnrichmentProvider = {
  name: "pdl",
  isConfigured: () => !!KEY,

  async enrich({ domain, company_name, titles }: EnrichInput): Promise<ProviderOutput> {
    if (!KEY) return {};
    const auth = { "X-Api-Key": KEY };

    let company: Partial<EnrichmentCompany> | undefined;

    // 1) Company enrichment (by website/domain, else by name).
    const cq = domain ? `website=${encodeURIComponent(domain)}` : company_name ? `name=${encodeURIComponent(company_name)}` : "";
    if (cq) {
      const r = await fetch(`https://api.peopledatalabs.com/v5/company/enrich?${cq}`, { headers: auth });
      if (r.ok) {
        const o: PDLCompany = await r.json().catch(() => ({}));
        if (o && o.name) {
          company = {
            name:        o.name || undefined,
            domain:      o.website || domain,
            industry:    o.industry || undefined,
            size:        o.size || undefined,
            website:     o.website ? `https://${o.website}` : undefined,
            location:    o.location?.name || undefined,
            description: o.summary || undefined,
          };
        }
      } else if (r.status === 401) {
        throw new Error("PDL 401: check PDL_API_KEY");
      }
    }

    // 2) Person search by title at the company (SQL interface).
    const titleTerms = (titles?.length ? titles : DEFAULT_TITLE_TERMS).map(t => t.toLowerCase());
    const titleClause = titleTerms.map(t => `job_title LIKE '%${t.replace(/'/g, "")}%'`).join(" OR ");
    const companyClause = domain
      ? `job_company_website='${domain.replace(/'/g, "")}'`
      : company_name ? `job_company_name='${company_name.replace(/'/g, "")}'` : "";

    let pocs: EnrichedPOC[] = [];
    if (companyClause) {
      const sql = `SELECT * FROM person WHERE ${companyClause} AND (${titleClause})`;
      const r = await fetch("https://api.peopledatalabs.com/v5/person/search", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ sql, size: 10 }),
      });
      if (r.ok) {
        const j = await r.json().catch(() => null);
        const people: PDLPerson[] = j?.data ?? [];
        pocs = people.map((p) => ({
          name:     p.full_name || "Unknown",
          title:    p.job_title || undefined,
          email:    p.work_email || p.emails?.[0]?.address || undefined,
          phone:    p.mobile_phone || p.phone_numbers?.[0] || undefined,
          linkedin: p.linkedin_url ? (p.linkedin_url.startsWith("http") ? p.linkedin_url : `https://${p.linkedin_url}`) : undefined,
          source:   "pdl",
        }));
      } else if (r.status === 401) {
        throw new Error("PDL 401: check PDL_API_KEY");
      }
    }

    return { company, pocs };
  },
};
