import { NextResponse } from "next/server";
import { enrichLead, configuredProviders } from "@/lib/enrichment";

// Real-time lead/company enrichment. Reads from whichever providers have an API
// key set (APOLLO_API_KEY, HUNTER_API_KEY, PDL_API_KEY) and merges the results.
// Server-only: keys never reach the browser.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const available = configuredProviders();
  if (available.length === 0) {
    return NextResponse.json(
      { error: "No enrichment provider configured. Add APOLLO_API_KEY, HUNTER_API_KEY, or PDL_API_KEY to .env.local (see .env.example)." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { company_name, domain, titles } = body as { company_name?: string; domain?: string; titles?: string[] };
  if (!company_name && !domain) {
    return NextResponse.json({ error: "Provide at least a company_name or domain." }, { status: 400 });
  }

  try {
    const result = await enrichLead({ company_name, domain, titles });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || "Enrichment failed." }, { status: 500 });
  }
}
