import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { sendEmail, EmailNotConfiguredError, type SendEmailInput } from "@/lib/core/email/send";

// Seam A — Application API (v1): send email (+ optional meeting invite). Thin
// controller → core/email service.
export const dynamic = "force-dynamic";

function baseUrl(req: Request): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  const h = req.headers;
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("host") || "";
  return host ? `${proto}://${host}` : "";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const input = body as SendEmailInput;
  if (!input.to || !input.subject || !input.text) {
    return NextResponse.json({ error: "Missing required fields: to, subject, text" }, { status: 400 });
  }
  try {
    return NextResponse.json(await sendEmail(getRepository(), input, { baseUrl: baseUrl(req) }));
  } catch (err) {
    if (err instanceof EmailNotConfiguredError) return NextResponse.json({ error: err.message }, { status: 503 });
    const msg = err instanceof Error ? err.message : "Failed to send email.";
    return NextResponse.json({ error: msg }, { status: msg.includes("reach the email service") ? 502 : 500 });
  }
}
