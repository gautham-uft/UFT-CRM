"use client";

import { useState } from "react";
import { X, UserCircle, CalendarClock, Briefcase, Phone, Check, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useCollection } from "@/hooks/useCollection";

// A user's own profile — editable per-person info stored on their `users` record.
// Today it holds a self-scheduling link (Calendly/Cal.com) plus title/phone; it's
// the place to grow per-user settings over time. Identity comes from
// CurrentUserContext (this app has no per-user auth — see that context's note).
type UserRow = {
  id: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  email?: string;
  job_title?: string;
  phone?: string;
  scheduling_link?: string;
};

const inputCls = "w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-sm focus:outline-none focus:border-[var(--a-border)] transition-colors";
const labelCls = "block text-[var(--tx5)] text-xs font-medium mb-1.5";

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const { currentUser } = useCurrentUser();
  const { items, create, update } = useCollection<UserRow>("users");
  const row = items.find(u => u.id === currentUser.id);

  const [form, setForm] = useState({
    job_title:       row?.job_title ?? "",
    phone:           row?.phone ?? "",
    scheduling_link: row?.scheduling_link ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const patch = {
        job_title:       form.job_title.trim(),
        phone:           form.phone.trim(),
        scheduling_link: form.scheduling_link.trim(),
      };
      if (row) await update(row.id, patch);
      // No row yet (e.g. the built-in Director identity) — create one keyed to the id.
      else await create({ id: currentUser.id, first_name: currentUser.first_name, last_name: currentUser.last_name, email: currentUser.email, role: currentUser.role, ...patch });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const fullName = `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.role;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[90]" onClick={onClose}>
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md mx-4 shadow-2xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[var(--border)]">
          <h3 className="text-[var(--tx1)] font-semibold flex items-center gap-2"><UserCircle size={18} className="text-[var(--a-text)]" /> My Profile</h3>
          <button onClick={onClose} className="text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors mt-0.5"><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Identity (read-only) */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--a-muted)] flex items-center justify-center text-[var(--a-text)] text-base font-semibold shrink-0">
              {(currentUser.first_name?.[0] ?? "") + (currentUser.last_name?.[0] ?? "") || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-[var(--tx1)] font-medium">{fullName}</p>
              <p className="text-[var(--tx5)] text-xs">{currentUser.role}{currentUser.email ? ` · ${currentUser.email}` : ""}</p>
            </div>
          </div>

          <div>
            <label className={labelCls}><span className="flex items-center gap-1.5"><Briefcase size={12} /> Job title</span></label>
            <input className={inputCls} placeholder="Account Manager" value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} />
          </div>

          <div>
            <label className={labelCls}><span className="flex items-center gap-1.5"><Phone size={12} /> Phone</span></label>
            <input className={inputCls} placeholder="+91 …" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>

          <div>
            <label className={labelCls}><span className="flex items-center gap-1.5"><CalendarClock size={12} className="text-sky-400" /> Scheduling link</span></label>
            <input className={inputCls} placeholder="https://calendly.com/you/30min" value={form.scheduling_link} onChange={e => setForm(f => ({ ...f, scheduling_link: e.target.value }))} />
            <p className="text-[var(--tx6)] text-[11px] mt-1.5">Your Calendly / Cal.com (or any) booking link. When set, meeting emails you send offer a “Book a slot” button so clients can pick another time. Yours alone — not shared.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-lg hover:border-[var(--a-border)] transition-colors">Close</button>
          <button onClick={save} disabled={saving} className={cn("flex items-center gap-2 px-4 py-2 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50", saved ? "bg-emerald-500" : "bg-[var(--a)] hover:bg-[var(--a-hover)]")}>
            {saved ? <><Check size={15} /> Saved</> : <><Save size={15} /> {saving ? "Saving…" : "Save"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
