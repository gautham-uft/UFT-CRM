// Client helper: send an email through the server route (/api/send-email).
// Throws with a readable message on failure (e.g. missing RESEND_API_KEY) so
// callers can surface it in the UI.

export type MeetingProposal = {
  title?:    string;
  date?:     string;
  time?:     string;
  mode?:     "online" | "offline";
  location?: string;
  link?:     string;
};

export type SendEmailPayload = {
  to:        string;
  subject:   string;
  text:      string;
  meeting?:  MeetingProposal; // when present, email gets Accept/Decline + calendar
  lead_id?:  string;
  lead_name?: string;
};

export async function sendEmail(payload: SendEmailPayload): Promise<{ ok: true; id: string | null }> {
  const res = await fetch("/api/send-email", {
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
