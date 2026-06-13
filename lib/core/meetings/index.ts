// ─────────────────────────────────────────────────────────────────────────
// Core — Meeting invite response service.
//
// Handles the data side of a lead accepting / declining a meeting invite (from
// the email link): marks the invite, logs an activity, and on accept mirrors a
// confirmed meeting into the CRM calendar. Transport-agnostic (uses a
// Repository). The HTTP route owns the public HTML rendering and .ics output.
// ─────────────────────────────────────────────────────────────────────────

import type { Repository } from "@/lib/data/repository";
import type { CalEvent } from "@/lib/core/calendar";

export type MeetingInvite = {
  id: string; token: string; status: string;
  lead_id?: string; lead_name?: string; to?: string;
  title: string; date: string; time?: string;
  mode?: "online" | "offline"; location?: string; link?: string;
  responded_at?: string;
};

export type RespondAction = "accept" | "decline" | "ics";
export type RespondOutcome =
  | { kind: "not_found" }
  | { kind: "ics"; invite: MeetingInvite; cal: CalEvent }
  | { kind: "declined"; invite: MeetingInvite; whenLine: string }
  | { kind: "accepted"; invite: MeetingInvite; cal: CalEvent; whenLine: string };

export function calEventFrom(inv: MeetingInvite): CalEvent {
  const isOnline = inv.mode !== "offline";
  const where = isOnline ? (inv.link || "Online") : (inv.location || "In person");
  const details = isOnline && inv.link ? `Join: ${inv.link}` : "Meeting arranged via UF Technology.";
  return {
    title: inv.title || "Meeting with UF Technology",
    date: inv.date, time: inv.time, durationMin: 30, details, location: where,
  };
}

async function findInvite(repo: Repository, token: string): Promise<MeetingInvite | undefined> {
  const invites = (await repo.list("meetingInvites")) as unknown as MeetingInvite[];
  return invites.find((i) => i.token === token);
}

export async function respondToInvite(
  repo: Repository,
  token: string,
  action: RespondAction,
): Promise<RespondOutcome> {
  const invite = await findInvite(repo, token);
  if (!invite) return { kind: "not_found" };

  const whenLine = `${invite.date}${invite.time ? ` at ${invite.time}` : ""}`;

  if (action === "ics") {
    return { kind: "ics", invite, cal: calEventFrom(invite) };
  }

  if (action === "decline") {
    if (invite.status === "pending") {
      await repo.update("meetingInvites", invite.id, { status: "declined", responded_at: new Date().toISOString() });
      await repo.create("activities", {
        user: "System", entity_type: "lead", entity_name: invite.lead_name || invite.to || "Lead",
        activity_type: "note", description: `${invite.lead_name || "Lead"} DECLINED the meeting (${whenLine}).`,
        created_at: new Date().toISOString(),
      }).catch(() => {});
    }
    return { kind: "declined", invite, whenLine };
  }

  // accept
  if (invite.status === "pending") {
    await repo.update("meetingInvites", invite.id, { status: "accepted", responded_at: new Date().toISOString() });
    await repo.create("activities", {
      user: "System", entity_type: "lead", entity_name: invite.lead_name || invite.to || "Lead",
      activity_type: "meeting", description: `${invite.lead_name || "Lead"} ACCEPTED the meeting (${whenLine}).`,
      created_at: new Date().toISOString(),
    }).catch(() => {});
    await repo.create("calendarEvents", {
      title: invite.title || "Meeting", date: invite.date, time: invite.time, type: "meeting",
      related_to: invite.lead_name, lead_id: invite.lead_id,
      meeting_mode: invite.mode || "online", meeting_link: invite.link, location: invite.location,
      attendees: invite.to ? [{ name: invite.lead_name || invite.to, email: invite.to, is_external: true }] : [],
    }).catch(() => {});
  }
  return { kind: "accepted", invite, cal: calEventFrom(invite), whenLine };
}
