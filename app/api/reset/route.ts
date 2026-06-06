import { NextResponse } from "next/server";
import { resetDB, resetKeepLeads } from "@/lib/db";

// POST /api/reset — wipe the local database and re-seed from mock data.
// Handy for resetting between demo sessions.
//
// Body { keepLeads: true } empties every collection except Leads (which are
// re-seeded), so you can clear contacts/accounts/follow-ups/etc. in one click.
export async function POST(req: Request) {
  let keepLeads = false;
  try {
    const body = await req.json();
    keepLeads = !!body?.keepLeads;
  } catch {
    // no body — full reset
  }
  if (keepLeads) await resetKeepLeads();
  else await resetDB();
  return NextResponse.json({ ok: true });
}
