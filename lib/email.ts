// Client helper: send an email through the Application API (/api/v1/email/send).
// Throws with a readable message on failure (e.g. missing RESEND_API_KEY) so
// callers can surface it in the UI.

import { apiUrl } from "@/lib/api-base";

export type MeetingProposal = {
  title?:    string;
  date?:     string;
  time?:     string;
  mode?:     "online" | "offline";
  location?: string;
  link?:     string;
};

export type EmailAttachment = { filename: string; content: string }; // content = base64

export type SendEmailPayload = {
  to:        string;
  subject:   string;
  text:      string;
  cc?:       string[];
  bcc?:      string[];
  attachments?: EmailAttachment[];
  meeting?:  MeetingProposal; // when present, email gets Accept/Decline + calendar
  scheduling_link?: string;   // sender's Calendly/Cal.com link → "Book a slot" button
  lead_id?:  string;
  lead_name?: string;
};

export async function sendEmail(payload: SendEmailPayload): Promise<{ ok: true; id: string | null }> {
  const res = await fetch(apiUrl("/api/v1/email/send"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error || `Failed to send email (${res.status})`);
  }
  return data as { ok: true; id: string | null };
}
