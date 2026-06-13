// ─────────────────────────────────────────────────────────────────────────
// Core — Email send service.
//
// Sends transactional email via Resend's REST API. When the request carries a
// `meeting`, a meeting-invite row is stored (through the Repository) and the
// email gets Accept / Decline links that point back at the public meeting
// response endpoint.
//
// Transport-agnostic: receives a Repository + the absolute baseUrl (the route
// computes it from the request) so this module never touches Next or pg.
// ─────────────────────────────────────────────────────────────────────────

import crypto from "crypto";
import type { Repository } from "@/lib/data/repository";
import { renderEmailHtml, type EmailActions } from "@/lib/core/email/templates";
import { icsContent, type CalEvent } from "@/lib/core/calendar";

export type MeetingProposal = {
  title?: string; date?: string; time?: string;
  mode?: "online" | "offline"; location?: string; link?: string;
};
export type EmailAttachment = { filename: string; content: string }; // base64
export type SendEmailInput = {
  to: string; subject: string; text: string;
  cc?: string[]; bcc?: string[];
  attachments?: EmailAttachment[];
  meeting?: MeetingProposal;
  scheduling_link?: string; // sender's booking URL → "Book a slot" button
  lead_id?: string; lead_name?: string;
};

// Add a scheme so a bare "calendly.com/x" becomes a valid href.
function normalizeUrl(u: string): string {
  const s = u.trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

// Append booking-prefill params (Calendly/Cal.com style) WITHOUT clobbering any
// the sender already put in their link. `date` deep-links to the proposed day;
// `name`/`email` prefill the invitee. Calendly can't force an exact time slot via
// URL — the invitee still picks — so the proposed time stays in the email body.
function withPrefill(url: string, params: Record<string, string | undefined>): string {
  try {
    const u = new URL(url);
    for (const [k, v] of Object.entries(params)) {
      if (v && v.trim() && !u.searchParams.has(k)) u.searchParams.set(k, v.trim());
    }
    return u.toString();
  } catch {
    return url; // malformed URL — leave it untouched
  }
}

export class EmailNotConfiguredError extends Error {}

const FROM = () => process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "UFT CRM <onboarding@resend.dev>";

// Build the public Accept/Decline endpoint path. The legacy and v1 routes share
// the same response handler, so this points at whichever is provided.
function inviteLinks(base: string, token: string, respondPath: string) {
  const root = `${base.replace(/\/$/, "")}${respondPath}`;
  return {
    acceptUrl: `${root}?token=${token}&action=accept`,
    declineUrl: `${root}?token=${token}&action=decline`,
  };
}

export async function sendEmail(
  repo: Repository,
  input: SendEmailInput,
  opts: { baseUrl: string; respondPath?: string },
): Promise<{ ok: true; id: string | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new EmailNotConfiguredError(
      "Email is not configured. Add RESEND_API_KEY to .env.local (see .env.example).",
    );
  }
  const { to, subject, text, cc, bcc, attachments, meeting, scheduling_link, lead_id, lead_name } = input;
  const respondPath = opts.respondPath ?? "/api/meeting-response";

  let actions: EmailActions | undefined;
  let textForSend = text;
  // Calendar attachments built alongside the invite (universal .ics).
  const extraAttachments: { filename: string; content: string; content_type?: string }[] = [];
  if (meeting && meeting.date) {
    const token = crypto.randomBytes(16).toString("hex");
    const title = (meeting.title || subject).trim();
    await repo.create("meetingInvites", {
      token, to, lead_id, lead_name,
      title, date: meeting.date, time: meeting.time,
      mode: meeting.mode || "online", location: meeting.location, link: meeting.link,
      status: "pending", created_at: new Date().toISOString(),
    });

    const { acceptUrl, declineUrl } = inviteLinks(opts.baseUrl, token, respondPath);
    const isOnline = meeting.mode !== "offline";
    const where = meeting.mode === "offline"
      ? (meeting.location ? ` · ${meeting.location}` : " · in person")
      : (meeting.link ? ` · ${meeting.link}` : " · online");
    const meetingLine = `${meeting.date}${meeting.time ? ` at ${meeting.time}` : ""}${where}`;
    // A universal "add to calendar" link (.ics) the recipient can click in the
    // email, plus the same event attached as a .ics file so calendar apps that
    // auto-detect attachments (Apple Mail, Gmail, Outlook) surface it natively.
    const icsUrl = `${opts.baseUrl.replace(/\/$/, "")}${respondPath}?token=${token}&action=ics`;
    const cal: CalEvent = {
      title,
      date: meeting.date,
      time: meeting.time,
      durationMin: 30,
      details: isOnline && meeting.link ? `Join: ${meeting.link}` : "Meeting arranged via UF Technology.",
      location: meeting.mode === "offline" ? (meeting.location || "In person") : (meeting.link || "Online"),
    };
    extraAttachments.push({
      filename: "meeting.ics",
      content: Buffer.from(icsContent(cal, `${token}@uft-crm`), "utf-8").toString("base64"),
      content_type: "text/calendar; method=PUBLISH; charset=utf-8",
    });
    actions = { acceptUrl, declineUrl, icsUrl, meetingLine };
    textForSend = `${text}\n\nProposed meeting: ${meetingLine}\nAdd to your calendar: ${icsUrl}\nAccept: ${acceptUrl}\nDecline: ${declineUrl}`;
  }

  // Optional self-scheduling link (sender's Calendly/Cal.com) — independent of the
  // proposed-time invite, so it works for online and offline meetings alike.
  const rawBook = normalizeUrl(scheduling_link ?? "");
  if (rawBook) {
    // Open the booking page on the proposed day with the invitee pre-filled.
    // Include the proposed time only when one was set (left blank otherwise).
    const bookUrl = withPrefill(rawBook, { date: meeting?.date, time: meeting?.time, name: lead_name, email: to });
    actions = { ...(actions ?? {}), bookUrl };
    textForSend = `${textForSend}\n\nPrefer a different time? Book a slot: ${bookUrl}`;
  }

  const allAttachments = [...(Array.isArray(attachments) ? attachments : []), ...extraAttachments];

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM(),
        to: [to],
        subject,
        text: textForSend,
        html: renderEmailHtml(text, actions),
        ...(Array.isArray(cc) && cc.length ? { cc } : {}),
        ...(Array.isArray(bcc) && bcc.length ? { bcc } : {}),
        ...(allAttachments.length ? { attachments: allAttachments } : {}),
      }),
    });
  } catch {
    throw new Error("Could not reach the email service.");
  }

  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    const message =
      (typeof data.message === "string" ? data.message : undefined) ||
      (typeof (data as { error?: string }).error === "string" ? (data as { error?: string }).error : undefined) ||
      `Email service error (${res.status})`;
    throw new Error(message);
  }
  return { ok: true, id: (data as { id?: string }).id ?? null };
}
