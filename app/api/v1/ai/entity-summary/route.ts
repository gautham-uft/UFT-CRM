import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { getAi, type SummaryKind } from "@/lib/core/ai";
import { loadSettings } from "@/lib/core/settings";
import { getDump } from "@/lib/core/dump";
import type { CollectionName } from "@/lib/contracts/collections";

// Seam A — Application API (v1): AI summary for a contact or account. Fetches
// the record server-side; the client sends { kind, id }. Thin controller → core/ai.
export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

const CONFIG: Record<SummaryKind, { collection: CollectionName; facts: (r: Record<string, unknown>) => Record<string, string> }> = {
  contact: {
    collection: "contacts",
    facts: (r) => ({
      Name: `${str(r.first_name)} ${str(r.last_name)}`.trim(),
      "Job title": str(r.job_title),
      Company: str(r.account_name),
      Email: str(r.email),
      Phone: str(r.phone),
      Location: str(r.address),
      LinkedIn: str(r.linkedin),
    }),
  },
  account: {
    collection: "accounts",
    facts: (r) => ({
      Company: str(r.name),
      Industry: str(r.industry),
      Website: str(r.website) || str(r.domain),
      Employees: str(r.employee_count),
      "Annual revenue": str(r.annual_revenue),
      Founded: str(r.founded_year),
    }),
  },
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const kind = body && typeof body === "object" ? (body as { kind?: string }).kind : undefined;
  const id = body && typeof body === "object" ? (body as { id?: string }).id : undefined;
  if (!id || (kind !== "contact" && kind !== "account")) {
    return NextResponse.json({ error: "Provide kind ('contact' | 'account') and id." }, { status: 400 });
  }
  const cfg = CONFIG[kind];
  const repo = getRepository();
  const rec = await repo.get(cfg.collection, id);
  if (!rec) return NextResponse.json({ error: "Record not found." }, { status: 404 });
  const settings = await loadSettings(repo);

  // Pull any extra/personal info from the hidden dump to personalize the summary.
  const dump = await getDump(repo, kind, id);
  const extra = dump && Object.keys(dump.data).length ? dump.data : undefined;

  try {
    const summary = await getAi(settings.ai).summarizer.summarizeEntity(kind, cfg.facts(rec as Record<string, unknown>), extra);
    return NextResponse.json({ summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to generate summary.";
    return NextResponse.json({ error: msg }, { status: msg.includes("not configured") ? 503 : 502 });
  }
}
