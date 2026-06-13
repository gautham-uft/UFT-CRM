"use client";

import { useRef, useState } from "react";
import {
  X, Video, MapPin, ArrowRight, ArrowLeft, Check, Loader2, Calendar,
  Users, Mail, Pencil, Send, AlertCircle, Building2, UserCircle,
  FileText, Upload, Search, Trash2, Paperclip, CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buildCompanyDetailsEmail, buildMeetingScheduleEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";
import { useCollection } from "@/hooks/useCollection";
import TimePicker from "@/components/TimePicker";
import type { CalendarEvent } from "@/lib/mock-data";

export type MeetingPayload = Omit<CalendarEvent, "id">;

type DocItem = { id: string; name: string; type: string; date_added: string; modified: string; uploader: string };
function docTypeOf(name: string): string {
  const e = name.includes(".") ? name.split(".").pop()!.toUpperCase() : "";
  return e || "FILE";
}
function readFileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const inputCls = "w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-xs placeholder:text-[var(--tx6)] focus:outline-none focus:border-[var(--a-border)] transition-colors";
const labelCls = "block text-[var(--tx5)] text-xs font-medium mb-1";

type AppUser = { id: string; first_name: string; last_name: string; role: string; email?: string; scheduling_link?: string };
type LeadLite = { id: string; first_name: string; last_name: string; company_name: string; email?: string };
type Audience = "client" | "internal";

const ROLE_OPTIONS = ["Director", "Business Manager", "Account Manager", "Team Leader"];
const PLATFORMS = ["Microsoft Teams", "Google Meet", "Zoom", "Other"];
const LABELS: Record<string, string> = { audience: "Type", mode: "Mode", details: "Details", people: "People", platform: "Platform", sender: "Sender", documents: "Docs", email: "Email" };

export type MeetingWizardResult = { meeting: MeetingPayload | null; audience: Audience; emailTo?: string; ccCount?: number };

export default function MeetingWizard({ audience: presetAudience, lead, users, today, currentUser, onClose, onFinish }: {
  audience?:   Audience;
  lead?:       LeadLite;
  users:       AppUser[];
  today:       string;
  currentUser: { id?: string; first_name: string; last_name: string; role: string };
  onClose:     () => void;
  onFinish:    (r: MeetingWizardResult) => void;
}) {
  const [audience, setAudience]       = useState<Audience | null>(presetAudience ?? null);
  const [idx, setIdx]                 = useState(0);
  const [mode, setMode]               = useState<"online" | "offline" | null>(null);
  // Client identity (editable when there's no pre-linked lead).
  const [clientName, setClientName]   = useState(lead ? `${lead.first_name} ${lead.last_name}`.trim() : "");
  const [clientCompany, setClientCompany] = useState(lead?.company_name ?? "");
  const [clientEmail, setClientEmail] = useState(lead?.email ?? "");
  const [internalTitle, setInternalTitle] = useState("Internal meeting");
  const [date, setDate]               = useState(today);
  const [time, setTime]               = useState("");
  const [location, setLocation]       = useState("");
  const [platform, setPlatform]       = useState("Microsoft Teams");
  const [otherSource, setOtherSource] = useState("");
  const [roles, setRoles]             = useState<Set<string>>(new Set());
  const [addToCalendar, setAddToCalendar] = useState(true);
  // Self-scheduling link — prefilled from the sender's profile (set in Profile).
  const myLink = users.find(u => u.id === currentUser.id)?.scheduling_link ?? "";
  const [bookEnabled, setBookEnabled] = useState(!!myLink);
  const [bookLink, setBookLink] = useState(myLink);
  const [sender, setSender]           = useState({
    name:    `${currentUser.first_name} ${currentUser.last_name}`.trim(),
    title:   "",
    company: "Unitforce Technologies Consulting Pvt. Ltd.",
    phone:   "",
    website: "www.uftech.com",
  });
  const [subject, setSubject]   = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState("");

  // ── Documents step ──
  const { items: dbDocs, create: createDoc } = useCollection<DocItem>("documents");
  const fileRef = useRef<HTMLInputElement>(null);
  const [docSearch, setDocSearch]         = useState("");
  const [selectedDbIds, setSelectedDbIds] = useState<Set<string>>(new Set());
  const [uploads, setUploads]             = useState<{ name: string; type: string; content: string }[]>([]);
  const [pendingUpload, setPendingUpload] = useState<{ name: string; type: string; content: string } | null>(null);
  const uploaderName = `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.role;

  // Step flow depends on audience (client adds Sender+Email) and mode (online adds Platform).
  const flow: string[] = [
    ...(presetAudience ? [] : ["audience"]),
    "mode", "details", "people",
    ...(mode === "online" ? ["platform"] : []),
    ...(audience === "client" ? ["sender", "documents", "email"] : []),
  ];
  const stepKey = flow[idx];
  const isLastStep = idx === flow.length - 1;

  const allSelected    = ROLE_OPTIONS.every(r => roles.has(r));
  const selectedPeople = users.filter(u => roles.has(u.role));
  const ccList         = selectedPeople.map(u => u.email).filter((e): e is string => !!e);
  const resolvedSource = platform === "Other" ? otherSource.trim() : platform;

  const detailsComplete = audience === "internal"
    ? !!(internalTitle.trim() && date)
    : !!(clientEmail.trim() && date && (lead || clientName.trim()));
  const platformComplete = platform !== "Other" || !!otherSource.trim();
  const senderComplete   = !!(sender.name.trim() && sender.title.trim() && sender.company.trim() && sender.phone.trim() && sender.website.trim());

  // Documents: selected DB docs + freshly uploaded files → attachment names + real attachments.
  const selectedDbDocs = dbDocs.filter(d => selectedDbIds.has(d.id));
  const attachmentNames = [...selectedDbDocs.map(d => d.name), ...uploads.map(u => u.name)];
  const filteredDocs = dbDocs.filter(d => d.name.toLowerCase().includes(docSearch.trim().toLowerCase()));

  function toggleDbDoc(id: string) { setSelectedDbIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }
  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const content = await readFileBase64(f);
    setPendingUpload({ name: f.name, type: docTypeOf(f.name), content });
  }
  function confirmUpload(saveToDb: boolean) {
    if (!pendingUpload) return;
    setUploads(prev => [...prev, { name: pendingUpload.name, type: pendingUpload.type, content: pendingUpload.content }]);
    if (saveToDb) createDoc({ name: pendingUpload.name, type: pendingUpload.type, date_added: today, modified: today, uploader: uploaderName });
    setPendingUpload(null);
  }
  function removeUpload(i: number) { setUploads(prev => prev.filter((_, idx) => idx !== i)); }

  function toggleRole(r: string) { setRoles(prev => { const n = new Set(prev); if (n.has(r)) n.delete(r); else n.add(r); return n; }); }
  function toggleAll() { setRoles(allSelected ? new Set() : new Set(ROLE_OPTIONS)); }
  function pickAudience(a: Audience) { setAudience(a); setIdx(idx + 1); }
  function pickMode(m: "online" | "offline") { setMode(m); setIdx(idx + 1); }

  function goToEmail() {
    const common = {
      clientName:    (lead?.first_name ?? clientName).trim() || "there",
      senderName:    sender.name, senderTitle: sender.title, senderCompany: sender.company,
      senderPhone:   sender.phone, senderWebsite: sender.website,
      attachmentNames: attachmentNames.length ? attachmentNames : undefined,
    };
    const { subject: s, body } = mode === "online"
      ? buildMeetingScheduleEmail({ ...common, date, time, source: resolvedSource, link: platform === "Other" && /^https?:/i.test(otherSource) ? otherSource.trim() : undefined })
      : buildCompanyDetailsEmail(common);
    setSubject(s); setEmailBody(body); setPreviewing(false);
    setIdx(flow.indexOf("email"));
  }

  function buildMeeting(): MeetingPayload | null {
    if (!addToCalendar) return null;
    const link = platform === "Other" && /^https?:/i.test(otherSource) ? otherSource.trim() : undefined;
    const internalAttendees = selectedPeople.map(u => ({ name: `${u.first_name} ${u.last_name}`.trim(), email: u.email, is_external: false }));
    const attendees = audience === "client"
      ? [{ name: clientName || "Client", email: clientEmail.trim() || undefined, is_external: true }, ...internalAttendees]
      : internalAttendees;
    return {
      title:            audience === "client" ? `Meeting with ${clientName || "client"}` : internalTitle.trim(),
      date,
      time:             time || undefined,
      type:             "meeting",
      assignee:         `${currentUser.first_name} ${currentUser.last_name}`.trim() || undefined,
      related_to:       audience === "client" ? (clientCompany || clientName) : internalTitle.trim(),
      meeting_mode:     mode ?? "offline",
      meeting_platform: mode === "online" ? resolvedSource : undefined,
      meeting_link:     link,
      location:         mode === "offline" ? (location.trim() || undefined) : undefined,
      attendees,
      lead_id:          lead?.id,
    };
  }

  function createInternal() {
    onFinish({ meeting: buildMeeting(), audience: "internal" });
  }

  // For online meetings, attach the meeting to the email so the recipient gets a
  // universal "Add to my calendar" (.ics) link + file (built server-side in
  // lib/core/email/send.ts). Offline emails are a company-details follow-up, not
  // a calendar invite, so they don't carry one.
  function emailMeeting() {
    if (mode !== "online" || !date) return undefined;
    return {
      title: `Meeting with ${clientName || "client"}`.trim(),
      date,
      time: time || undefined,
      mode: "online" as const,
      link: platform === "Other" && /^https?:/i.test(otherSource) ? otherSource.trim() : undefined,
    };
  }

  async function handleSend() {
    if (sending || !clientEmail.trim()) return;
    setSending(true); setError("");
    try {
      await sendEmail({
        to: clientEmail.trim(), subject: subject.trim(), text: emailBody,
        cc: ccList.length ? ccList : undefined,
        attachments: uploads.length ? uploads.map(u => ({ filename: u.name, content: u.content })) : undefined,
        meeting: emailMeeting(),
        scheduling_link: bookEnabled && bookLink.trim() ? bookLink.trim() : undefined,
        lead_id: lead?.id, lead_name: clientName,
      });
      onFinish({ meeting: buildMeeting(), audience: "client", emailTo: clientEmail.trim(), ccCount: ccList.length });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  const headerName = audience === "internal" ? "Internal meeting" : (clientName || lead?.company_name || "New meeting");

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80]" onClick={() => !sending && onClose()}>
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header + stepper */}
        <div className="px-6 pt-6 pb-4 border-b border-[var(--border)]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-[var(--tx1)] font-semibold">Schedule Meeting</h3>
              <p className="text-[var(--tx5)] text-xs mt-0.5">{headerName}{audience === "client" && clientCompany ? ` · ${clientCompany}` : ""}</p>
            </div>
            <button onClick={() => !sending && onClose()} className="text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors"><X size={16} /></button>
          </div>
          <div className="flex items-center gap-1">
            {flow.map((k, i) => {
              const done = idx > i, current = idx === i;
              return (
                <div key={k} className="flex items-center gap-1 flex-1 last:flex-none">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
                      done ? "bg-emerald-500 text-white" : current ? "bg-[var(--a)] text-white" : "bg-[var(--surface3)] text-[var(--tx5)]")}>
                      {done ? <Check size={11} /> : i + 1}
                    </span>
                    <span className={cn("text-[10px] font-medium hidden sm:block", current ? "text-[var(--tx2)]" : "text-[var(--tx5)]")}>{LABELS[k]}</span>
                  </div>
                  {i < flow.length - 1 && <span className={cn("flex-1 h-px", done ? "bg-emerald-500/50" : "bg-[var(--border)]")} />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-5">
          {/* ── Audience ── */}
          {stepKey === "audience" && (
            <div>
              <p className="text-[var(--tx5)] text-xs font-medium mb-3">Who is this meeting with?</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => pickAudience("internal")} className="flex flex-col items-center gap-2 p-6 rounded-xl border border-[var(--border)] bg-[var(--surface2)] hover:border-[var(--a-border)] hover:bg-[var(--a-subtle)] transition-all group">
                  <Users size={26} className="text-[var(--tx5)] group-hover:text-[var(--a-text)]" />
                  <span className="text-sm font-medium text-[var(--tx2)]">Internal</span>
                  <span className="text-[10px] text-[var(--tx5)] text-center">UFT team only</span>
                </button>
                <button onClick={() => pickAudience("client")} className="flex flex-col items-center gap-2 p-6 rounded-xl border border-[var(--border)] bg-[var(--surface2)] hover:border-sky-500/50 hover:bg-sky-500/10 transition-all group">
                  <Building2 size={26} className="text-[var(--tx5)] group-hover:text-sky-400" />
                  <span className="text-sm font-medium text-[var(--tx2)]">Client</span>
                  <span className="text-[10px] text-[var(--tx5)] text-center">With an external client</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Mode ── */}
          {stepKey === "mode" && (
            <div>
              <p className="text-[var(--tx5)] text-xs font-medium mb-3">How is the meeting happening?</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => pickMode("online")} className="flex flex-col items-center gap-2 p-6 rounded-xl border border-[var(--border)] bg-[var(--surface2)] hover:border-sky-500/50 hover:bg-sky-500/10 transition-all group">
                  <Video size={26} className="text-[var(--tx5)] group-hover:text-sky-400" />
                  <span className="text-sm font-medium text-[var(--tx2)]">Online</span>
                </button>
                <button onClick={() => pickMode("offline")} className="flex flex-col items-center gap-2 p-6 rounded-xl border border-[var(--border)] bg-[var(--surface2)] hover:border-amber-500/50 hover:bg-amber-500/10 transition-all group">
                  <MapPin size={26} className="text-[var(--tx5)] group-hover:text-amber-400" />
                  <span className="text-sm font-medium text-[var(--tx2)]">Offline (in person)</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Details ── */}
          {stepKey === "details" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface2)] rounded-lg">
                <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] border", mode === "online" ? "bg-sky-500/10 text-sky-400 border-sky-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30")}>
                  {mode === "online" ? <Video size={9} /> : <MapPin size={9} />}{mode === "online" ? "Online" : "In person"}
                </span>
                <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] border", audience === "client" ? "bg-sky-500/10 text-sky-400 border-sky-500/30" : "bg-[var(--a-muted)] text-[var(--a-text)] border-[var(--a-border)]")}>
                  {audience === "client" ? <Building2 size={9} /> : <Users size={9} />}{audience === "client" ? "Client" : "Internal"}
                </span>
              </div>

              {audience === "internal" ? (
                <div><label className={labelCls}>Meeting title <span className="text-rose-400">*</span></label><input className={inputCls} placeholder="Weekly pipeline review" value={internalTitle} onChange={e => setInternalTitle(e.target.value)} /></div>
              ) : lead ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface2)] rounded-lg">
                  <UserCircle size={13} className="text-[var(--tx5)]" />
                  <span className="text-[var(--tx3)] text-xs font-medium">{clientName}</span>
                  <span className="text-[var(--tx5)] text-[10px]">· {clientCompany}</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>Client name <span className="text-rose-400">*</span></label><input className={inputCls} placeholder="Jane Smith" value={clientName} onChange={e => setClientName(e.target.value)} /></div>
                  <div><label className={labelCls}>Company</label><input className={inputCls} placeholder="Acme Corp" value={clientCompany} onChange={e => setClientCompany(e.target.value)} /></div>
                </div>
              )}

              {audience === "client" && (
                <div><label className={labelCls}>Client email <span className="text-rose-400">*</span></label><input className={inputCls} type="email" placeholder="client@company.com" value={clientEmail} onChange={e => setClientEmail(e.target.value)} /></div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Date <span className="text-rose-400">*</span></label><input type="date" className={cn(inputCls, "[color-scheme:dark] cursor-pointer")} value={date} onChange={e => setDate(e.target.value)} onClick={e => { try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* unsupported → native icon still works */ } }} /></div>
                <div><label className={labelCls}>Time</label><TimePicker value={time} onChange={setTime} placeholder="Select time" /></div>
              </div>
              {mode === "offline" && (
                <div><label className={labelCls}>Location</label><input className={inputCls} placeholder="UFT Office, Conf Room 2 — Bengaluru" value={location} onChange={e => setLocation(e.target.value)} /></div>
              )}
            </div>
          )}

          {/* ── People + calendar ── */}
          {stepKey === "people" && (
            <div className="space-y-4">
              <div>
                <p className={labelCls}>Add people to the meeting</p>
                <div className="space-y-2">
                  <button onClick={toggleAll} className={cn("w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all", allSelected ? "bg-[var(--a-muted)] border-[var(--a-border)]" : "bg-[var(--surface2)] border-[var(--border)] hover:border-[var(--a-border)]")}>
                    <Users size={14} className={allSelected ? "text-[var(--a-text)]" : "text-[var(--tx5)]"} />
                    <span className={cn("text-xs font-medium flex-1", allSelected ? "text-[var(--a-text)]" : "text-[var(--tx3)]")}>All</span>
                    <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0", allSelected ? "bg-[var(--a)] border-[var(--a)]" : "border-[var(--tx6)]")}>{allSelected && <Check size={11} className="text-white" />}</div>
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLE_OPTIONS.map(r => {
                      const on = roles.has(r);
                      const count = users.filter(u => u.role === r).length;
                      return (
                        <button key={r} onClick={() => toggleRole(r)} className={cn("flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all", on ? "bg-[var(--a-subtle)] border-[var(--a-border)]" : "bg-[var(--surface2)] border-[var(--border)] hover:border-[var(--a-border)]")}>
                          <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0", on ? "bg-[var(--a)] border-[var(--a)]" : "border-[var(--tx6)]")}>{on && <Check size={11} className="text-white" />}</div>
                          <span className={cn("text-[11px] font-medium flex-1 leading-tight", on ? "text-[var(--tx2)]" : "text-[var(--tx3)]")}>{r}</span>
                          <span className="text-[9px] text-[var(--tx6)]">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {audience === "client" && selectedPeople.length > 0 && (
                  <p className="text-[10px] text-[var(--tx5)] mt-2">{selectedPeople.length} {selectedPeople.length === 1 ? "person" : "people"} will be copied (Cc) on the email.</p>
                )}
              </div>
              <button onClick={() => setAddToCalendar(v => !v)} className={cn("w-full flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all", addToCalendar ? "bg-emerald-500/10 border-emerald-500/40" : "bg-[var(--surface2)] border-[var(--border)] hover:border-[var(--a-border)]")}>
                <Calendar size={15} className={addToCalendar ? "text-emerald-400" : "text-[var(--tx5)]"} />
                <span className={cn("text-xs font-medium flex-1", addToCalendar ? "text-emerald-400" : "text-[var(--tx3)]")}>Add this meeting to the calendar</span>
                <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0", addToCalendar ? "bg-emerald-500 border-emerald-500" : "border-[var(--tx6)]")}>{addToCalendar && <Check size={11} className="text-white" />}</div>
              </button>

              {/* Self-scheduling link — added to the client email beside the .ics button */}
              {audience === "client" && (
                <div className="space-y-2">
                  <button onClick={() => setBookEnabled(v => !v)} className={cn("w-full flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all", bookEnabled ? "bg-sky-500/10 border-sky-500/40" : "bg-[var(--surface2)] border-[var(--border)] hover:border-[var(--a-border)]")}>
                    <CalendarClock size={15} className={bookEnabled ? "text-sky-400" : "text-[var(--tx5)]"} />
                    <span className={cn("text-xs font-medium flex-1", bookEnabled ? "text-sky-400" : "text-[var(--tx3)]")}>Include a self-scheduling link (Calendly / Cal.com)</span>
                    <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0", bookEnabled ? "bg-sky-500 border-sky-500" : "border-[var(--tx6)]")}>{bookEnabled && <Check size={11} className="text-white" />}</div>
                  </button>
                  {bookEnabled && (
                    <div>
                      <input className={inputCls} placeholder="https://calendly.com/you/30min" value={bookLink} onChange={e => setBookLink(e.target.value)} />
                      <p className="text-[10px] text-[var(--tx5)] mt-1">Adds a “Prefer a different time? Book a slot →” button to the email. Manage your default in <span className="text-[var(--tx3)]">Profile</span>.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Platform (online only) ── */}
          {stepKey === "platform" && (
            <div className="space-y-4">
              <p className="text-[var(--tx5)] text-xs font-medium">Where is the meeting taking place?</p>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map(p => {
                  const on = platform === p;
                  return (
                    <button key={p} onClick={() => setPlatform(p)} className={cn("flex items-center gap-2 p-3 rounded-xl border text-left transition-all", on ? "bg-sky-500/15 border-sky-500/50" : "bg-[var(--surface2)] border-[var(--border)] hover:border-[var(--a-border)]")}>
                      <Video size={14} className={on ? "text-sky-400" : "text-[var(--tx5)]"} />
                      <span className={cn("text-xs font-medium", on ? "text-sky-400" : "text-[var(--tx3)]")}>{p}</span>
                    </button>
                  );
                })}
              </div>
              {platform === "Other" && (
                <div>
                  <label className={labelCls}>Platform / link <span className="text-rose-400">*</span></label>
                  <input className={inputCls} placeholder="e.g. Webex, or a join link" value={otherSource} onChange={e => setOtherSource(e.target.value)} />
                </div>
              )}
            </div>
          )}

          {/* ── Sender info (client only) ── */}
          {stepKey === "sender" && (
            <div className="space-y-4">
              <p className="text-[var(--tx5)] text-xs">Your details (used in the email signature). All fields required.</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Your name <span className="text-rose-400">*</span></label><input className={inputCls} value={sender.name} onChange={e => setSender(s => ({ ...s, name: e.target.value }))} /></div>
                <div><label className={labelCls}>Your title <span className="text-rose-400">*</span></label><input className={inputCls} placeholder="Account Manager" value={sender.title} onChange={e => setSender(s => ({ ...s, title: e.target.value }))} /></div>
              </div>
              <div><label className={labelCls}>Company name <span className="text-rose-400">*</span></label><input className={inputCls} value={sender.company} onChange={e => setSender(s => ({ ...s, company: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Phone number <span className="text-rose-400">*</span></label><input className={inputCls} placeholder="+91 …" value={sender.phone} onChange={e => setSender(s => ({ ...s, phone: e.target.value }))} /></div>
                <div><label className={labelCls}>Website URL <span className="text-rose-400">*</span></label><input className={inputCls} placeholder="www.uftech.com" value={sender.website} onChange={e => setSender(s => ({ ...s, website: e.target.value }))} /></div>
              </div>
            </div>
          )}

          {/* ── Documents (client only) ── */}
          {stepKey === "documents" && (
            <div className="space-y-3">
              <p className="text-[var(--tx5)] text-xs font-medium">Attach documents to the email <span className="text-[var(--tx6)] font-normal">(optional)</span></p>

              {/* Search + upload */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg">
                  <Search size={13} className="text-[var(--tx5)] shrink-0" />
                  <input className="flex-1 bg-transparent text-[var(--tx2)] text-xs placeholder:text-[var(--tx6)] focus:outline-none" placeholder="Search documents…" value={docSearch} onChange={e => setDocSearch(e.target.value)} />
                </div>
                <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx3)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors shrink-0"><Upload size={13} /> Upload</button>
                <input ref={fileRef} type="file" className="hidden" onChange={onFilePicked} />
              </div>

              {/* DB documents list */}
              <div className="border border-[var(--border)] rounded-lg max-h-48 overflow-y-auto divide-y divide-[var(--border)]">
                {filteredDocs.length === 0 ? (
                  <p className="text-[var(--tx6)] text-xs italic px-3 py-4 text-center">{dbDocs.length === 0 ? "No documents in the database yet." : "No documents match your search."}</p>
                ) : filteredDocs.map(d => {
                  const on = selectedDbIds.has(d.id);
                  return (
                    <button key={d.id} onClick={() => toggleDbDoc(d.id)} className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors", on ? "bg-[var(--a-subtle)]" : "hover:bg-[var(--surface2)]")}>
                      <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0", on ? "bg-[var(--a)] border-[var(--a)]" : "border-[var(--tx6)]")}>{on && <Check size={11} className="text-white" />}</div>
                      <FileText size={13} className="text-[var(--a-text)] shrink-0" />
                      <span className="text-[var(--tx2)] text-xs flex-1 truncate">{d.name}</span>
                      <span className="text-[9px] text-[var(--tx6)]">{d.type}</span>
                    </button>
                  );
                })}
              </div>

              {/* Freshly uploaded (this email) */}
              {uploads.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-[var(--tx5)]">Uploaded for this email</p>
                  {uploads.map((u, i) => (
                    <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--surface2)] rounded-lg">
                      <Upload size={11} className="text-emerald-400 shrink-0" />
                      <span className="text-[var(--tx2)] text-xs flex-1 truncate">{u.name}</span>
                      <button onClick={() => removeUpload(i)} className="text-[var(--tx5)] hover:text-rose-400 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1.5 text-[10px] text-[var(--tx5)]">
                <Paperclip size={11} />
                {attachmentNames.length === 0 ? "No documents attached" : `${attachmentNames.length} document${attachmentNames.length === 1 ? "" : "s"} will be attached`}
              </div>

              {/* Prompt: save uploaded file to the database? */}
              {pendingUpload && (
                <div className="rounded-xl border border-[var(--a-border)] bg-[var(--a-subtle)] p-3 space-y-2.5">
                  <p className="text-[var(--tx2)] text-xs font-medium">Add <span className="text-[var(--a-text)]">{pendingUpload.name}</span> to the document database?</p>
                  <div className="flex gap-2">
                    <button onClick={() => confirmUpload(true)} className="flex-1 py-2 bg-[var(--a)] text-white text-xs rounded-lg hover:bg-[var(--a-hover)] font-medium transition-colors">Add to Database</button>
                    <button onClick={() => confirmUpload(false)} className="flex-1 py-2 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors">Just attach</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Email compose / preview (client only) ── */}
          {stepKey === "email" && !previewing && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] text-[var(--tx5)] flex-wrap">
                <span className="px-2 py-1 bg-[var(--surface2)] rounded-md"><span className="text-[var(--tx6)]">To:</span> {clientEmail}</span>
                {ccList.length > 0 && <span className="px-2 py-1 bg-[var(--surface2)] rounded-md"><span className="text-[var(--tx6)]">Cc:</span> {ccList.length} recipient{ccList.length === 1 ? "" : "s"}</span>}
                {attachmentNames.length > 0 && <span className="px-2 py-1 bg-[var(--surface2)] rounded-md flex items-center gap-1"><Paperclip size={9} /> {attachmentNames.length}</span>}
              </div>
              <div><label className={labelCls}>Subject</label><input className={inputCls} value={subject} onChange={e => setSubject(e.target.value)} /></div>
              <div><label className={labelCls}>Message <span className="text-[var(--tx6)] font-normal">(editable)</span></label>
                <textarea rows={14} className={cn(inputCls, "resize-y leading-relaxed font-mono text-[11px]")} value={emailBody} onChange={e => setEmailBody(e.target.value)} />
              </div>
              {mode === "online" && date && (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400"><Calendar size={11} /> A calendar invite (.ics) + “Add to my calendar” link will be included.</div>
              )}
              {bookEnabled && bookLink.trim() && (
                <div className="flex items-center gap-1.5 text-[10px] text-sky-400"><CalendarClock size={11} /> A “Book a slot” link will be included.</div>
              )}
            </div>
          )}

          {stepKey === "email" && previewing && (
            <div className="space-y-3">
              <p className="text-[var(--tx5)] text-xs font-medium flex items-center gap-1.5"><Mail size={12} /> Email preview</p>
              <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="bg-[var(--surface2)] px-4 py-2.5 border-b border-[var(--border)] space-y-1">
                  <p className="text-[10px] text-[var(--tx5)]"><span className="text-[var(--tx6)]">To:</span> {clientEmail}</p>
                  {ccList.length > 0 && <p className="text-[10px] text-[var(--tx5)] break-all"><span className="text-[var(--tx6)]">Cc:</span> {ccList.join(", ")}</p>}
                  <p className="text-[10px] text-[var(--tx3)] font-medium"><span className="text-[var(--tx6)]">Subject:</span> {subject}</p>
                  {attachmentNames.length > 0 && <p className="text-[10px] text-[var(--tx5)] break-all flex items-start gap-1"><Paperclip size={10} className="mt-0.5 shrink-0" /> {attachmentNames.join(", ")}</p>}
                </div>
                <div className="px-4 py-3 max-h-[40vh] overflow-y-auto">
                  <p className="text-[var(--tx3)] text-[11px] leading-relaxed whitespace-pre-wrap">{emailBody}</p>
                  {mode === "online" && date && (
                    <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-[10px] text-emerald-400"><Calendar size={11} /> Calendar invite (.ics) + “Add to my calendar” link attached</div>
                  )}
                  {bookEnabled && bookLink.trim() && (
                    <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-500/10 border border-sky-500/30 rounded-lg text-[10px] text-sky-400"><CalendarClock size={11} /> “Book a slot” link attached</div>
                  )}
                </div>
              </div>
              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                  <AlertCircle size={13} className="text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-rose-400 text-xs leading-relaxed">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center gap-3 px-6 pb-6">
          {stepKey !== "audience" && stepKey !== "mode" && stepKey !== "email" && (
            <button onClick={() => setIdx(idx - 1)} className="flex items-center gap-1.5 px-4 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors"><ArrowLeft size={14} /> Back</button>
          )}
          <div className="flex-1" />

          {stepKey === "details" && (
            <button onClick={() => setIdx(idx + 1)} disabled={!detailsComplete} className="flex items-center gap-1.5 px-5 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Next <ArrowRight size={14} /></button>
          )}
          {stepKey === "people" && (
            isLastStep
              ? <button onClick={createInternal} className="flex items-center gap-1.5 px-5 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors"><Calendar size={14} /> Create Meeting</button>
              : <button onClick={() => setIdx(idx + 1)} className="flex items-center gap-1.5 px-5 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors">{audience === "client" ? "Apply" : "Next"} <ArrowRight size={14} /></button>
          )}
          {stepKey === "platform" && (
            isLastStep
              ? <button onClick={createInternal} disabled={!platformComplete} className="flex items-center gap-1.5 px-5 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><Calendar size={14} /> Create Meeting</button>
              : <button onClick={() => setIdx(idx + 1)} disabled={!platformComplete} className="flex items-center gap-1.5 px-5 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Next <ArrowRight size={14} /></button>
          )}
          {stepKey === "sender" && (
            <button onClick={() => setIdx(idx + 1)} disabled={!senderComplete} className="flex items-center gap-1.5 px-5 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Next <ArrowRight size={14} /></button>
          )}
          {stepKey === "documents" && (
            <button onClick={goToEmail} className="flex items-center gap-1.5 px-5 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors">Compose Email <ArrowRight size={14} /></button>
          )}
          {stepKey === "email" && !previewing && (
            <>
              <button onClick={() => setIdx(idx - 1)} className="flex items-center gap-1.5 px-4 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors"><ArrowLeft size={14} /> Back</button>
              <button onClick={() => { setError(""); setPreviewing(true); }} disabled={!subject.trim() || !emailBody.trim()} className="flex items-center gap-1.5 px-5 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Confirm <ArrowRight size={14} /></button>
            </>
          )}
          {stepKey === "email" && previewing && (
            <>
              <button onClick={() => setPreviewing(false)} disabled={sending} className="flex items-center gap-1.5 px-4 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors disabled:opacity-50"><Pencil size={13} /> Edit</button>
              <button onClick={onClose} disabled={sending} className="px-4 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleSend} disabled={sending} className="flex items-center gap-1.5 px-5 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-50">
                {sending ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> Send</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
