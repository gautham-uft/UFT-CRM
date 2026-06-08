"use client";

import { useState } from "react";
import { mockAccounts, mockContacts, mockDeals } from "@/lib/mock-data";
import { Plus, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppData } from "@/contexts/AppDataContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import NoAccess from "@/components/NoAccess";

const activityIcons: Record<string, string> = {
  call_log: "📞", email: "✉️", note: "📝", meeting: "📅",
};

const activityColors: Record<string, string> = {
  call_log: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  email:    "bg-violet-500/15 text-violet-400 border-violet-500/30",
  note:     "bg-amber-500/15 text-amber-400 border-amber-500/30",
  meeting:  "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const entityColors: Record<string, string> = {
  deal: "text-emerald-400", contact: "text-sky-400", account: "text-amber-400", lead: "text-violet-400",
};

const RELATED_OPTIONS = [
  ...mockDeals.map(d    => ({ label: `Deal: ${d.name}`,           entity_type: "deal",    entity_name: d.name })),
  ...mockContacts.map(c => ({ label: `Contact: ${c.first_name} ${c.last_name}`, entity_type: "contact", entity_name: `${c.first_name} ${c.last_name}` })),
  ...mockAccounts.map(a => ({ label: `Account: ${a.name}`,        entity_type: "account", entity_name: a.name })),
];

export default function ActivitiesPage() {
  const { activities, addActivity } = useAppData();
  const { ready, canRead, canWrite: cw } = usePermissions();
  const canWrite = cw("Activities");

  const [filter,     setFilter]     = useState("all");
  const [showModal,  setShowModal]  = useState(false);
  const [logType,    setLogType]    = useState<"call_log" | "email" | "note" | "meeting">("call_log");
  const [logRelated, setLogRelated] = useState(RELATED_OPTIONS[0].label);
  const [logNote,    setLogNote]    = useState("");
  const [toast,      setToast]      = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  const filtered = filter === "all" ? activities : activities.filter(a => a.activity_type === filter);

  function handleSaveActivity() {
    if (!logNote.trim()) return;
    const related = RELATED_OPTIONS.find(o => o.label === logRelated) ?? RELATED_OPTIONS[0];
    addActivity({
      user:          "Gautham V.",
      entity_type:   related.entity_type,
      entity_name:   related.entity_name,
      activity_type: logType,
      description:   logNote.trim(),
      created_at:    new Date().toISOString(),
    });
    setLogNote("");
    setShowModal(false);
    showToast("Activity logged");
  }

  if (ready && !canRead("Activities")) return <NoAccess module="Activities" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1 w-fit">
          {["all","call_log","email","note","meeting"].map(t => (
            <button key={t} onClick={() => setFilter(t)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors", filter === t ? "bg-[var(--a)] text-white" : "text-[var(--tx4)] hover:text-[var(--tx2)]")}>
              {t === "all" ? "All" : t === "call_log" ? "Calls" : t.charAt(0).toUpperCase() + t.slice(1) + "s"}
            </button>
          ))}
        </div>
        {canWrite && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--a)] text-white text-xs rounded-lg hover:bg-[var(--a-hover)] transition-colors">
            <Plus size={13} /> Log Activity
          </button>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-px bg-[var(--border)]" />
        <div className="space-y-4">
          {filtered.map(a => (
            <div key={a.id} className="flex gap-4 pl-3">
              <div className="w-6 h-6 rounded-full bg-[var(--surface)] border-2 border-[var(--border)] flex items-center justify-center text-xs z-10 shrink-0 mt-3">
                {activityIcons[a.activity_type] ?? "📌"}
              </div>
              <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--a-border)] transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs border capitalize", activityColors[a.activity_type])}>
                      {a.activity_type === "call_log" ? "Call" : a.activity_type.charAt(0).toUpperCase() + a.activity_type.slice(1)}
                    </span>
                    <span className="text-[var(--tx5)] text-xs">on</span>
                    <span className={cn("text-xs font-medium", entityColors[a.entity_type])}>{a.entity_name}</span>
                    <span className="text-[var(--tx6)] text-xs capitalize">({a.entity_type})</span>
                  </div>
                  <span className="text-[var(--tx6)] text-xs shrink-0">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                <p className="text-[var(--tx3)] text-sm leading-relaxed">{a.description}</p>
                <p className="text-[var(--tx6)] text-xs mt-2">by {a.user}</p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="pl-10 text-[var(--tx5)] text-sm py-4">No activities found.</p>
          )}
        </div>
      </div>

      {/* ── Log Activity modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-[var(--tx1)] font-semibold mb-4">Log New Activity</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[var(--tx5)] text-xs block mb-1">Activity Type</label>
                <select className="w-full bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx3)] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--a-border)]" value={logType} onChange={e => setLogType(e.target.value as typeof logType)}>
                  <option value="call_log">Call</option>
                  <option value="email">Email</option>
                  <option value="note">Note</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>
              <div>
                <label className="text-[var(--tx5)] text-xs block mb-1">Related To</label>
                <select className="w-full bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx3)] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--a-border)]" value={logRelated} onChange={e => setLogRelated(e.target.value)}>
                  {RELATED_OPTIONS.map(o => <option key={o.label} value={o.label}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[var(--tx5)] text-xs block mb-1">Notes *</label>
                <textarea rows={3} placeholder="What happened in this interaction?" className="w-full bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx3)] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--a-border)] placeholder-[var(--tx6)] resize-none" value={logNote} onChange={e => setLogNote(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowModal(false); setLogNote(""); }} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl">Cancel</button>
              <button onClick={handleSaveActivity} disabled={!logNote.trim()} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] disabled:opacity-40 disabled:cursor-not-allowed">Save Activity</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] px-4 py-3 rounded-xl text-sm font-medium shadow-2xl bg-[var(--surface)] border border-[var(--a-border)] text-[var(--a-text)] flex items-center gap-2">
          <CheckCircle size={14} /> {toast}
        </div>
      )}
    </div>
  );
}
