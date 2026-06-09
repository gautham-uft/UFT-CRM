import { NextResponse } from "next/server";
import crypto from "crypto";
import { renderEmailHtml, type EmailActions } from "@/lib/email-templates";
import { createOne } from "@/lib/db";

// Sends transactional email via Resend's REST API (no SDK — same fetch-based
// approach as lib/db.ts uses for JSONBin). Server-only: the API key never
// reaches the browser.
//
// When the request includes a `meeting`, an invite record is stored and the
// email gets Accept / Decline buttons (Feature 5) that link back to
// /api/meeting-response, where the lead can add the event to their calendar.
//
// Required env (see .env.example):
//   RESEND_API_KEY     — your Resend API key
//   RESEND_FROM_EMAIL  — verified sender, e.g. "UFT <hello@yourdomain.com>".
//   APP_BASE_URL       — (optional) absolute base for invite links; otherwise
//                        derived from the request host.
export const dynamic = "force-dynamic";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM     = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "UFT CRM <onboarding@resend.dev>";

type MeetingProposal = {
  title?:    string;
  date?:     string;
  time?:     string;
  mode?:     "online" | "offline";
  location?: string;
  link?:     string;
};

function baseUrl(req: Request): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  const h = req.headers;
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("host") || "";
  return host ? `${proto}://${host}` : "";
}

export async function POST(req: Request) {
  if (!RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email is not configured. Add RESEND_API_KEY to .env.local (see .env.example)." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { to, subject, text, meeting, lead_id, lead_name } = body as {
    to?: string; subject?: string; text?: string;
    meeting?: MeetingProposal; lead_id?: string; lead_name?: string;
  };
  if (!to || !subject || !text) {
    return NextResponse.json({ error: "Missing required fields: to, subject, text" }, { status: 400 });
  }

  // ── Optional meeting invite: store it + build Accept/Decline links ──
  let actions: EmailActions | undefined;
  let textForSend = text;
  if (meeting && meeting.date) {
    const token = crypto.randomBytes(16).toString("hex");
    const title = (meeting.title || subject).trim();
    try {
      await createOne("meetingInvites", {
        token, to, lead_id, lead_name,
        title, date: meeting.date, time: meeting.time,
        mode: meeting.mode || "online", location: meeting.location, link: meeting.link,
        status: "pending", created_at: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json({ error: "Could not save the meeting invite. Check the database connection." }, { status: 500 });
    }

    const base = baseUrl(req);
    const acceptUrl  = `${base}/api/meeting-response?token=${token}&action=accept`;
    const declineUrl = `${base}/api/meeting-response?token=${token}&action=decline`;
    const where = (meeting.mode === "offline")
      ? (meeting.location ? ` · ${meeting.location}` : " · in person")
      : (meeting.link ? ` · ${meeting.link}` : " · online");
    const meetingLine = `${meeting.date}${meeting.time ? ` at ${meeting.time}` : ""}${where}`;

    actions = { acceptUrl, declineUrl, meetingLine };
    textForSend = `${text}\n\nProposed meeting: ${meetingLine}\nAccept: ${acceptUrl}\nDecline: ${declineUrl}`;
  }

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    EMAIL_FROM,
        to:      [to],
        subject,
        text:    textForSend,
        html:    renderEmailHtml(text, actions),
      }),
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the email service." }, { status: 502 });
  }

  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    const message =
      (data && (typeof data.message === "string" ? data.message : undefined)) ||
      (data && (typeof (data as { error?: string }).error === "string" ? (data as { error?: string }).error : undefined)) ||
      `Email service error (${res.status})`;
    return NextResponse.json({ error: message }, { status: res.status });
  }

  return NextResponse.json({ ok: true, id: (data as { id?: string }).id ?? null });
}
