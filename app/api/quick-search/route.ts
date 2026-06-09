import { NextResponse } from "next/server";
import { enrichLead, configuredProviders } from "@/lib/enrichment";
import { fetchJobs, configuredJobsProviders } from "@/lib/jobs";

// Quick Tab backend: given a company (+ optional domain / location), fetch the
// company profile + contacts (enrichment layer: Apollo/Hunter/PDL) AND current
// job postings (jobs layer: SerpAPI). Each half runs only the providers whose
// keys are configured; both halves run in parallel.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { company_name, domain, location } = body as { company_name?: string; domain?: string; location?: string };
  if (!company_name && !domain) {
    return NextResponse.json({ error: "Provide a company name." }, { status: 400 });
  }

  const enrichmentAvailable = configuredProviders();
  const jobsAvailable = configuredJobsProviders();

  if (enrichmentAvailable.length === 0 && jobsAvailable.length === 0) {
    return NextResponse.json(
      { error: "No data providers configured. Add an enrichment key (APOLLO/HUNTER/PDL) and/or a jobs key (SERPAPI) to .env.local." },
      { status: 503 },
    );
  }

  const [enrichment, jobsResult] = await Promise.all([
    enrichmentAvailable.length ? enrichLead({ company_name, domain }) : Promise.resolve(null),
    jobsAvailable.length && company_name ? fetchJobs({ company_name, location }) : Promise.resolve(null),
  ]);

  return NextResponse.json({
    company: enrichment?.company ?? { name: company_name, domain },
    pocs:    enrichment?.pocs ?? [],
    jobs:    jobsResult?.jobs ?? [],
    enrichment: enrichment
      ? { providers_used: enrichment.providers_used, providers_available: enrichment.providers_available, provider_errors: enrichment.provider_errors }
      : { providers_used: [], providers_available: enrichmentAvailable },
    jobs_meta: jobsResult
      ? { providers_used: jobsResult.providers_used, providers_available: jobsResult.providers_available, provider_errors: jobsResult.provider_errors }
      : { providers_used: [], providers_available: jobsAvailable },
  });
}
