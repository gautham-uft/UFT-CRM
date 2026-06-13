// Pure helpers for composing outreach emails. No server-only dependencies, so
// these are safe to import from client components (the compose preview) and
// from the server route handler alike.

export function buildManpowerIntro(opts: {
  pocName?:    string;
  company?:    string;
  openRoles?:  string;
  senderName?: string;
}): { subject: string; body: string } {
  const poc     = opts.pocName?.trim()    || "there";
  const company = opts.company?.trim()    || "your company";
  const roles   = opts.openRoles?.trim();
  const sender  = opts.senderName?.trim() || "The UFT Team";

  const subject = `Manpower & hiring support for ${company}`;

  const rolesLine = roles
    ? `We noticed ${company} is hiring for roles such as ${roles}, and we'd love to help you fill them faster.`
    : `We understand ${company} may be growing its team, and we'd love to help you find the right talent faster.`;

  const body =
`Hi ${poc},

I'm reaching out from UF Technology (UFT). ${rolesLine}

We specialize in sourcing and supplying skilled manpower quickly — from screening to onboarding-ready candidates — so your team can focus on growth instead of long hiring cycles.

If this sounds useful, I'd be glad to set up a short call to understand your requirements and share how we can support your hiring.

Looking forward to hearing from you.

Best regards,
${sender}
UF Technology`;

  return { subject, body };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Inserted into an email only when at least one document is attached.
function attachmentLine(names?: string[]): string {
  if (!names || names.length === 0) return "";
  const list = names.map(n => `- ${n}`).join("\n");
  return `\n\nPlease find the attached document${names.length > 1 ? "s" : ""} for your reference:\n${list}`;
}

export type EmailActions = {
  acceptUrl?:   string;
  declineUrl?:  string;
  icsUrl?:      string; // universal "add to calendar" (.ics) link
  bookUrl?:     string; // sender's self-scheduling link (Calendly/Cal.com)
  meetingLine?: string; // human-readable "when/where" line shown above the buttons
};

// The "Company Details and Address" follow-up email sent after a meeting is
// arranged. Company info is fixed (UFTech); the greeting and signature are
// filled from the lead + the sender's details. Returned body is plain text and
// fully editable before sending.
export function buildCompanyDetailsEmail(opts: {
  clientName?:    string;
  senderName?:    string;
  senderTitle?:   string;
  senderCompany?: string;
  senderPhone?:   string;
  senderWebsite?: string;
  attachmentNames?: string[];
}): { subject: string; body: string } {
  const client  = opts.clientName?.trim()    || "there";
  const name    = opts.senderName?.trim()    || "";
  const title   = opts.senderTitle?.trim()   || "";
  const company = opts.senderCompany?.trim() || "Unitforce Technologies Consulting Pvt. Ltd.";
  const phone   = opts.senderPhone?.trim()   || "";
  const website = opts.senderWebsite?.trim() || "";

  const subject = "Company Details and Address – UFTech";
  const body =
`Hi ${client},

Thank you for taking the time to speak with me earlier today. As requested, I am following up with the official details and office address for Unitforce Technologies Consulting Pvt. Ltd.

Company Overview
Company Name: Unitforce Technologies Consulting Pvt. Ltd.
Core Services/Focus: We provide AI services, engineering services, talent acquisition, software solutions, and manufacturing solutions.
Official Website: www.uftech.com

Office Address & Contact Info
Unitforce Technologies Consulting Pvt. Ltd Headquarters

No 7 (old Number 1707) 3rd floor, White House,
17th Cross Rd, behind Maruthi Mandir, Govindaraja Nagar Ward,
PF Layout, Vijayanagar,
Bengaluru, Karnataka 560040

General Phone Number: 080 4040 2100
Primary Email: info@uftech.com
Office Hours: Monday – Friday, 9:00 AM – 6:00 PM EST

If you need any additional documentation or have further questions, please don't hesitate to reach out. We look forward to working closely with you.${attachmentLine(opts.attachmentNames)}

Best regards,
${name}${title ? ` ${title}` : ""}
${company}
${phone}
${website}`;

  return { subject, body };
}

// The meeting-scheduling email used for ONLINE meetings — confirms the date/time
// and the platform (source) the meeting will happen on, and invites a reply for
// changes. Editable before sending.
export function buildMeetingScheduleEmail(opts: {
  clientName?:    string;
  date?:          string;
  time?:          string;
  source?:        string; // Teams / Google Meet / Zoom / custom
  link?:          string;
  senderName?:    string;
  senderTitle?:   string;
  senderCompany?: string;
  senderPhone?:   string;
  senderWebsite?: string;
  attachmentNames?: string[];
}): { subject: string; body: string } {
  const client  = opts.clientName?.trim()    || "there";
  const when     = `${opts.date || ""}${opts.time ? ` at ${opts.time}` : ""}`.trim();
  const source  = opts.source?.trim()        || "an online call";
  const name    = opts.senderName?.trim()    || "";
  const title   = opts.senderTitle?.trim()   || "";
  const company = opts.senderCompany?.trim() || "Unitforce Technologies Consulting Pvt. Ltd.";
  const phone   = opts.senderPhone?.trim()   || "";
  const website = opts.senderWebsite?.trim() || "";

  const subject = "Meeting Scheduled – UFTech";
  const body =
`Hi ${client},

Thank you for your time. This note confirms our upcoming meeting${when ? ` on ${when}` : ""}.

The meeting will take place via ${source}.${opts.link ? `\nJoin link: ${opts.link}` : ""}

If this time doesn't work for you or anything changes, simply reply to this email and we'll be happy to reschedule.

Looking forward to speaking with you.${attachmentLine(opts.attachmentNames)}

Best regards,
${name}${title ? ` ${title}` : ""}
${company}
${phone}
${website}`;

  return { subject, body };
}

// Wraps a plain-text message in a simple branded HTML email. Line breaks are
// preserved; blank lines become paragraph breaks. Input is HTML-escaped first.
// When `actions` carry an acceptUrl/declineUrl, an Accept / Decline block is
// appended (used for meeting invites).
export function renderEmailHtml(body: string, actions?: EmailActions): string {
  const paragraphs = escapeHtml(body)
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 16px;line-height:1.6;color:#1f2937;font-size:14px;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  let actionsBlock = "";
  const hasInvite = !!(actions?.acceptUrl && actions?.declineUrl);
  if (actions && (hasInvite || actions.bookUrl)) {
    const when = (hasInvite && actions.meetingLine)
      ? `<p style="margin:0 0 14px;font-size:13px;color:#334155;"><strong>Proposed meeting:</strong> ${escapeHtml(actions.meetingLine)}</p>`
      : "";
    // Accept / Decline confirm the proposed time.
    const inviteButtons = hasInvite
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="padding:0 6px;"><a href="${actions.acceptUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 26px;border-radius:8px;">✓ Accept</a></td>
        <td style="padding:0 6px;"><a href="${actions.declineUrl}" style="display:inline-block;background:#ffffff;color:#dc2626;text-decoration:none;font-size:14px;font-weight:600;padding:11px 26px;border-radius:8px;border:1px solid #fecaca;">✕ Decline</a></td>
      </tr></table>`
      : "";
    // Universal "add to calendar" — clicking the .ics link opens the recipient's
    // default calendar app (Apple Calendar, Outlook, Google, etc.).
    const icsButton = actions.icsUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px auto 0;"><tr>
        <td><a href="${actions.icsUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 22px;border-radius:8px;">📅 Add to my calendar</a></td>
      </tr></table>`
      : "";
    // Self-scheduling link — let the recipient pick another time.
    const bookButton = actions.bookUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px auto 0;"><tr>
        <td><a href="${actions.bookUrl}" style="display:inline-block;background:#ffffff;color:#0f172a;text-decoration:none;font-size:13px;font-weight:600;padding:10px 22px;border-radius:8px;border:1px solid #cbd5e1;">📆 Prefer a different time? Book a slot →</a></td>
      </tr></table>`
      : "";
    const note = hasInvite
      ? `<p style="margin:14px 0 0;font-size:11px;color:#9ca3af;text-align:center;">Tap <strong>Add to my calendar</strong> to save it instantly, Accept to confirm${actions.bookUrl ? ", or Book a slot to pick another time" : " with us"}.</p>`
      : (actions.bookUrl ? `<p style="margin:14px 0 0;font-size:11px;color:#9ca3af;text-align:center;">Pick a time that works for you.</p>` : "");
    actionsBlock = `
    <div style="margin-top:8px;padding:20px 0 4px;border-top:1px solid #e4e4e7;">
      ${when}
      ${inviteButtons}
      ${icsButton}
      ${bookButton}
      ${note}
    </div>`;
  }

  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;padding:24px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:#0f172a;padding:20px 28px;">
      <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px;">UF Technology</span>
    </div>
    <div style="padding:28px;">${paragraphs}${actionsBlock}</div>
    <div style="padding:16px 28px;border-top:1px solid #e4e4e7;color:#9ca3af;font-size:11px;">
      This message was sent by UF Technology. If it isn't relevant to you, please ignore this email.
    </div>
  </div>
</body></html>`;
}
