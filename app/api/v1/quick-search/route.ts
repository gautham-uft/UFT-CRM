import { NextResponse } from "next/server";
import { enrichLead, configuredProviders } from "@/lib/core/enrichment";
import { fetchJobs, configuredJobsProviders } from "@/lib/core/jobs";
import { getRepository } from "@/lib/data";
import { loadSettings, enabledEnrichmentProviders } from "@/lib/core/settings";

// Seam A — Application API (v1): Quick Tab search = company profile + contacts
// (enrichment) AND job postings (jobs), in parallel. Thin controller → core.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const { company_name, domain, location } = body as { company_name?: string; domain?: string; location?: string };
  if (!company_name && !domain) return NextResponse.json({ error: "Provide a company name." }, { status: 400 });

  const settings = await loadSettings(getRepository());
  const enabledEnrich = enabledEnrichmentProviders(settings);
  const jobsEnabled = settings.enrichment.serpapi;
  const enrichmentAvailable = configuredProviders(enabledEnrich);
  const jobsAvailable = configuredJobsProviders(jobsEnabled);
  if (enrichmentAvailable.length === 0 && jobsAvailable.length === 0) {
    return NextResponse.json(
      { error: "No data providers are enabled & configured. Enable vendors in the Admin Panel and add their keys (APOLLO/HUNTER/PDL, SERPAPI) to .env.local." },
      { status: 503 },
    );
  }

  const [enrichment, jobsResult] = await Promise.all([
    enrichmentAvailable.length ? enrichLead({ company_name, domain }, { enabled: enabledEnrich }) : Promise.resolve(null),
    jobsAvailable.length && company_name ? fetchJobs({ company_name, location }, { enabled: jobsEnabled }) : Promise.resolve(null),
  ]);

  return NextResponse.json({
    company: enrichment?.company ?? { name: company_name, domain },
    pocs: enrichment?.pocs ?? [],
    jobs: jobsResult?.jobs ?? [],
    enrichment: enrichment
      ? { providers_used: enrichment.providers_used, providers_available: enrichment.providers_available, provider_errors: enrichment.provider_errors }
      : { providers_used: [], providers_available: enrichmentAvailable },
    jobs_meta: jobsResult
      ? { providers_used: jobsResult.providers_used, providers_available: jobsResult.providers_available, provider_errors: jobsResult.provider_errors }
      : { providers_used: [], providers_available: jobsAvailable },
  });
}
