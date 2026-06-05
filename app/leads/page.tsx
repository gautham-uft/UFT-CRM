"use client";

import { useState } from "react";
import { mockLeads } from "@/lib/mock-data";
import { useCollection } from "@/hooks/useCollection";
import {
  Zap, Plus, CheckSquare, Trash2, RefreshCw, X,
  Mail, Phone, Building2, Calendar, Tag, Activity,
  CheckCircle, XCircle, Clock, MessageSquare, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppData } from "@/contexts/AppDataContext";

const statusColors: Record<string, string> = {
  new:       "bg-sky-500/15 text-sky-400 border-sky-500/30",
  reviewing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  approved:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected:  "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const statusIcons: Record<string, React.ReactNode> = {
  new:       <Clock size={11} />,
  reviewing: <Activity size={11} />,
  approved:  <CheckCircle size={11} />,
  rejected:  <XCircle size={11} />,
};

const sourceLabels: Record<string, string> = {
  n8n_apify:   "Apify / LinkedIn",
  manual_ocr:  "Business Card",
  inbound_web: "Web Form",
};

const activityTypeColors: Record<string, string> = {
  call_log: "bg-amber-400",
  email:    "bg-blue-400",
  note:     "bg-violet-400",
  meeting:  "bg-emerald-400",
};

const inputCls = "w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-xs placeholder:text-[var(--tx6)] focus:outline-none focus:border-[var(--a-border)] transition-colors";
const labelCls = "block text-[var(--tx5)] text-xs font-medium mb-1";

type Lead = (typeof mockLeads)[0];

// ── Response feature ──────────────────────────────────────────────

type ResponseCategory = "callback" | "postponed" | "not_interested" | "progressing";
type LeadResponse = { category: ResponseCategory; preset: string; note: string; follow_up_date?: string; logged_at: string; };

const RESP = [
  { key: "callback"      as ResponseCategory, label: "Callback Requested", Icon: Phone,        cardIdle: "bg-sky-500/10 border-sky-500/20 hover:border-sky-500/40",     cardActive: "bg-sky-500/20 border-sky-500/50",     text: "text-sky-400",     badge: "bg-sky-500/15 text-sky-400 border-sky-500/30",     chipActive: "bg-sky-500/20 border-sky-500/50 text-sky-400",     presets: ["Call back in 3 days","Call back next week","Call back in 2 weeks","Confirm timing first"], showDate: true,  dateLabel: "Callback Date" },
  { key: "postponed"     as ResponseCategory, label: "Postponed",          Icon: Clock,        cardIdle: "bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40", cardActive: "bg-amber-500/20 border-amber-500/50", text: "text-amber-400",   badge: "bg-amber-500/15 text-amber-400 border-amber-500/30", chipActive: "bg-amber-500/20 border-amber-500/50 text-amber-400", presets: ["Budget freeze","Not the right time","Check back next quarter","Internal review pending"], showDate: true,  dateLabel: "Follow-up Date" },
  { key: "not_interested"as ResponseCategory, label: "Not Interested",     Icon: XCircle,      cardIdle: "bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40",   cardActive: "bg-rose-500/20 border-rose-500/50",   text: "text-rose-400",    badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",     chipActive: "bg-rose-500/20 border-rose-500/50 text-rose-400",   presets: ["Not relevant for us","Using a competitor","No budget","Asked to be removed"],                showDate: false, dateLabel: "" },
  { key: "progressing"   as ResponseCategory, label: "Moving Forward",     Icon: CheckCircle,  cardIdle: "bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40", cardActive: "bg-emerald-500/20 border-emerald-500/50", text: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", chipActive: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400", presets: ["Wants more details","Schedule a demo","Forward to decision maker","Send proposal"], showDate: false, dateLabel: "" },
];

function getRCfg(cat: ResponseCategory) { return RESP.find(r => r.key === cat)!; }

// ── Log Response Modal ────────────────────────────────────────────

function LogResponseModal({ lead, existing, onSave, onClose }: { lead: Lead; existing?: LeadResponse; onSave: (r: LeadResponse) => void; onClose: () => void; }) {
  const [category, setCategory] = useState<ResponseCategory | null>(existing?.category ?? null);
  const [preset,   setPreset]   = useState(existing?.preset ?? "");
  const [note,     setNote]     = useState(existing?.note ?? "");
  const [date,     setDate]     = useState(existing?.follow_up_date ?? "");
  const activeCfg = category ? getRCfg(category) : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl">
        <div className="flex items-start justify-between mb-5">
          <div><h3 className="text-[var(--tx1)] font-semibold">Log Response</h3><p className="text-[var(--tx5)] text-xs mt-0.5">{lead.first_name} {lead.last_name} · {lead.company_name}</p></div>
          <button onClick={onClose} className="text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors mt-0.5"><X size={16} /></button>
        </div>
        <p className="text-[var(--tx5)] text-xs font-medium mb-2.5">What was their response?</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {RESP.map((cfg) => {
            const isActive = category === cfg.key;
            return (
              <button key={cfg.key} onClick={() => { setCategory(cfg.key); setPreset(""); setDate(""); }} className={cn("flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all", isActive ? cfg.cardActive : cfg.cardIdle)}>
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", isActive ? cfg.cardActive : cfg.cardIdle)}><cfg.Icon size={14} className={cfg.text} /></div>
                <span className={cn("text-xs font-medium leading-tight", isActive ? cfg.text : "text-[var(--tx3)]")}>{cfg.label}</span>
              </button>
            );
          })}
        </div>
        {activeCfg && (
          <div className="space-y-3.5 border-t border-[var(--border)] pt-4">
            <div>
              <p className="text-[var(--tx5)] text-xs font-medium mb-2">Quick reason</p>
              <div className="flex flex-wrap gap-1.5">
                {activeCfg.presets.map((p) => (
                  <button key={p} onClick={() => setPreset(prev => prev === p ? "" : p)} className={cn("px-2.5 py-1.5 rounded-lg text-xs border transition-colors", preset === p ? activeCfg.chipActive : "bg-[var(--surface2)] border-[var(--border)] text-[var(--tx4)] hover:border-[var(--a-border)] hover:text-[var(--tx2)]")}>{p}</button>
                ))}
              </div>
            </div>
            {activeCfg.showDate && (
              <div>
                <label className="text-[var(--tx5)] text-xs font-medium block mb-1.5">{activeCfg.dateLabel} <span className="text-[var(--tx6)] font-normal">(optional)</span></label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-xs focus:outline-none focus:border-[var(--a-border)] transition-colors" />
              </div>
            )}
            <div>
              <label className="text-[var(--tx5)] text-xs font-medium block mb-1.5">Notes <span className="text-[var(--tx6)] font-normal">(optional)</span></label>
              <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Add context about their response…" className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-xs placeholder:text-[var(--tx6)] focus:outline-none focus:border-[var(--a-border)] transition-colors resize-none" />
            </div>
          </div>
        )}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors">Cancel</button>
          <button onClick={() => { if (!category) return; onSave({ category, preset, note, ...(date ? { follow_up_date: date } : {}), logged_at: new Date().toISOString() }); }} disabled={!category} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Save Response</button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

const EMPTY_FORM = { first_name: "", last_name: "", email: "", phone: "", company_name: "", source: "inbound_web", status: "new" };

export default function LeadsPage() {
  const { addFollowUp, activities } = useAppData();

  const { items: leads, create: createLead, update: updateLead } = useCollection<Lead>("leads");
  const [selected,          setSelected]          = useState<Set<string>>(new Set());
  const [filter,            setFilter]            = useState("all");
  const [showAddModal,      setShowAddModal]      = useState(false);
  const [viewLead,          setViewLead]          = useState<Lead | null>(null);
  const [responses,         setResponses]         = useState<Record<string, LeadResponse>>({});
  const [responseModalLead, setResponseModalLead] = useState<Lead | null>(null);
  const [syncing,           setSyncing]           = useState(false);
  const [addForm,           setAddForm]           = useState(EMPTY_FORM);
  const [toast,             setToast]             = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  const filtered = filter === "all" ? leads : leads.filter(l => l.status === filter);

  const toggleSelect = (id: string) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll    = () => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(l => l.id)));

  const relatedActivities = viewLead
    ? activities.filter(a =>
        a.entity_name.toLowerCase().includes(viewLead.first_name.toLowerCase()) ||
        a.entity_name.toLowerCase().includes(viewLead.last_name.toLowerCase()) ||
        a.entity_name.toLowerCase().includes(viewLead.company_name.toLowerCase())
      )
    : [];

  function handleApprove(id: string) {
    updateLead(id, { status: "approved" });
    showToast("Lead approved");
  }
  function handleReject(id: string) {
    updateLead(id, { status: "rejected" });
    showToast("Lead rejected");
    if (viewLead?.id === id) setViewLead(null);
  }
  function handleBulkApprove() {
    const count = selected.size;
    selected.forEach(id => updateLead(id, { status: "approved" }));
    setSelected(new Set());
    showToast(`${count} lead${count > 1 ? "s" : ""} approved`);
  }
  function handleBulkReject() {
    const count = selected.size;
    selected.forEach(id => updateLead(id, { status: "rejected" }));
    setSelected(new Set());
    showToast(`${count} lead${count > 1 ? "s" : ""} rejected`);
  }
  function handleSyncApify() {
    if (syncing) return;
    setSyncing(true);
    setTimeout(() => {
      const today = new Date().toISOString().slice(0,10);
      createLead({ first_name: "Aiko",  last_name: "Sato",  email: "aiko.sato@axiomtech.jp", phone: "+81 90-1122-3344", company_name: "Axiom Tech",   source: "n8n_apify", status: "new", created_at: today });
      createLead({ first_name: "Rahul", last_name: "Mehta", email: "rahul.m@clearpathai.in", phone: "+91 99887-76655",  company_name: "ClearPath AI", source: "n8n_apify", status: "new", created_at: today });
      setSyncing(false);
      showToast("2 new leads synced from Apify");
    }, 1800);
  }
  function handleAddLead() {
    if (!addForm.first_name.trim() || !addForm.email.trim()) return;
    createLead({
      first_name:   addForm.first_name.trim(),
      last_name:    addForm.last_name.trim(),
      email:        addForm.email.trim(),
      phone:        addForm.phone.trim(),
      company_name: addForm.company_name.trim(),
      source:       addForm.source || "inbound_web",
      status:       addForm.status,
      created_at:   new Date().toISOString().slice(0,10),
    });
    setAddForm(EMPTY_FORM);
    setShowAddModal(false);
    showToast("Lead added");
  }
  function handleConvertToContact(lead: Lead) {
    showToast(`${lead.first_name} ${lead.last_name} converted to Contact`);
    setViewLead(null);
  }
  function saveResponse(r: LeadResponse) {
    if (!responseModalLead) return;
    setResponses(prev => ({ ...prev, [responseModalLead.id]: r }));
    if (r.category === "callback" || r.category === "postponed") {
      addFollowUp({ source: "lead", source_id: responseModalLead.id, entity_name: `${responseModalLead.first_name} ${responseModalLead.last_name} · ${responseModalLead.company_name}`, category: r.category, note: r.preset || r.note || undefined, follow_up_date: r.follow_up_date, logged_at: r.logged_at, done: false });
    }
    setResponseModalLead(null);
    showToast("Response saved");
  }

  return (
    <div className="h-[calc(100vh-112px)] flex flex-col gap-4">

      {/* ── Table ── */}
      <div className="flex flex-col gap-4 flex-1 overflow-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[var(--tx5)] text-sm">{leads.length} total leads</span>
            {selected.size > 0 && <span className="text-[var(--a-text)] text-sm font-medium">· {selected.size} selected</span>}
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <>
                <button onClick={handleBulkApprove} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg hover:bg-emerald-500/20 transition-colors"><CheckSquare size={13} /> Bulk Approve</button>
                <button onClick={handleBulkReject}  className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg hover:bg-rose-500/20 transition-colors"><Trash2 size={13} /> Reject</button>
              </>
            )}
            <button onClick={handleSyncApify} disabled={syncing} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors disabled:opacity-60">
              {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {syncing ? "Syncing…" : "Sync Apify"}
            </button>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--a)] text-white text-xs rounded-lg hover:bg-[var(--a-hover)] transition-colors"><Plus size={13} /> Add Lead</button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1 w-fit">
          {["all","new","reviewing","approved","rejected"].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize", filter === s ? "bg-[var(--a)] text-white" : "text-[var(--tx4)] hover:text-[var(--tx2)]")}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="accent-[var(--a)] cursor-pointer" />
                </th>
                {["Name","Email","Company","Source","Status","Date","Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-[var(--tx5)] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map(lead => {
                const resp = responses[lead.id];
                const rCfg = resp ? getRCfg(resp.category) : null;
                return (
                  <tr key={lead.id} className={cn("hover:bg-[var(--surface2)] transition-colors", selected.has(lead.id) && "bg-[var(--a-subtle)]", viewLead?.id === lead.id && "bg-[var(--a-subtle)]")}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)} className="accent-[var(--a)] cursor-pointer" /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[var(--a-muted)] flex items-center justify-center text-[var(--a-text)] text-xs font-medium shrink-0">{lead.first_name[0]}{lead.last_name[0]}</div>
                        <div className="min-w-0">
                          <span className="text-[var(--tx2)] font-medium truncate block">{lead.first_name} {lead.last_name}</span>
                          {rCfg && <span className={cn("flex items-center gap-1 text-[10px] mt-0.5", rCfg.text)}><rCfg.Icon size={9} />{rCfg.label}{resp.follow_up_date && <span className="text-[var(--tx6)]">· {resp.follow_up_date}</span>}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--tx4)] text-xs truncate max-w-[160px]">{lead.email}</td>
                    <td className="px-4 py-3 text-[var(--tx4)] text-xs">{lead.company_name}</td>
                    <td className="px-4 py-3"><span className="flex items-center gap-1.5 text-[var(--tx4)] text-xs"><Zap size={11} className="text-violet-400 shrink-0" />{sourceLabels[lead.source] ?? lead.source}</span></td>
                    <td className="px-4 py-3"><span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border capitalize", statusColors[lead.status])}>{statusIcons[lead.status]}{lead.status}</span></td>
                    <td className="px-4 py-3 text-[var(--tx5)] text-xs">{lead.created_at}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleApprove(lead.id)} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Approve</button>
                        <span className="text-[var(--tx6)]">·</span>
                        <button onClick={() => setResponseModalLead(lead)} className={cn("text-xs transition-colors", resp ? rCfg!.text : "text-[var(--tx5)] hover:text-[var(--tx3)]")}>{resp ? "Response ✓" : "Response"}</button>
                        <span className="text-[var(--tx6)]">·</span>
                        <button onClick={() => setViewLead(lead)} className="text-xs text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors">View</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Lead detail modal ── */}
      {viewLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setViewLead(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--border)]">
              <span className="text-[var(--tx2)] font-semibold text-sm">Lead Detail</span>
              <button onClick={() => setViewLead(null)} className="text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors"><X size={14} /></button>
            </div>
            <div className="flex flex-col items-center gap-2 pt-5 pb-4 px-5 border-b border-[var(--border)]">
              <div className="w-14 h-14 rounded-full bg-[var(--a-muted)] flex items-center justify-center text-[var(--a-text)] text-xl font-bold">{viewLead.first_name[0]}{viewLead.last_name[0]}</div>
              <p className="text-[var(--tx1)] font-semibold text-base text-center">{viewLead.first_name} {viewLead.last_name}</p>
              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border capitalize font-medium", statusColors[viewLead.status])}>{statusIcons[viewLead.status]}{viewLead.status}</span>
            </div>
            <div className="px-5 py-4 space-y-2.5 border-b border-[var(--border)]">
              <a href={`mailto:${viewLead.email}`} className="flex items-center gap-3 p-2.5 bg-[var(--surface2)] rounded-lg hover:bg-[var(--surface3)] transition-colors group">
                <Mail size={13} className="text-[var(--a-text)] shrink-0" />
                <span className="text-[var(--tx3)] text-xs truncate group-hover:text-[var(--tx1)] transition-colors">{viewLead.email}</span>
              </a>
              {viewLead.phone && <div className="flex items-center gap-3 p-2.5 bg-[var(--surface2)] rounded-lg"><Phone size={13} className="text-emerald-400 shrink-0" /><span className="text-[var(--tx3)] text-xs">{viewLead.phone}</span></div>}
              <div className="flex items-center gap-3 p-2.5 bg-[var(--surface2)] rounded-lg"><Building2 size={13} className="text-amber-400 shrink-0" /><span className="text-[var(--tx3)] text-xs">{viewLead.company_name}</span></div>
              <div className="flex items-center gap-3 p-2.5 bg-[var(--surface2)] rounded-lg"><Zap size={13} className="text-violet-400 shrink-0" /><div><p className="text-[10px] text-[var(--tx5)] mb-0.5">Source</p><p className="text-[var(--tx3)] text-xs">{sourceLabels[viewLead.source] ?? viewLead.source}</p></div></div>
              <div className="flex items-center gap-3 p-2.5 bg-[var(--surface2)] rounded-lg"><Calendar size={13} className="text-[var(--tx5)] shrink-0" /><div><p className="text-[10px] text-[var(--tx5)] mb-0.5">Created</p><p className="text-[var(--tx3)] text-xs">{viewLead.created_at}</p></div></div>
              <div className="flex items-center gap-3 p-2.5 bg-[var(--surface2)] rounded-lg"><Tag size={13} className="text-[var(--tx5)] shrink-0" /><div><p className="text-[10px] text-[var(--tx5)] mb-0.5">Lead ID</p><p className="text-[var(--tx3)] text-xs font-mono">#{viewLead.id.padStart(4, "0")}</p></div></div>
            </div>

            {/* Response section */}
            <div className="px-5 py-4 border-b border-[var(--border)]">
              {(() => {
                const resp = responses[viewLead.id];
                if (!resp) return (
                  <button onClick={() => setResponseModalLead(viewLead)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--surface2)] border border-dashed border-[var(--surface3)] text-[var(--tx5)] text-xs rounded-lg hover:border-[var(--a-border)] hover:text-[var(--a-text)] transition-colors">
                    <MessageSquare size={13} /> Log Lead Response
                  </button>
                );
                const cfg = getRCfg(resp.category);
                return (
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[var(--tx5)] text-xs font-medium">Response</p>
                      <button onClick={() => setResponseModalLead(viewLead)} className="text-[10px] text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors">Update</button>
                    </div>
                    <div className={cn("rounded-xl border p-3 space-y-1.5", cfg.badge)}>
                      <div className="flex items-center justify-between">
                        <span className={cn("flex items-center gap-1.5 text-xs font-semibold", cfg.text)}><cfg.Icon size={12} />{cfg.label}</span>
                        {resp.follow_up_date && <span className="flex items-center gap-1 text-[10px] text-[var(--tx5)]"><Calendar size={9} />{resp.follow_up_date}</span>}
                      </div>
                      {resp.preset && <p className="text-[var(--tx3)] text-xs">{resp.preset}</p>}
                      {resp.note  && <p className="text-[var(--tx4)] text-xs leading-relaxed border-t border-[var(--border)] pt-1.5 mt-1.5">{resp.note}</p>}
                      <p className="text-[var(--tx6)] text-[10px] pt-0.5">Logged {new Date(resp.logged_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Actions */}
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { handleApprove(viewLead.id); setViewLead(null); }} className="py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg hover:bg-emerald-500/20 transition-colors font-medium">✓ Approve</button>
                <button onClick={() => handleReject(viewLead.id)}  className="py-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg hover:bg-rose-500/20 transition-colors font-medium">✕ Reject</button>
                <button onClick={() => handleConvertToContact(viewLead)} className="py-2 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors col-span-2">Convert to Contact</button>
              </div>
            </div>

            {/* Activity timeline */}
            <div className="px-5 py-4 flex-1">
              <p className="text-[var(--tx5)] text-xs font-medium mb-3">Activity Timeline</p>
              {relatedActivities.length === 0 ? (
                <p className="text-[var(--tx6)] text-xs">No activities yet.</p>
              ) : (
                <div className="space-y-3">
                  {relatedActivities.map(a => (
                    <div key={a.id} className="flex items-start gap-2.5">
                      <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", activityTypeColors[a.activity_type] ?? "bg-[var(--a)]")} />
                      <div><p className="text-[var(--tx4)] text-xs leading-relaxed">{a.description}</p><p className="text-[var(--tx6)] text-[10px] mt-0.5">{a.user} · {new Date(a.created_at).toLocaleDateString()}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Lead modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[var(--tx1)] font-semibold">Add Lead</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>First Name *</label><input className={inputCls} placeholder="Jane" value={addForm.first_name} onChange={e => setAddForm(f => ({ ...f, first_name: e.target.value }))} /></div>
                <div><label className={labelCls}>Last Name</label><input className={inputCls} placeholder="Smith" value={addForm.last_name} onChange={e => setAddForm(f => ({ ...f, last_name: e.target.value }))} /></div>
              </div>
              <div><label className={labelCls}>Email *</label><input type="email" className={inputCls} placeholder="jane@example.com" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><label className={labelCls}>Phone</label><input type="tel" className={inputCls} placeholder="+1 555 000 0000" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><label className={labelCls}>Company</label><input className={inputCls} placeholder="Acme Corp" value={addForm.company_name} onChange={e => setAddForm(f => ({ ...f, company_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Source</label><select className={inputCls} value={addForm.source} onChange={e => setAddForm(f => ({ ...f, source: e.target.value }))}><option value="inbound_web">Web Form</option><option value="n8n_apify">Apify / LinkedIn</option><option value="manual_ocr">Business Card</option></select></div>
                <div><label className={labelCls}>Status</label><select className={inputCls} value={addForm.status} onChange={e => setAddForm(f => ({ ...f, status: e.target.value }))}><option value="new">New</option><option value="reviewing">Reviewing</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setAddForm(EMPTY_FORM); }} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors">Cancel</button>
              <button onClick={handleAddLead} disabled={!addForm.first_name.trim() || !addForm.email.trim()} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Add Lead</button>
            </div>
          </div>
        </div>
      )}

      {/* Log Response modal */}
      {responseModalLead && <LogResponseModal lead={responseModalLead} existing={responses[responseModalLead.id]} onSave={saveResponse} onClose={() => setResponseModalLead(null)} />}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] px-4 py-3 rounded-xl text-sm font-medium shadow-2xl bg-[var(--surface)] border border-[var(--a-border)] text-[var(--a-text)] flex items-center gap-2">
          <CheckCircle size={14} /> {toast}
        </div>
      )}
    </div>
  );
}
