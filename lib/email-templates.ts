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

export type EmailActions = {
  acceptUrl?:   string;
  declineUrl?:  string;
  meetingLine?: string; // human-readable "when/where" line shown above the buttons
};

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
  if (actions?.acceptUrl && actions?.declineUrl) {
    const when = actions.meetingLine
      ? `<p style="margin:0 0 14px;font-size:13px;color:#334155;"><strong>Proposed meeting:</strong> ${escapeHtml(actions.meetingLine)}</p>`
      : "";
    actionsBlock = `
    <div style="margin-top:8px;padding:20px 0 4px;border-top:1px solid #e4e4e7;">
      ${when}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="padding:0 6px;"><a href="${actions.acceptUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 26px;border-radius:8px;">✓ Accept</a></td>
        <td style="padding:0 6px;"><a href="${actions.declineUrl}" style="display:inline-block;background:#ffffff;color:#dc2626;text-decoration:none;font-size:14px;font-weight:600;padding:11px 26px;border-radius:8px;border:1px solid #fecaca;">✕ Decline</a></td>
      </tr></table>
      <p style="margin:14px 0 0;font-size:11px;color:#9ca3af;text-align:center;">Accepting lets you add this meeting to your Google or Microsoft calendar.</p>
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
