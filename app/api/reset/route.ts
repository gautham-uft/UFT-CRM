import { NextResponse } from "next/server";
import { resetDB } from "@/lib/db";

// POST /api/reset — clear the runtime database file and copy the persistent
// seed (data/crm-seed.json) back into it. Restores the canonical baseline and
// drops everything created during the session.
export async function POST() {
  await resetDB();
  return NextResponse.json({ ok: true });
}
