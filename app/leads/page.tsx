"use client";

import { useState } from "react";
import { mockLeads, mockContacts, mockAccounts } from "@/lib/mock-data";
import { useCollection } from "@/hooks/useCollection";
import {
  Zap, Plus, CheckSquare, Trash2, RefreshCw, X,
  Mail, Phone, Building2, Calendar, Tag, Activity,
  CheckCircle, XCircle, Clock, MessageSquare, Loader2,
  Users, UserPlus, ArrowRight, Flag, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppData } from "@/contexts/AppDataContext";
import { useNow } from "@/contexts/NowContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import NoAccess from "@/components/NoAccess";

// Add `n` days to a YYYY-MM-DD date string.
function addDays(base: string, n: number) {
  const d = new Date((base || new Date().toISOString().slice(0, 10)) + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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

type Lead = (typeof mockLeads)[0] & { flagged?: boolean };
type Contact = (typeof mockContacts)[0];
type Account = (typeof mockAccounts)[0];

// ── Response feature ──────────────────────────────────────────────

type ResponseCategory = "callback" | "postponed" | "not_interested" | "progressing";
type LeadResponse = { category: ResponseCategory; preset: string; note: string; follow_up_date?: string; logged_at: string; };

type Preset = { label: string; days?: number };

const RESP = [
  { key: "callback"      as ResponseCategory, label: "Callback Requested", Icon: Phone,        cardIdle: "bg-sky-500/10 border-sky-500/20 hover:border-sky-500/40",     cardActive: "bg-sky-500/20 border-sky-500/50",     text: "text-sky-400",     badge: "bg-sky-500/15 text-sky-400 border-sky-500/30",     chipActive: "bg-sky-500/20 border-sky-500/50 text-sky-400",     presets: [{ label: "Call back in 3 days", days: 3 }, { label: "Call back next week", days: 7 }, { label: "Call back in 2 weeks", days: 14 }, { label: "Confirm timing first" }] as Preset[], showDate: true,  dateLabel: "Callback Date" },
  { key: "postponed"     as ResponseCategory, label: "Postponed",          Icon: Clock,        cardIdle: "bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40", cardActive: "bg-amber-500/20 border-amber-500/50", text: "text-amber-400",   badge: "bg-amber-500/15 text-amber-400 border-amber-500/30", chipActive: "bg-amber-500/20 border-amber-500/50 text-amber-400", presets: [{ label: "Budget freeze", days: 30 }, { label: "Not the right time", days: 14 }, { label: "Check back next quarter", days: 90 }, { label: "Internal review pending", days: 7 }] as Preset[], showDate: true,  dateLabel: "Follow-up Date" },
  { key: "not_interested"as ResponseCategory, label: "Not Interested",     Icon: XCircle,      cardIdle: "bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40",   cardActive: "bg-rose-500/20 border-rose-500/50",   text: "text-rose-400",    badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",     chipActive: "bg-rose-500/20 border-rose-500/50 text-rose-400",   presets: [{ label: "Not relevant for us" }, { label: "Using a competitor" }, { label: "No budget" }, { label: "Asked to be removed" }] as Preset[],                showDate: false, dateLabel: "" },
  { key: "progressing"   as ResponseCategory, label: "Moving Forward",     Icon: CheckCircle,  cardIdle: "bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40", cardActive: "bg-emerald-500/20 border-emerald-500/50", text: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", chipActive: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400", presets: [{ label: "Wants more details", days: 2 }, { label: "Schedule a demo", days: 3 }, { label: "Forward to decision maker", days: 5 }, { label: "Send proposal", days: 2 }] as Preset[], showDate: false, dateLabel: "" },
];

function getRCfg(cat: ResponseCategory) { return RESP.find(r => r.key === cat)!; }

// ── Log Response Modal ────────────────────────────────────────────

function LogResponseModal({ lead, existing, today, nowISO, onSave, onClose }: { lead: Lead; existing?: LeadResponse; today: string; nowISO: string; onSave: (r: LeadResponse, dest?: { account: boolean; contact: boolean }) => void; onClose: () => void; }) {
  const [category, setCategory] = useState<ResponseCategory | null>(existing?.category ?? null);
  const [preset,   setPreset]   = useState(existing?.preset ?? "");
  const [note,     setNote]     = useState(existing?.note ?? "");
  const [date,     setDate]     = useState(existing?.follow_up_date ?? "");
  const [addAccount, setAddAccount] = useState(false);
  const [addContact, setAddContact] = useState(false);
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
                  <button
                    key={p.label}
                    onClick={() => {
                      setPreset(prev => prev === p.label ? "" : p.label);
                      if (p.days != null && activeCfg.showDate) setDate(addDays(today, p.days));
                    }}
                    className={cn("px-2.5 py-1.5 rounded-lg text-xs border transition-colors", preset === p.label ? activeCfg.chipActive : "bg-[var(--surface2)] border-[var(--border)] text-[var(--tx4)] hover:border-[var(--a-border)] hover:text-[var(--tx2)]")}
                  >
                    {p.label}{p.days != null && activeCfg.showDate ? <span className="opacity-60"> · {addDays(today, p.days).slice(5)}</span> : null}
                  </button>
                ))}
              </div>
            </div>
            {activeCfg.showDate && (
              <div>
                <label className="text-[var(--tx5)] text-xs font-medium block mb-1.5">{activeCfg.dateLabel} <span className="text-[var(--tx6)] font-normal">(optional)</span></label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-xs focus:outline-none focus:border-[var(--a-border)] transition-colors" />
              </div>
            )}
            {category === "progressing" && (
              <div>
                <p className="text-[var(--tx5)] text-xs font-medium mb-2">Add to CRM</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setAddAccount(v => !v)} className={cn("flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all", addAccount ? "bg-amber-500/15 border-amber-500/50" : "bg-[var(--surface2)] border-[var(--border)] hover:border-[var(--a-border)]")}>
                    <Building2 size={14} className="text-amber-400 shrink-0" />
                    <span className={cn("text-xs font-medium flex-1", addAccount ? "text-amber-400" : "text-[var(--tx3)]")}>Add to Accounts</span>
                    <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0", addAccount ? "bg-amber-500 border-amber-500" : "border-[var(--tx6)]")}>{addAccount && <CheckCircle size={12} className="text-white" />}</div>
                  </button>
                  <button onClick={() => setAddContact(v => !v)} className={cn("flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all", addContact ? "bg-sky-500/15 border-sky-500/50" : "bg-[var(--surface2)] border-[var(--border)] hover:border-[var(--a-border)]")}>
                    <Users size={14} className="text-sky-400 shrink-0" />
                    <span className={cn("text-xs font-medium flex-1", addContact ? "text-sky-400" : "text-[var(--tx3)]")}>Add to Contacts</span>
                    <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0", addContact ? "bg-sky-500 border-sky-500" : "border-[var(--tx6)]")}>{addContact && <CheckCircle size={12} className="text-white" />}</div>
                  </button>
                </div>
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
          <button onClick={() => { if (!category) return; onSave({ category, preset, note, ...(date ? { follow_up_date: date } : {}), logged_at: nowISO ? new Date(nowISO).toISOString() : new Date().toISOString() }, category === "progressing" ? { account: addAccount, contact: addContact } : undefined); }} disabled={!category} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Save Response</button>
        </div>
      </div>
    </div>
  );
}

// ── Approve Lead flow (choose destinations → prefilled forms) ──────

function ApproveLeadModal({
  lead,
  createAccount,
  createContact,
  onApproved,
  onClose,
  initialAddAccount = true,
  initialAddContact = true,
  autoStart = false,
}: {
  lead: Lead;
  createAccount: (data: Partial<Account>) => Promise<Account>;
  createContact: (data: Partial<Contact>) => Promise<Contact>;
  onApproved: (leadId: string, message: string) => void;
  onClose: () => void;
  initialAddAccount?: boolean;
  initialAddContact?: boolean;
  autoStart?: boolean;
}) {
  const [addAccount, setAddAccount]   = useState(initialAddAccount);
  const [addContact, setAddContact]   = useState(initialAddContact);
  const [step, setStep]               = useState<"choose" | "account" | "contact">(
    autoStart ? (initialAddAccount ? "account" : "contact") : "choose",
  );
  const [createdAccount, setCreatedAccount] = useState<Account | null>(null);
  const [saving, setSaving]           = useState(false);

  const domain = lead.email.includes("@") ? lead.email.split("@")[1].trim() : "";

  const [accForm, setAccForm] = useState({
    name: lead.company_name, domain, industry: "", employee_count: "", founded_year: "", annual_revenue: "",
  });
  const [conForm, setConForm] = useState({
    first_name: lead.first_name, last_name: lead.last_name, job_title: "",
    account_name: lead.company_name, email: lead.email, phone: lead.phone ?? "",
  });

  const total = (addAccount ? 1 : 0) + (addContact ? 1 : 0);
  const stepIndex = step === "account" ? 1 : step === "contact" ? (addAccount ? 2 : 1) : 0;

  function finishMessage() {
    const parts: string[] = [];
    if (addAccount) parts.push("Accounts");
    if (addContact) parts.push("Contacts");
    return `${lead.first_name} ${lead.last_name} approved → added to ${parts.join(" & ")}`;
  }

  function startFlow() {
    if (!addAccount && !addContact) return;
    setStep(addAccount ? "account" : "contact");
  }

  async function submitAccount() {
    if (!accForm.name.trim() || saving) return;
    setSaving(true);
    const acc = await createAccount({
      name:           accForm.name.trim(),
      domain:         accForm.domain.trim(),
      industry:       accForm.industry.trim() || "Other",
      website:        accForm.domain ? `https://${accForm.domain}` : "",
      employee_count: parseInt(accForm.employee_count) || 0,
      annual_revenue: accForm.annual_revenue.trim() || "—",
      founded_year:   parseInt(accForm.founded_year) || new Date().getFullYear(),
      contacts:       addContact ? 1 : 0,
      deals:          0,
    });
    setCreatedAccount(acc);
    setSaving(false);
    if (addContact) {
      setConForm(f => ({ ...f, account_name: acc.name }));
      setStep("contact");
    } else {
      onApproved(lead.id, finishMessage());
    }
  }

  async function submitContact() {
    if (!conForm.first_name.trim() || !conForm.email.trim() || saving) return;
    setSaving(true);
    await createContact({
      account_id:   createdAccount?.id ?? "",
      first_name:   conForm.first_name.trim(),
      last_name:    conForm.last_name.trim(),
      email:        conForm.email.trim(),
      phone:        conForm.phone.trim(),
      job_title:    conForm.job_title.trim(),
      account_name: createdAccount?.name ?? conForm.account_name.trim(),
    });
    setSaving(false);
    onApproved(lead.id, finishMessage());
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70]">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md mx-4 shadow-2xl max-h-[88vh] overflow-y-auto">
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-[var(--tx1)] font-semibold">Approve Lead</h3>
            <p className="text-[var(--tx5)] text-xs mt-0.5">{lead.first_name} {lead.last_name} · {lead.company_name}</p>
          </div>
          <button onClick={onClose} className="text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors mt-0.5"><X size={16} /></button>
        </div>

        {/* Step indicator (only while filling forms) */}
        {step !== "choose" && total > 1 && (
          <div className="px-6 pt-3 text-[10px] text-[var(--tx5)] font-medium">Step {stepIndex} of {total}</div>
        )}

        {/* ── Step 1: choose destinations ── */}
        {step === "choose" && (
          <div className="px-6 py-5">
            <p className="text-[var(--tx5)] text-xs font-medium mb-3">Where should this lead be added? Pick one or both.</p>
            <div className="space-y-2.5">
              <button
                onClick={() => setAddAccount(v => !v)}
                className={cn("w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all",
                  addAccount ? "bg-amber-500/15 border-amber-500/50" : "bg-[var(--surface2)] border-[var(--border)] hover:border-[var(--a-border)]")}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0"><Building2 size={15} className="text-amber-400" /></div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-medium", addAccount ? "text-amber-400" : "text-[var(--tx3)]")}>Add to Accounts</p>
                  <p className="text-[var(--tx6)] text-[10px]">Create a company record from {lead.company_name || "this lead"}</p>
                </div>
                <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0", addAccount ? "bg-amber-500 border-amber-500" : "border-[var(--tx6)]")}>{addAccount && <CheckCircle size={12} className="text-white" />}</div>
              </button>

              <button
                onClick={() => setAddContact(v => !v)}
                className={cn("w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all",
                  addContact ? "bg-sky-500/15 border-sky-500/50" : "bg-[var(--surface2)] border-[var(--border)] hover:border-[var(--a-border)]")}
              >
                <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0"><Users size={15} className="text-sky-400" /></div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-medium", addContact ? "text-sky-400" : "text-[var(--tx3)]")}>Add to Contacts</p>
                  <p className="text-[var(--tx6)] text-[10px]">Create a person record for {lead.first_name} {lead.last_name}</p>
                </div>
                <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0", addContact ? "bg-sky-500 border-sky-500" : "border-[var(--tx6)]")}>{addContact && <CheckCircle size={12} className="text-white" />}</div>
              </button>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={onClose} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors">Cancel</button>
              <button onClick={startFlow} disabled={!addAccount && !addContact} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">Approve <ArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {/* ── Step: account form ── */}
        {step === "account" && (
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center"><Building2 size={14} className="text-amber-400" /></div>
              <p className="text-[var(--tx2)] text-sm font-medium">New Account</p>
            </div>
            <div className="space-y-4">
              <div><label className={labelCls}>Company Name *</label><input className={inputCls} placeholder="Acme Corporation" value={accForm.name} onChange={e => setAccForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><label className={labelCls}>Domain</label><input className={inputCls} placeholder="acme.com" value={accForm.domain} onChange={e => setAccForm(f => ({ ...f, domain: e.target.value }))} /></div>
              <div><label className={labelCls}>Industry</label><input className={inputCls} placeholder="SaaS, Healthcare, Finance…" value={accForm.industry} onChange={e => setAccForm(f => ({ ...f, industry: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Employee Count</label><input type="number" className={inputCls} placeholder="250" value={accForm.employee_count} onChange={e => setAccForm(f => ({ ...f, employee_count: e.target.value }))} /></div>
                <div><label className={labelCls}>Founded Year</label><input type="number" className={inputCls} placeholder="2015" value={accForm.founded_year} onChange={e => setAccForm(f => ({ ...f, founded_year: e.target.value }))} /></div>
              </div>
              <div><label className={labelCls}>Annual Revenue</label><input className={inputCls} placeholder="$10M" value={accForm.annual_revenue} onChange={e => setAccForm(f => ({ ...f, annual_revenue: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors">Cancel</button>
              <button onClick={submitAccount} disabled={!accForm.name.trim() || saving} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
                {saving ? <Loader2 size={14} className="animate-spin" /> : addContact ? <>Approve & Next <ArrowRight size={14} /></> : "Approve"}
              </button>
            </div>
          </div>
        )}

        {/* ── Step: contact form ── */}
        {step === "contact" && (
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-sky-500/15 flex items-center justify-center"><UserPlus size={14} className="text-sky-400" /></div>
              <p className="text-[var(--tx2)] text-sm font-medium">New Contact</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>First Name *</label><input className={inputCls} placeholder="Jane" value={conForm.first_name} onChange={e => setConForm(f => ({ ...f, first_name: e.target.value }))} /></div>
                <div><label className={labelCls}>Last Name</label><input className={inputCls} placeholder="Smith" value={conForm.last_name} onChange={e => setConForm(f => ({ ...f, last_name: e.target.value }))} /></div>
              </div>
              <div><label className={labelCls}>Job Title</label><input className={inputCls} placeholder="VP of Engineering" value={conForm.job_title} onChange={e => setConForm(f => ({ ...f, job_title: e.target.value }))} /></div>
              <div><label className={labelCls}>Account</label><input className={inputCls} placeholder="Acme Corp" value={conForm.account_name} onChange={e => setConForm(f => ({ ...f, account_name: e.target.value }))} /></div>
              <div><label className={labelCls}>Email *</label><input type="email" className={inputCls} placeholder="jane@acme.com" value={conForm.email} onChange={e => setConForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><label className={labelCls}>Phone</label><input type="tel" className={inputCls} placeholder="+1 555 000 0000" value={conForm.phone} onChange={e => setConForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors">Cancel</button>
              <button onClick={submitContact} disabled={!conForm.first_name.trim() || !conForm.email.trim() || saving} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
                {saving ? <Loader2 size={14} className="animate-spin" /> : "Approve"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

const EMPTY_FORM = { first_name: "", last_name: "", email: "", phone: "", company_name: "", source: "inbound_web", status: "new" };

export default function LeadsPage() {
  const { addFollowUp, activities } = useAppData();
  const { today, now } = useNow();
  const { ready, canRead, canWrite: canWriteFn } = usePermissions();
  const canWrite = canWriteFn("Leads");

  const { items: leads, create: createLead, update: updateLead, remove: removeLead } = useCollection<Lead>("leads");
  const { create: createContact } = useCollection<Contact>("contacts");
  const { create: createAccount } = useCollection<Account>("accounts");
  const [selected,          setSelected]          = useState<Set<string>>(new Set());
  const [filter,            setFilter]            = useState("all");
  const [showAddModal,      setShowAddModal]      = useState(false);
  const [viewLead,          setViewLead]          = useState<Lead | null>(null);
  const [editLead,          setEditLead]          = useState<Lead | null>(null);
  const [editForm,          setEditForm]          = useState(EMPTY_FORM);
  const [approveLead,       setApproveLead]       = useState<Lead | null>(null);
  const [approvePreset,     setApprovePreset]     = useState<{ account: boolean; contact: boolean } | null>(null);
  const [responses,         setResponses]         = useState<Record<string, LeadResponse>>({});
  const [responseModalLead, setResponseModalLead] = useState<Lead | null>(null);
  const [syncing,           setSyncing]           = useState(false);
  const [addForm,           setAddForm]           = useState(EMPTY_FORM);
  const [toast,             setToast]             = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  const filtered =
    filter === "all"       ? leads.filter(l => l.status !== "approved")
    : filter === "incorrect" ? leads.filter(l => l.flagged)
    : leads.filter(l => l.status === filter);

  const toggleSelect = (id: string) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll    = () => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(l => l.id)));

  const relatedActivities = viewLead
    ? activities.filter(a =>
        a.entity_name.toLowerCase().includes(viewLead.first_name.toLowerCase()) ||
        a.entity_name.toLowerCase().includes(viewLead.last_name.toLowerCase()) ||
        a.entity_name.toLowerCase().includes(viewLead.company_name.toLowerCase())
      )
    : [];

  function handleApproved(id: string, message: string) {
    updateLead(id, { status: "approved" });
    setApproveLead(null);
    setApprovePreset(null);
    showToast(message);
  }
  function handleReject(id: string) {
    updateLead(id, { status: "rejected" });
    showToast("Lead rejected");
    if (viewLead?.id === id) setViewLead(null);
  }
  function handleToggleFlag(lead: Lead) {
    const next = !lead.flagged;
    updateLead(lead.id, { flagged: next });
    setViewLead(prev => (prev && prev.id === lead.id ? { ...prev, flagged: next } : prev));
    showToast(next ? "Flagged as incorrect" : "Flag removed");
  }
  async function handleBulkApprove() {
    const ids = Array.from(selected);
    setSelected(new Set());
    for (const id of ids) {
      const lead = leads.find(l => l.id === id);
      if (!lead) continue;
      const domain = lead.email.includes("@") ? lead.email.split("@")[1].trim() : "";
      // Bulk approve can't open a form per lead, so we create skeleton records
      // straight from the lead — the missing fields get flagged in yellow on the
      // Contacts / Accounts pages so they can be completed later.
      const acc = await createAccount({
        name:           lead.company_name,
        domain,
        industry:       "",
        website:        domain ? `https://${domain}` : "",
        employee_count: 0,
        annual_revenue: "",
        founded_year:   new Date().getFullYear(),
        contacts:       1,
        deals:          0,
      });
      await createContact({
        account_id:   acc.id,
        first_name:   lead.first_name,
        last_name:    lead.last_name,
        email:        lead.email,
        phone:        lead.phone ?? "",
        job_title:    "",
        account_name: acc.name,
      });
      updateLead(id, { status: "approved" });
    }
    showToast(`${ids.length} lead${ids.length > 1 ? "s" : ""} approved → added to Accounts & Contacts`);
  }
  function handleBulkReject() {
    const count = selected.size;
    selected.forEach(id => updateLead(id, { status: "rejected" }));
    setSelected(new Set());
    showToast(`${count} lead${count > 1 ? "s" : ""} rejected`);
  }
  function handleBulkDelete() {
    const count = selected.size;
    selected.forEach(id => removeLead(id));
    setSelected(new Set());
    showToast(`${count} lead${count > 1 ? "s" : ""} deleted`);
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
  function startEditLead(lead: Lead) {
    setEditForm({
      first_name:   lead.first_name,
      last_name:    lead.last_name,
      email:        lead.email,
      phone:        lead.phone ?? "",
      company_name: lead.company_name,
      source:       lead.source,
      status:       lead.status,
    });
    setEditLead(lead);
  }
  function handleSaveEditLead() {
    if (!editLead || !editForm.first_name.trim() || !editForm.email.trim()) return;
    const patch = {
      first_name:   editForm.first_name.trim(),
      last_name:    editForm.last_name.trim(),
      email:        editForm.email.trim(),
      phone:        editForm.phone.trim(),
      company_name: editForm.company_name.trim(),
      source:       editForm.source,
      status:       editForm.status,
    };
    updateLead(editLead.id, patch);
    setViewLead(prev => (prev && prev.id === editLead.id ? { ...prev, ...patch } : prev));
    setEditLead(null);
    showToast("Lead updated");
  }
  function saveResponse(r: LeadResponse, dest?: { account: boolean; contact: boolean }) {
    if (!responseModalLead) return;
    const lead = responseModalLead;
    setResponses(prev => ({ ...prev, [lead.id]: r }));
    if (r.category === "callback" || r.category === "postponed") {
      addFollowUp({ source: "lead", source_id: lead.id, entity_name: `${lead.first_name} ${lead.last_name} · ${lead.company_name}`, category: r.category, note: r.preset || r.note || undefined, follow_up_date: r.follow_up_date, logged_at: r.logged_at, done: false });
      // A callback request or postponement means the lead is now being worked —
      // move it out of the "new" bucket and into "reviewing".
      if (lead.status === "new") {
        updateLead(lead.id, { status: "reviewing" });
        setViewLead(prev => (prev && prev.id === lead.id ? { ...prev, status: "reviewing" } : prev));
      }
    }
    setResponseModalLead(null);
    showToast("Response saved");
    if (r.category === "progressing" && dest && (dest.account || dest.contact)) {
      setApprovePreset({ account: dest.account, contact: dest.contact });
      setApproveLead(lead);
    }
  }

  if (ready && !canRead("Leads")) return <NoAccess module="Leads" />;

  return (
    <div className="h-[calc(100vh-112px)] flex flex-col gap-4">

      {/* ── Table ── */}
      <div className="flex flex-col gap-4 flex-1 overflow-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[var(--tx5)] text-sm">{leads.length} total leads</span>
            {selected.size > 0 && <span className="text-[var(--a-text)] text-sm font-medium">· {selected.size} selected</span>}
          </div>
          {canWrite && (
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <>
                <button onClick={handleBulkApprove} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg hover:bg-emerald-500/20 transition-colors"><CheckSquare size={13} /> Bulk Approve</button>
                <button onClick={handleBulkReject}  className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg hover:bg-rose-500/20 transition-colors"><XCircle size={13} /> Reject</button>
                <button onClick={handleBulkDelete}  className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs rounded-lg hover:bg-rose-500/30 transition-colors"><Trash2 size={13} /> Delete</button>
              </>
            )}
            <button onClick={handleSyncApify} disabled={syncing} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors disabled:opacity-60">
              {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {syncing ? "Syncing…" : "Sync Apify"}
            </button>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--a)] text-white text-xs rounded-lg hover:bg-[var(--a-hover)] transition-colors"><Plus size={13} /> Add Lead</button>
          </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-stretch gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1 w-fit">
          {["all","new","reviewing","approved","rejected"].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize", filter === s ? "bg-[var(--a)] text-white" : "text-[var(--tx4)] hover:text-[var(--tx2)]")}>
              {s === "all" ? "All" : s}
            </button>
          ))}
          <button
            onClick={() => setFilter("incorrect")}
            className={cn(
              "px-3 py-1 rounded-md text-[11px] font-medium leading-tight text-center transition-colors flex items-center",
              filter === "incorrect" ? "bg-rose-500 text-white" : "text-rose-400 hover:bg-rose-500/10"
            )}
          >
            <span>Incorrect<br />Data</span>
          </button>
        </div>

        {/* Table */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {canWrite && (
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="accent-[var(--a)] cursor-pointer" />
                  </th>
                )}
                {["Name","Email","Company","Source","Status","Date", ...(canWrite ? ["Actions"] : [])].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-[var(--tx5)] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map(lead => {
                const resp = responses[lead.id];
                const rCfg = resp ? getRCfg(resp.category) : null;
                const rowCls = lead.flagged
                  ? "bg-rose-500/10 hover:bg-rose-500/20"
                  : (selected.has(lead.id) || viewLead?.id === lead.id) ? "bg-[var(--a-subtle)]" : "hover:bg-[var(--surface2)]";
                return (
                  <tr key={lead.id} onClick={() => setViewLead(lead)} className={cn("transition-colors cursor-pointer", rowCls)}>
                    {canWrite && <td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)} className="accent-[var(--a)] cursor-pointer" /></td>}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[var(--a-muted)] flex items-center justify-center text-[var(--a-text)] text-xs font-medium shrink-0">{lead.first_name[0]}{lead.last_name[0]}</div>
                        <div className="min-w-0">
                          <span className="text-[var(--tx2)] font-medium truncate flex items-center gap-1.5">{lead.first_name} {lead.last_name}{lead.flagged && <Flag size={11} className="text-rose-400 shrink-0" />}</span>
                          {rCfg && <span className={cn("flex items-center gap-1 text-[10px] mt-0.5", rCfg.text)}><rCfg.Icon size={9} />{rCfg.label}{resp.follow_up_date && <span className="text-[var(--tx6)]">· {resp.follow_up_date}</span>}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--tx4)] text-xs truncate max-w-[160px]">{lead.email}</td>
                    <td className="px-4 py-3 text-[var(--tx4)] text-xs">{lead.company_name}</td>
                    <td className="px-4 py-3"><span className="flex items-center gap-1.5 text-[var(--tx4)] text-xs"><Zap size={11} className="text-violet-400 shrink-0" />{sourceLabels[lead.source] ?? lead.source}</span></td>
                    <td className="px-4 py-3"><span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border capitalize", statusColors[lead.status])}>{statusIcons[lead.status]}{lead.status}</span></td>
                    <td className="px-4 py-3 text-[var(--tx5)] text-xs">{lead.created_at}</td>
                    {canWrite && (
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setApprovePreset(null); setApproveLead(lead); }} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Approve</button>
                        <span className="text-[var(--tx6)]">·</span>
                        <button onClick={() => setResponseModalLead(lead)} className={cn("text-xs transition-colors", resp ? rCfg!.text : "text-[var(--tx5)] hover:text-[var(--tx3)]")}>{resp ? "Response ✓" : "Response"}</button>
                        <span className="text-[var(--tx6)]">·</span>
                        <button onClick={() => startEditLead(lead)} className="flex items-center gap-1 text-xs text-[var(--tx5)] hover:text-[var(--a-text)] transition-colors"><Pencil size={11} /> Edit</button>
                      </div>
                    </td>
                    )}
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
                if (!resp) return canWrite ? (
                  <button onClick={() => setResponseModalLead(viewLead)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--surface2)] border border-dashed border-[var(--surface3)] text-[var(--tx5)] text-xs rounded-lg hover:border-[var(--a-border)] hover:text-[var(--a-text)] transition-colors">
                    <MessageSquare size={13} /> Log Lead Response
                  </button>
                ) : (
                  <p className="text-[var(--tx6)] text-xs">No response logged.</p>
                );
                const cfg = getRCfg(resp.category);
                return (
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[var(--tx5)] text-xs font-medium">Response</p>
                      {canWrite && <button onClick={() => setResponseModalLead(viewLead)} className="text-[10px] text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors">Update</button>}
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
            {canWrite && (
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setApprovePreset(null); setApproveLead(viewLead); setViewLead(null); }} className="py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg hover:bg-emerald-500/20 transition-colors font-medium">✓ Approve</button>
                <button onClick={() => handleReject(viewLead.id)}  className="py-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg hover:bg-rose-500/20 transition-colors font-medium">✕ Reject</button>
                <button onClick={() => startEditLead(viewLead)} className="py-2 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors col-span-2 flex items-center justify-center gap-2"><Pencil size={13} /> Edit Lead</button>
                <button onClick={() => handleToggleFlag(viewLead)} className={cn("py-2 text-xs rounded-lg transition-colors font-medium border col-span-2 flex items-center justify-center gap-2", viewLead.flagged ? "bg-[var(--surface2)] border-[var(--border)] text-[var(--tx4)] hover:border-[var(--a-border)]" : "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20")}><Flag size={13} /> {viewLead.flagged ? "Remove Incorrect Flag" : "Flag as Incorrect"}</button>
              </div>
            </div>
            )}

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

      {/* Approve Lead flow */}
      {approveLead && (
        <ApproveLeadModal
          key={approveLead.id + (approvePreset ? "-preset" : "")}
          lead={approveLead}
          createAccount={createAccount}
          createContact={createContact}
          onApproved={handleApproved}
          onClose={() => { setApproveLead(null); setApprovePreset(null); }}
          initialAddAccount={approvePreset ? approvePreset.account : true}
          initialAddContact={approvePreset ? approvePreset.contact : true}
          autoStart={!!approvePreset}
        />
      )}

      {/* Edit Lead modal */}
      {editLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={() => setEditLead(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[var(--tx1)] font-semibold">Edit Lead</h3>
              <button onClick={() => setEditLead(null)} className="text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>First Name *</label><input className={inputCls} value={editForm.first_name} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} /></div>
                <div><label className={labelCls}>Last Name</label><input className={inputCls} value={editForm.last_name} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} /></div>
              </div>
              <div><label className={labelCls}>Email *</label><input type="email" className={inputCls} value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><label className={labelCls}>Phone</label><input type="tel" className={inputCls} value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><label className={labelCls}>Company</label><input className={inputCls} value={editForm.company_name} onChange={e => setEditForm(f => ({ ...f, company_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Source</label><select className={inputCls} value={editForm.source} onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))}><option value="inbound_web">Web Form</option><option value="n8n_apify">Apify / LinkedIn</option><option value="manual_ocr">Business Card</option></select></div>
                <div><label className={labelCls}>Status</label><select className={inputCls} value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}><option value="new">New</option><option value="reviewing">Reviewing</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditLead(null)} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors">Cancel</button>
              <button onClick={handleSaveEditLead} disabled={!editForm.first_name.trim() || !editForm.email.trim()} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Log Response modal */}
      {responseModalLead && <LogResponseModal lead={responseModalLead} existing={responses[responseModalLead.id]} today={today} nowISO={now} onSave={saveResponse} onClose={() => setResponseModalLead(null)} />}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] px-4 py-3 rounded-xl text-sm font-medium shadow-2xl bg-[var(--surface)] border border-[var(--a-border)] text-[var(--a-text)] flex items-center gap-2">
          <CheckCircle size={14} /> {toast}
        </div>
      )}
    </div>
  );
}
