import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { getAi, type ActivityTouch, type ActivityKind } from "@/lib/core/ai";
import { loadSettings } from "@/lib/core/settings";
import type { CollectionName, Row } from "@/lib/contracts/collections";

// Seam A — Application API (v1): AI digest of recent activity for an account,
// contact, or lead. For an account it aggregates interactions logged against the
// account itself and the contacts / deals / leads under it; for a contact it
// includes the deals they're on; for a lead it's the lead's own activity. The
// client sends { kind, id }.
export const dynamic = "force-dynamic";

const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const MAX_TOUCHES = 30; // cap what we feed the model — most recent first

const KIND_COLLECTION: Record<ActivityKind, CollectionName> = {
  account: "accounts",
  contact: "contacts",
  lead: "leads",
};

// Build the set of (entity_type, entity_name) pairs that count as "this record's"
// activity, plus the subject + context strings for the prompt.
function buildScope(
  kind: ActivityKind,
  rec: Row,
  all: { contacts: Row[]; deals: Row[]; leads: Row[] },
): { subject: string; context: string; matches: (a: Row) => boolean } {
  if (kind === "account") {
    const accountName = str(rec.name);
    const contactNames = new Set(
      all.contacts.filter(c => str(c.account_id) === str(rec.id)).map(c => `${str(c.first_name)} ${str(c.last_name)}`.trim()),
    );
    const dealNames = new Set(all.deals.filter(d => str(d.account_name) === accountName).map(d => str(d.name)));
    const leadNames = new Set(
      all.leads.filter(l => str(l.company_name) === accountName).map(l => `${str(l.first_name)} ${str(l.last_name)}`.trim()),
    );
    return {
      subject: accountName,
      context: str(rec.industry),
      matches: (a) => {
        const t = str(a.entity_type), n = str(a.entity_name);
        if (t === "account") return n === accountName;
        if (t === "contact") return contactNames.has(n);
        if (t === "deal") return dealNames.has(n);
        if (t === "lead") return leadNames.has(n);
        return false;
      },
    };
  }

  if (kind === "contact") {
    const contactName = `${str(rec.first_name)} ${str(rec.last_name)}`.trim();
    const dealNames = new Set(all.deals.filter(d => str(d.contact) === contactName).map(d => str(d.name)));
    return {
      subject: contactName,
      context: str(rec.account_name),
      matches: (a) => {
        const t = str(a.entity_type), n = str(a.entity_name);
        if (t === "contact") return n === contactName;
        if (t === "deal") return dealNames.has(n);
        return false;
      },
    };
  }

  // lead
  const leadName = `${str(rec.first_name)} ${str(rec.last_name)}`.trim();
  return {
    subject: leadName,
    context: str(rec.company_name),
    matches: (a) => str(a.entity_type) === "lead" && str(a.entity_name) === leadName,
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const kind = body && typeof body === "object" ? (body as { kind?: string }).kind : undefined;
  const id = body && typeof body === "object" ? (body as { id?: string }).id : undefined;
  if (!id || (kind !== "account" && kind !== "contact" && kind !== "lead")) {
    return NextResponse.json({ error: "Provide kind ('account' | 'contact' | 'lead') and id." }, { status: 400 });
  }

  const repo = getRepository();
  const rec = await repo.get(KIND_COLLECTION[kind], id);
  if (!rec) return NextResponse.json({ error: "Record not found." }, { status: 404 });

  const [contacts, deals, leads, activities] = await Promise.all([
    repo.list("contacts"),
    repo.list("deals"),
    repo.list("leads"),
    repo.list("activities"),
  ]);

  const { subject, context, matches } = buildScope(kind, rec, { contacts, deals, leads });
  const related = activities.filter(matches);
  related.sort((a, b) => str(b.created_at).localeCompare(str(a.created_at)));

  if (related.length === 0) {
    return NextResponse.json({ summary: "", count: 0 });
  }

  const touches: ActivityTouch[] = related.slice(0, MAX_TOUCHES).map(a => ({
    date: str(a.created_at),
    type: str(a.activity_type),
    on: `${str(a.entity_name)} (${str(a.entity_type)})`,
    by: str(a.user),
    description: str(a.description),
  }));

  const settings = await loadSettings(repo);
  try {
    const summary = await getAi(settings.ai).summarizer.summarizeActivity({ kind, subject, context, touches });
    return NextResponse.json({ summary, count: related.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to summarise activity.";
    return NextResponse.json({ error: msg }, { status: msg.includes("not configured") ? 503 : 502 });
  }
}
