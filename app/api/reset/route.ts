import { NextResponse } from "next/server";
import { resetDB } from "@/lib/db";

// POST /api/reset — wipe the local database and re-seed from mock data.
// Handy for resetting between demo sessions.
export async function POST() {
  await resetDB();
  return NextResponse.json({ ok: true });
}
