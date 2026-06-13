import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { getAi, type LeadSummaryInput } from "@/lib/core/ai";
import { loadSettings } from "@/lib/core/settings";
import { getDump } from "@/lib/core/dump";

// Seam A — Application API (v1): generate an AI summary for a lead. Thin
// controller → core/ai (Gemini). Fetches the lead server-side, so the client
// only sends its id.
export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const id = body && typeof body === "object" ? (body as { id?: string }).id : undefined;
  if (!id) return NextResponse.json({ error: "Missing lead id." }, { status: 400 });

  const repo = getRepository();
  const lead = await repo.get("leads", id);
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  const settings = await loadSettings(repo);

  const input: LeadSummaryInput = {
    first_name: str(lead.first_name),
    last_name: str(lead.last_name),
    email: str(lead.email),
    phone: str(lead.phone),
    company_name: str(lead.company_name),
    source: str(lead.source),
    status: str(lead.status),
    date_of_birth: str(lead.date_of_birth),
    address: str(lead.address),
    linkedin: str(lead.linkedin),
    profile: (lead.profile && typeof lead.profile === "object" ? lead.profile : undefined) as LeadSummaryInput["profile"],
  };

  // Pull any extra/personal info from the hidden dump to personalize the summary.
  const dump = await getDump(repo, "lead", id);
  if (dump && Object.keys(dump.data).length) input.extra = dump.data;

  try {
    const summary = await getAi(settings.ai).summarizer.summarizeLead(input);
    return NextResponse.json({ summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to generate summary.";
    const status = msg.includes("not configured") ? 503 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
