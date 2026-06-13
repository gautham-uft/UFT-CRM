// Pure helpers that turn a meeting into "add to calendar" links. This is the
// realistic way to get an event into a recipient's Google / Microsoft calendar
// without them OAuth-authorizing our app: the link opens their calendar with the
// event pre-filled, and they save it. Times are treated as floating local time
// (the literal time entered in the CRM is preserved).

export type CalEvent = {
  title:        string;
  date:         string;  // YYYY-MM-DD
  time?:        string;  // HH:MM — omitted → all-day event
  durationMin?: number;  // default 30
  details?:     string;
  location?:    string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const compact   = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const dateOnly  = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const isoLocal  = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
const compactUTC = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

function range(e: CalEvent) {
  const allDay = !e.time;
  const start  = new Date(`${e.date}T${e.time || "00:00"}:00`);
  const end    = new Date(start.getTime() + (e.durationMin ?? 30) * 60000);
  return { allDay, start, end };
}

export function googleCalendarUrl(e: CalEvent): string {
  const { allDay, start, end } = range(e);
  const dates = allDay
    ? `${dateOnly(start)}/${dateOnly(new Date(start.getTime() + 86400000))}`
    : `${compact(start)}/${compact(end)}`;
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text:   e.title,
    dates,
    ...(e.details  ? { details:  e.details }  : {}),
    ...(e.location ? { location: e.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function outlookCalendarUrl(e: CalEvent): string {
  const { allDay, start, end } = range(e);
  const p = new URLSearchParams({
    path:    "/calendar/action/compose",
    rru:     "addevent",
    subject: e.title,
    startdt: allDay ? e.date : isoLocal(start),
    enddt:   allDay ? e.date : isoLocal(end),
    ...(allDay     ? { allday: "true" }     : {}),
    ...(e.details  ? { body:     e.details }  : {}),
    ...(e.location ? { location: e.location } : {}),
  });
  return `https://outlook.office.com/calendar/0/deeplink/compose?${p.toString()}`;
}

export function icsContent(e: CalEvent, uid: string): string {
  const { allDay, start, end } = range(e);
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const dtStart = allDay ? `DTSTART;VALUE=DATE:${dateOnly(start)}` : `DTSTART:${compact(start)}`;
  const dtEnd   = allDay ? `DTEND;VALUE=DATE:${dateOnly(new Date(start.getTime() + 86400000))}` : `DTEND:${compact(end)}`;
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//UFT CRM//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${compactUTC(new Date())}`,
    dtStart, dtEnd,
    `SUMMARY:${esc(e.title)}`,
    ...(e.details  ? [`DESCRIPTION:${esc(e.details)}`] : []),
    ...(e.location ? [`LOCATION:${esc(e.location)}`]   : []),
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}
