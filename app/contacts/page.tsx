"use client";

import { useState } from "react";
import { mockContacts } from "@/lib/mock-data";
import { Plus, Mail, Phone, Building2, X, CheckCircle } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { useCollection } from "@/hooks/useCollection";

type Contact = (typeof mockContacts)[0];

const inputCls = "w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-xs placeholder:text-[var(--tx6)] focus:outline-none focus:border-[var(--a-border)] transition-colors";
const labelCls = "block text-[var(--tx5)] text-xs font-medium mb-1";

const EMPTY_FORM = { first_name: "", last_name: "", job_title: "", account_name: "", email: "", phone: "" };

export default function ContactsPage() {
  const { activities, addActivity } = useAppData();

  const { items: contacts, create: createContact } = useCollection<Contact>("contacts");
  const [selected,      setSelected]      = useState<Contact | null>(null);
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [showLogModal,  setShowLogModal]  = useState(false);
  const [addForm,       setAddForm]       = useState(EMPTY_FORM);
  const [logNote,       setLogNote]       = useState("");
  const [logType,       setLogType]       = useState<"call_log" | "email" | "note" | "meeting">("call_log");
  const [toast,         setToast]         = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  const relatedActivities = selected
    ? activities.filter(a =>
        a.entity_name.toLowerCase().includes(selected.first_name.toLowerCase()) ||
        a.entity_name.toLowerCase().includes(selected.last_name.toLowerCase()) ||
        a.entity_name.toLowerCase().includes(selected.account_name?.toLowerCase() ?? "")
      )
    : [];

  function handleAddContact() {
    if (!addForm.first_name.trim() || !addForm.email.trim()) return;
    createContact({
      account_id:   "",
      first_name:   addForm.first_name.trim(),
      last_name:    addForm.last_name.trim(),
      email:        addForm.email.trim(),
      phone:        addForm.phone.trim(),
      job_title:    addForm.job_title.trim(),
      account_name: addForm.account_name.trim(),
    });
    setAddForm(EMPTY_FORM);
    setShowAddModal(false);
    showToast("Contact added");
  }

  function handleLogActivity() {
    if (!selected || !logNote.trim()) return;
    addActivity({
      user:          "Gautham V.",
      entity_type:   "contact",
      entity_name:   `${selected.first_name} ${selected.last_name}`,
      activity_type: logType,
      description:   logNote.trim(),
      created_at:    new Date().toISOString(),
    });
    setLogNote("");
    setShowLogModal(false);
    showToast(`${logType === "call_log" ? "Call" : logType} logged for ${selected.first_name}`);
  }

  return (
    <div className="h-[calc(100vh-112px)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[var(--tx5)] text-sm">{contacts.length} contacts</span>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--a)] text-white text-xs rounded-lg hover:bg-[var(--a-hover)] transition-colors">
          <Plus size={13} /> Add Contact
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Name","Title","Account","Email","Phone"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-[var(--tx5)] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {contacts.map(c => (
                <tr key={c.id} onClick={() => setSelected(c)} className="hover:bg-[var(--surface2)] transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 text-xs font-medium">{c.first_name[0]}{c.last_name[0]}</div>
                      <span className="text-[var(--tx2)] font-medium">{c.first_name} {c.last_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--tx4)] text-xs">{c.job_title || "—"}</td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1.5 text-[var(--tx4)] text-xs"><Building2 size={11} className="text-amber-400" /> {c.account_name || "—"}</span></td>
                  <td className="px-4 py-3 text-[var(--tx4)] text-xs">{c.email}</td>
                  <td className="px-4 py-3 text-[var(--tx5)] text-xs">{c.phone || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Contact detail modal ── */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col gap-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 className="text-[var(--tx2)] font-semibold text-sm">Contact Detail</h2>
              <button onClick={() => setSelected(null)} className="text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors"><X size={14} /></button>
            </div>
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="w-16 h-16 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 text-2xl font-bold">{selected.first_name[0]}{selected.last_name[0]}</div>
              <p className="text-[var(--tx1)] font-semibold text-base">{selected.first_name} {selected.last_name}</p>
              <p className="text-[var(--tx4)] text-xs">{selected.job_title || "No title"}</p>
              <span className="flex items-center gap-1.5 text-amber-400 text-xs"><Building2 size={11} /> {selected.account_name || "No account"}</span>
            </div>
            <div className="space-y-2.5">
              <a href={`mailto:${selected.email}`} className="flex items-center gap-3 p-2.5 bg-[var(--surface2)] rounded-lg hover:bg-[var(--surface3)] transition-colors">
                <Mail size={14} className="text-[var(--a-text)]" />
                <span className="text-[var(--tx3)] text-xs truncate">{selected.email}</span>
              </a>
              <a href={`tel:${selected.phone}`} className="flex items-center gap-3 p-2.5 bg-[var(--surface2)] rounded-lg hover:bg-[var(--surface3)] transition-colors">
                <Phone size={14} className="text-emerald-400" />
                <span className="text-[var(--tx3)] text-xs">{selected.phone || "No phone"}</span>
              </a>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setLogType("call_log"); setShowLogModal(true); }}
                className="flex-1 py-2 bg-[var(--a-muted)] border border-[var(--a-border)] text-[var(--a-text)] text-xs rounded-lg hover:bg-[var(--a-muted)] transition-colors"
              >Log Call</button>
              <button
                onClick={() => window.open(`mailto:${selected.email}`, "_blank")}
                className="flex-1 py-2 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors"
              >Send Email</button>
            </div>
            <div>
              <p className="text-[var(--tx5)] text-xs font-medium mb-3">Activity Timeline</p>
              {relatedActivities.length === 0 ? (
                <p className="text-[var(--tx6)] text-xs">No activities yet.</p>
              ) : (
                <div className="space-y-3">
                  {relatedActivities.map(a => (
                    <div key={a.id} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--a)] mt-1.5 shrink-0" />
                      <div><p className="text-[var(--tx4)] text-xs leading-relaxed">{a.description}</p><p className="text-[var(--tx6)] text-xs mt-0.5">{new Date(a.created_at).toLocaleDateString()}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Log Activity modal ── */}
      {showLogModal && selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[var(--tx1)] font-semibold">Log Activity</h3>
              <button onClick={() => setShowLogModal(false)} className="text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={16} /></button>
            </div>
            <p className="text-[var(--tx5)] text-xs mb-4">{selected.first_name} {selected.last_name} · {selected.account_name}</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Activity Type</label>
                <select className={inputCls} value={logType} onChange={e => setLogType(e.target.value as typeof logType)}>
                  <option value="call_log">Call</option>
                  <option value="email">Email</option>
                  <option value="note">Note</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Notes *</label>
                <textarea rows={3} className={inputCls} placeholder="What happened in this interaction?" value={logNote} onChange={e => setLogNote(e.target.value)} style={{ resize: "none" }} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowLogModal(false)} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl">Cancel</button>
              <button onClick={handleLogActivity} disabled={!logNote.trim()} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] disabled:opacity-40 disabled:cursor-not-allowed">Save Activity</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Contact modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[var(--tx1)] font-semibold">Add Contact</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>First Name *</label><input className={inputCls} placeholder="Jane" value={addForm.first_name} onChange={e => setAddForm(f => ({ ...f, first_name: e.target.value }))} /></div>
                <div><label className={labelCls}>Last Name</label><input className={inputCls} placeholder="Smith" value={addForm.last_name} onChange={e => setAddForm(f => ({ ...f, last_name: e.target.value }))} /></div>
              </div>
              <div><label className={labelCls}>Job Title</label><input className={inputCls} placeholder="VP of Engineering" value={addForm.job_title} onChange={e => setAddForm(f => ({ ...f, job_title: e.target.value }))} /></div>
              <div><label className={labelCls}>Account</label><input className={inputCls} placeholder="Acme Corp" value={addForm.account_name} onChange={e => setAddForm(f => ({ ...f, account_name: e.target.value }))} /></div>
              <div><label className={labelCls}>Email *</label><input type="email" className={inputCls} placeholder="jane@acme.com" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><label className={labelCls}>Phone</label><input type="tel" className={inputCls} placeholder="+1 555 000 0000" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setAddForm(EMPTY_FORM); }} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors">Cancel</button>
              <button onClick={handleAddContact} disabled={!addForm.first_name.trim() || !addForm.email.trim()} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Add Contact</button>
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
