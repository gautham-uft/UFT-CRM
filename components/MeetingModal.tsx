"use client";

import { useState } from "react";
import {
  CalendarPlus, X, Video, MapPin, Plus, Trash2, Users, Building2, Film,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SearchableSelect from "@/components/SearchableSelect";
import type { CalendarEvent, MeetingAttendee } from "@/lib/mock-data";

const inputCls = "w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-xs placeholder:text-[var(--tx6)] focus:outline-none focus:border-[var(--a-border)] transition-colors";
const labelCls = "block text-[var(--tx5)] text-xs font-medium mb-1";

export type MeetingPayload = Omit<CalendarEvent, "id">;

type LeadPrefill = {
  id:           string;
  first_name:   string;
  last_name:    string;
  company_name: string;
  email?:       string;
};

const PLATFORMS = ["Google Meet", "Zoom", "Microsoft Teams", "Phone Call", "Other"];

// Shared meeting scheduler. Captures online/offline mode, platform/link or
// location, the full attendee list, and an optional recording link. Used both
// from the global Quick Actions and from a lead's detail (pre-linked via `lead`).
export default function MeetingModal({
  onClose, onSave, userOptions, today, lead, existing,
}: {
  onClose:     () => void;
  onSave:      (payload: MeetingPayload) => void;
  userOptions: { value: string; label: string }[];
  today:       string;
  lead?:       LeadPrefill;
  existing?:   CalendarEvent;
}) {
  const leadName = lead ? `${lead.first_name} ${lead.last_name}`.trim() : "";

  const [title,    setTitle]    = useState(existing?.title ?? (lead ? `Meeting with ${leadName}` : ""));
  const [date,     setDate]     = useState(existing?.date ?? today);
  const [time,     setTime]     = useState(existing?.time ?? "");
  const [assignee, setAssignee] = useState(existing?.assignee ?? "");
  const [relatedTo, setRelatedTo] = useState(existing?.related_to ?? (lead ? lead.company_name : ""));
  const [mode,     setMode]     = useState<"online" | "offline">(existing?.meeting_mode ?? "online");
  const [platform, setPlatform] = useState(existing?.meeting_platform ?? "Google Meet");
  const [link,     setLink]     = useState(existing?.meeting_link ?? "");
  const [location, setLocation] = useState(existing?.location ?? "");
  const [recording, setRecording] = useState(existing?.recording_url ?? "");

  // Attendees — pre-seed with the lead (external) when creating from a lead.
  const [attendees, setAttendees] = useState<MeetingAttendee[]>(
    existing?.attendees ??
      (lead ? [{ name: leadName, email: lead.email, is_external: true }] : []),
  );
  const [attName,  setAttName]  = useState("");
  const [attEmail, setAttEmail] = useState("");
  const [attExternal, setAttExternal] = useState(true);

  function addAttendee() {
    if (!attName.trim()) return;
    setAttendees(prev => [...prev, { name: attName.trim(), email: attEmail.trim() || undefined, is_external: attExternal }]);
    setAttName(""); setAttEmail(""); setAttExternal(true);
  }
  function removeAttendee(i: number) {
    setAttendees(prev => prev.filter((_, idx) => idx !== i));
  }

  function submit() {
    if (!title.trim() || !date) return;
    onSave({
      title:    title.trim(),
      date,
      time:     time || undefined,
      type:     "meeting",
      assignee: assignee || undefined,
      related_to: relatedTo.trim() || undefined,
      meeting_mode:     mode,
      meeting_platform: mode === "online" ? platform : undefined,
      meeting_link:     mode === "online" ? (link.trim() || undefined) : undefined,
      location:         mode === "offline" ? (location.trim() || undefined) : undefined,
      attendees:        attendees.length ? attendees : undefined,
      recording_url:    recording.trim() || undefined,
      lead_id:          lead?.id ?? existing?.lead_id,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80]" onClick={onClose}>
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[var(--a-muted)] flex items-center justify-center"><CalendarPlus size={18} className="text-[var(--a-text)]" /></span>
            <div>
              <h3 className="text-[var(--tx1)] font-semibold">{existing ? "Edit Meeting" : "Schedule Meeting"}</h3>
              {lead && <p className="text-[var(--tx5)] text-xs mt-0.5">with {leadName} · {lead.company_name}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <div><label className={labelCls}>Title *</label><input className={inputCls} placeholder="Demo call with Acme" value={title} onChange={e => setTitle(e.target.value)} /></div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Date *</label><input type="date" className={cn(inputCls, "[color-scheme:dark]")} value={date} onChange={e => setDate(e.target.value)} /></div>
            <div><label className={labelCls}>Time</label><input type="time" className={cn(inputCls, "[color-scheme:dark]")} value={time} onChange={e => setTime(e.target.value)} /></div>
          </div>

          {/* Mode toggle */}
          <div>
            <label className={labelCls}>How is the meeting happening?</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMode("online")} className={cn("flex items-center gap-2 p-3 rounded-xl border text-left transition-all", mode === "online" ? "bg-sky-500/15 border-sky-500/50" : "bg-[var(--surface2)] border-[var(--border)] hover:border-[var(--a-border)]")}>
                <Video size={15} className={mode === "online" ? "text-sky-400" : "text-[var(--tx5)]"} />
                <span className={cn("text-xs font-medium", mode === "online" ? "text-sky-400" : "text-[var(--tx3)]")}>Online</span>
              </button>
              <button type="button" onClick={() => setMode("offline")} className={cn("flex items-center gap-2 p-3 rounded-xl border text-left transition-all", mode === "offline" ? "bg-amber-500/15 border-amber-500/50" : "bg-[var(--surface2)] border-[var(--border)] hover:border-[var(--a-border)]")}>
                <MapPin size={15} className={mode === "offline" ? "text-amber-400" : "text-[var(--tx5)]"} />
                <span className={cn("text-xs font-medium", mode === "offline" ? "text-amber-400" : "text-[var(--tx3)]")}>Offline (in person)</span>
              </button>
            </div>
          </div>

          {/* Online: platform + link */}
          {mode === "online" && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Platform</label>
                <select className={inputCls} value={platform} onChange={e => setPlatform(e.target.value)}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Meeting link</label><input className={inputCls} placeholder="https://meet.google.com/…" value={link} onChange={e => setLink(e.target.value)} /></div>
            </div>
          )}

          {/* Offline: location */}
          {mode === "offline" && (
            <div><label className={labelCls}>Location / Place</label><input className={inputCls} placeholder="UFT Office, Conf Room 2 — Bangalore" value={location} onChange={e => setLocation(e.target.value)} /></div>
          )}

          {/* Owner */}
          <div><label className={labelCls}>Meeting owner (internal)</label>
            <SearchableSelect value={assignee} onChange={setAssignee} placeholder="Select a person (optional)" options={userOptions} />
          </div>

          {!lead && (
            <div><label className={labelCls}>Related to</label><input className={inputCls} placeholder="Account, deal, etc. (optional)" value={relatedTo} onChange={e => setRelatedTo(e.target.value)} /></div>
          )}

          {/* Attendees */}
          <div>
            <label className={labelCls}>Attendees — people in the meeting</label>
            {attendees.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {attendees.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--surface2)] rounded-lg">
                    {a.is_external ? <Building2 size={12} className="text-amber-400 shrink-0" /> : <Users size={12} className="text-sky-400 shrink-0" />}
                    <span className="text-[var(--tx2)] text-xs flex-1 truncate">{a.name}{a.email && <span className="text-[var(--tx5)]"> · {a.email}</span>}</span>
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border", a.is_external ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : "text-sky-400 border-sky-500/30 bg-sky-500/10")}>{a.is_external ? "Client" : "Internal"}</span>
                    <button onClick={() => removeAttendee(i)} className="text-[var(--tx5)] hover:text-rose-400 transition-colors"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input className={cn(inputCls, "flex-1")} placeholder="Name" value={attName} onChange={e => setAttName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addAttendee(); } }} />
              <input className={cn(inputCls, "flex-1")} placeholder="Email (optional)" value={attEmail} onChange={e => setAttEmail(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addAttendee(); } }} />
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1 bg-[var(--surface2)] border border-[var(--border)] rounded-lg p-0.5">
                <button type="button" onClick={() => setAttExternal(true)}  className={cn("px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors", attExternal ? "bg-amber-500/20 text-amber-400" : "text-[var(--tx5)]")}>Client</button>
                <button type="button" onClick={() => setAttExternal(false)} className={cn("px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors", !attExternal ? "bg-sky-500/20 text-sky-400" : "text-[var(--tx5)]")}>Internal</button>
              </div>
              <button type="button" onClick={addAttendee} disabled={!attName.trim()} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx3)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><Plus size={12} /> Add</button>
            </div>
          </div>

          {/* Recording */}
          <div>
            <label className={labelCls}>Recording link <span className="text-[var(--tx6)] font-normal">(optional — add after the meeting)</span></label>
            <div className="flex items-center gap-2">
              <Film size={14} className="text-rose-400 shrink-0" />
              <input className={inputCls} placeholder="https://drive.google.com/… or Zoom cloud link" value={recording} onChange={e => setRecording(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors">Cancel</button>
          <button onClick={submit} disabled={!title.trim() || !date} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">{existing ? "Save Changes" : "Schedule"}</button>
        </div>
      </div>
    </div>
  );
}
