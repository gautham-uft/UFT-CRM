import { getAll, createOne, updateOne } from "@/lib/db";
import { googleCalendarUrl, outlookCalendarUrl, icsContent, type CalEvent } from "@/lib/calendar-links";

// Public landing endpoint for the Accept / Decline buttons in meeting-invite
// emails. Opened in the lead's browser (GET), so it returns styled HTML — not
// JSON. On Accept it records the response, creates a confirmed meeting in the
// CRM (linked to the lead), and offers add-to-calendar links for Google /
// Outlook / .ics. No login required for the lead.
export const dynamic = "force-dynamic";

type Invite = {
  id: string; token: string; status: string;
  lead_id?: string; lead_name?: string; to?: string;
  title: string; date: string; time?: string;
  mode?: "online" | "offline"; location?: string; link?: string;
  responded_at?: string;
};

function baseUrl(req: Request): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  const h = req.headers;
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("host") || "";
  return host ? `${proto}://${host}` : "";
}

function calEventFrom(inv: Invite): CalEvent {
  const isOnline = inv.mode !== "offline";
  const where = isOnline ? (inv.link || "Online") : (inv.location || "In person");
  const details = isOnline && inv.link ? `Join: ${inv.link}` : "Meeting arranged via UF Technology.";
  return {
    title: inv.title || "Meeting with UF Technology",
    date: inv.date,
    time: inv.time,
    durationMin: 30,
    details,
    location: where,
  };
}

function html(body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>UF Technology</title></head>
<body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;">
  <div style="max-width:460px;margin:24px;background:#fff;border:1px solid #e4e4e7;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.06);">
    <div style="background:#0f172a;padding:18px 28px;"><span style="color:#fff;font-size:17px;font-weight:700;">UF Technology</span></div>
    <div style="padding:28px;">${body}</div>
  </div>
</body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

const btn = (href: string, label: string, bg: string, color: string, border = "none") =>
  `<a href="${href}" target="_blank" rel="noreferrer" style="display:block;text-align:center;background:${bg};color:${color};text-decoration:none;font-size:14px;font-weight:600;padding:12px;border-radius:8px;border:${border};margin:8px 0;">${label}</a>`;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const action = url.searchParams.get("action") || "";

  if (!token || !["accept", "decline", "ics"].includes(action)) {
    return html(`<h2 style="margin:0 0 8px;color:#dc2626;font-size:18px;">Invalid link</h2><p style="color:#64748b;font-size:14px;">This response link is missing or malformed.</p>`, 400);
  }

  let invites: Invite[];
  try {
    invites = (await getAll("meetingInvites")) as unknown as Invite[];
  } catch {
    return html(`<h2 style="margin:0 0 8px;color:#dc2626;font-size:18px;">Something went wrong</h2><p style="color:#64748b;font-size:14px;">Please try again later.</p>`, 500);
  }

  const invite = invites.find((i) => i.token === token);
  if (!invite) {
    return html(`<h2 style="margin:0 0 8px;color:#dc2626;font-size:18px;">Link expired</h2><p style="color:#64748b;font-size:14px;">We couldn't find this invitation. It may have been withdrawn.</p>`, 404);
  }

  const cal = calEventFrom(invite);

  // ── Download .ics ──
  if (action === "ics") {
    return new Response(icsContent(cal, `${invite.token}@uft-crm`), {
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": `attachment; filename="uft-meeting.ics"`,
      },
    });
  }

  const base = baseUrl(req);
  const whenLine = `${invite.date}${invite.time ? ` at ${invite.time}` : ""}`;

  // ── Decline ──
  if (action === "decline") {
    if (invite.status === "pending") {
      await updateOne("meetingInvites", invite.id, { status: "declined", responded_at: new Date().toISOString() });
      await createOne("activities", {
        user: "System", entity_type: "lead", entity_name: invite.lead_name || invite.to || "Lead",
        activity_type: "note", description: `${invite.lead_name || "Lead"} DECLINED the meeting (${whenLine}).`,
        created_at: new Date().toISOString(),
      }).catch(() => {});
    }
    return html(`<h2 style="margin:0 0 10px;color:#0f172a;font-size:18px;">Thanks for letting us know</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">You've declined the proposed meeting${invite.title ? ` "<strong>${invite.title}</strong>"` : ""}. No problem — our team will follow up with alternative options if needed.</p>`);
  }

  // ── Accept ──
  if (invite.status === "pending") {
    await updateOne("meetingInvites", invite.id, { status: "accepted", responded_at: new Date().toISOString() });
    await createOne("activities", {
      user: "System", entity_type: "lead", entity_name: invite.lead_name || invite.to || "Lead",
      activity_type: "meeting", description: `${invite.lead_name || "Lead"} ACCEPTED the meeting (${whenLine}).`,
      created_at: new Date().toISOString(),
    }).catch(() => {});
    // Mirror it into the CRM calendar, linked to the lead, as a confirmed meeting.
    await createOne("calendarEvents", {
      title: invite.title || "Meeting", date: invite.date, time: invite.time, type: "meeting",
      related_to: invite.lead_name, lead_id: invite.lead_id,
      meeting_mode: invite.mode || "online", meeting_link: invite.link, location: invite.location,
      attendees: invite.to ? [{ name: invite.lead_name || invite.to, email: invite.to, is_external: true }] : [],
    }).catch(() => {});
  }

  const icsUrl = `${base}/api/meeting-response?token=${encodeURIComponent(token)}&action=ics`;
  return html(`<h2 style="margin:0 0 10px;color:#16a34a;font-size:19px;">You're confirmed! 🎉</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 6px;">Meeting${invite.title ? ` "<strong>${invite.title}</strong>"` : ""} on <strong>${whenLine}</strong>.</p>
    <p style="color:#64748b;font-size:13px;margin:0 0 18px;">Add it to your calendar:</p>
    ${btn(googleCalendarUrl(cal), "📅  Add to Google Calendar", "#16a34a", "#ffffff")}
    ${btn(outlookCalendarUrl(cal), "📅  Add to Outlook / Microsoft", "#2563eb", "#ffffff")}
    ${btn(icsUrl, "⬇  Download .ics (Apple Calendar & others)", "#ffffff", "#0f172a", "1px solid #e4e4e7")}`);
}
