import { NextResponse } from "next/server";
import { enrichLead, configuredProviders } from "@/lib/core/enrichment";
import { getRepository } from "@/lib/data";
import { loadSettings, enabledEnrichmentProviders } from "@/lib/core/settings";

// Seam A — Application API (v1): lead/company enrichment. Thin controller →
// core/enrichment (which runs whichever providers have keys configured).
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const settings = await loadSettings(getRepository());
  const enabled = enabledEnrichmentProviders(settings);
  if (configuredProviders(enabled).length === 0) {
    return NextResponse.json(
      { error: "No enrichment provider is enabled & configured. Enable a vendor in the Admin Panel and add its API key (APOLLO/HUNTER/PDL) to .env.local." },
      { status: 503 },
    );
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const { company_name, domain, titles } = body as { company_name?: string; domain?: string; titles?: string[] };
  if (!company_name && !domain) return NextResponse.json({ error: "Provide at least a company_name or domain." }, { status: 400 });

  try {
    return NextResponse.json(await enrichLead({ company_name, domain, titles }, { enabled }));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || "Enrichment failed." }, { status: 500 });
  }
}
