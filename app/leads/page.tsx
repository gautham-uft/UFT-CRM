"use client";

import { useState } from "react";
import { mockLeads, mockContacts, mockAccounts } from "@/lib/mock-data";
import { useCollection } from "@/hooks/useCollection";
import {
  Zap, Plus, CheckSquare, Trash2, RefreshCw, X,
  Mail, Phone, Building2, Calendar, Tag, Activity,
  CheckCircle, XCircle, Clock, MessageSquare, Loader2,
  Users, UserPlus, ArrowRight, Flag, Pencil, Send, Inbox,
  MapPin, Link, Cake, FileText,
  Briefcase, Globe, ShieldCheck, AlertCircle,
  Video, Film, CalendarPlus, Sparkles, Star, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppData } from "@/contexts/AppDataContext";
import { useNow } from "@/contexts/NowContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { isRestrictedRole } from "@/lib/permissions";
import NoAccess from "@/components/NoAccess";
import NotesSection from "@/components/NotesSection";
import { useQuickActions } from "@/components/QuickActions";
import MeetingModal, { type MeetingPayload } from "@/components/MeetingModal";
import { buildManpowerIntro } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";
import { enrichLeadRequest } from "@/lib/enrichment-client";
import type { EnrichmentResult, EnrichedPOC } from "@/lib/enrichment/types";
import { requestScoutVerification } from "@/lib/scout-client";

type LeadRequest = {
  id:           string;
  lead_id:      string;
  lead_name:    string;
  company_name: string;
  requested_by: string;
  requested_at: string;
  status:       "pending" | "approved" | "rejected";
  note?:        string;
};

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
  n8n_apify:    "Apify / LinkedIn",
  manual_ocr:   "Business Card",
  inbound_web:  "Web Form",
  quick_search: "Quick Tab",
};

const activityTypeColors: Record<string, string> = {
  call_log: "bg-amber-400",
  email:    "bg-blue-400",
  note:     "bg-violet-400",
  meeting:  "bg-emerald-400",
};

const inputCls = "w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-xs placeholder:text-[var(--tx6)] focus:outline-none focus:border-[var(--a-border)] transition-colors";
const labelCls = "block text-[var(--tx5)] text-xs font-medium mb-1";

type LeadProfile = {
  industry?:        string;
  company_size?:    string;
  website?:         string;
  open_roles?:      string;
  // First point of contact for the company
  poc_name?:        string;
  poc_title?:       string;
  poc_email?:       string;
  poc_linkedin?:    string;
  naukri_status?:   "pending_verification" | "found" | "not_found";
  naukri_url?:      string;
  internal_notes?:  string;
  last_updated?:    string;
  // Enrichment audit
  enriched_at?:     string;
  enrichment_from?: string;
};

type Lead = (typeof mockLeads)[0] & {
  flagged?:       boolean;
  date_of_birth?: string;
  address?:       string;
  linkedin?:      string;
  summary?:       string;
  profile?:       LeadProfile;
  email_sent_at?: string;
  email_status?:  "sent" | "failed";
};
type Contact = (typeof mockContacts)[0] & {
  date_of_birth?: string;
  address?:       string;
  linkedin?:      string;
  summary?:       string;
};
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
    date_of_birth: lead.date_of_birth ?? "", address: lead.address ?? "", linkedin: lead.linkedin ?? "", summary: lead.summary ?? "",
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
      account_id:    createdAccount?.id ?? "",
      first_name:    conForm.first_name.trim(),
      last_name:     conForm.last_name.trim(),
      email:         conForm.email.trim(),
      phone:         conForm.phone.trim(),
      job_title:     conForm.job_title.trim(),
      account_name:  createdAccount?.name ?? conForm.account_name.trim(),
      date_of_birth: conForm.date_of_birth,
      address:       conForm.address.trim(),
      linkedin:      conForm.linkedin.trim(),
      summary:       conForm.summary.trim(),
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

const EMPTY_FORM = { first_name: "", last_name: "", email: "", phone: "", company_name: "", source: "inbound_web", status: "new", date_of_birth: "", address: "", linkedin: "", summary: "" };

export default function LeadsPage() {
  const { addFollowUp, addActivity, activities, calendarEvents, addCalendarEvent, updateCalendarEvent } = useAppData();
  const { today, now } = useNow();
  const { ready, canRead, canWrite: canWriteFn } = usePermissions();
  const { currentUser } = useCurrentUser();
  const { openAddNote } = useQuickActions();
  const canWrite = canWriteFn("Leads");
  // Executives (restricted) raise approval requests; everyone else approves them.
  const restricted = isRestrictedRole(currentUser.role);
  const userName = `${currentUser.first_name} ${currentUser.last_name}`.trim();
  const nowISO = () => (now ? new Date(now).toISOString() : new Date().toISOString());

  const { items: leads, create: createLead, update: updateLead, remove: removeLead } = useCollection<Lead>("leads");
  const { create: createContact } = useCollection<Contact>("contacts");
  const { create: createAccount } = useCollection<Account>("accounts");
  const { items: leadRequests, create: createRequest, update: updateRequest } = useCollection<LeadRequest>("leadRequests");
  const { items: users } = useCollection<{ id: string; first_name: string; last_name: string; role: string }>("users");
  const userOptions = users.map(u => { const name = `${u.first_name} ${u.last_name}`.trim(); return { value: name, label: `${name} · ${u.role}` }; });
  const scoutUsers = users.filter(u => u.role === "Scout");
  const [activeRequestId,   setActiveRequestId]   = useState<string | null>(null);
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

  const canReadProfile  = canRead("Lead Profiles");
  const canWriteProfile = canWriteFn("Lead Profiles");

  const [detailTab,       setDetailTab]       = useState<"overview" | "profile">("overview");
  const [editingProfile,  setEditingProfile]  = useState(false);
  const EMPTY_PROF: { industry: string; company_size: string; website: string; open_roles: string; poc_name: string; poc_title: string; poc_email: string; poc_linkedin: string; naukri_status: LeadProfile["naukri_status"] | ""; naukri_url: string; internal_notes: string } = { industry: "", company_size: "", website: "", open_roles: "", poc_name: "", poc_title: "", poc_email: "", poc_linkedin: "", naukri_status: "", naukri_url: "", internal_notes: "" };
  const [profileForm,     setProfileForm]     = useState(EMPTY_PROF);

  function openProfileEdit(lead: Lead) {
    const p = lead.profile ?? {};
    setProfileForm({
      industry:      p.industry      ?? "",
      company_size:  p.company_size  ?? "",
      website:       p.website       ?? "",
      open_roles:    p.open_roles    ?? "",
      poc_name:      p.poc_name      ?? "",
      poc_title:     p.poc_title     ?? "",
      poc_email:     p.poc_email     ?? "",
      poc_linkedin:  p.poc_linkedin  ?? "",
      naukri_status: p.naukri_status ?? "",
      naukri_url:    p.naukri_url    ?? "",
      internal_notes: p.internal_notes ?? "",
    });
    setEditingProfile(true);
  }

  function handleSaveProfile(lead: Lead) {
    const patch: Partial<Lead> = {
      profile: {
        ...lead.profile,
        industry:      profileForm.industry.trim()      || undefined,
        company_size:  profileForm.company_size.trim()  || undefined,
        website:       profileForm.website.trim()       || undefined,
        open_roles:    profileForm.open_roles.trim()    || undefined,
        poc_name:      profileForm.poc_name.trim()      || undefined,
        poc_title:     profileForm.poc_title.trim()     || undefined,
        poc_email:     profileForm.poc_email.trim()     || undefined,
        poc_linkedin:  profileForm.poc_linkedin.trim()  || undefined,
        naukri_status: (profileForm.naukri_status as LeadProfile["naukri_status"]) || undefined,
        naukri_url:    profileForm.naukri_url.trim()    || undefined,
        internal_notes: profileForm.internal_notes.trim() || undefined,
        last_updated:  new Date().toISOString().slice(0, 10),
      },
    };
    updateLead(lead.id, patch);
    setViewLead(prev => prev && prev.id === lead.id ? { ...prev, ...patch } : prev);
    setEditingProfile(false);
    showToast("Profile saved");
  }

  // ── Meeting tracking ──
  const [meetingModalLead, setMeetingModalLead] = useState<Lead | null>(null);
  const [recordingEditId,  setRecordingEditId]  = useState<string | null>(null);
  const [recordingInput,   setRecordingInput]   = useState("");

  const leadMeetings = viewLead
    ? calendarEvents
        .filter(e => e.lead_id === viewLead.id)
        .sort((a, b) => `${b.date}${b.time ?? ""}`.localeCompare(`${a.date}${a.time ?? ""}`))
    : [];

  function handleSaveMeeting(payload: MeetingPayload) {
    if (!meetingModalLead) return;
    addCalendarEvent(payload);
    const modeLabel = payload.meeting_mode === "offline"
      ? `in person${payload.location ? ` at ${payload.location}` : ""}`
      : `online${payload.meeting_platform ? ` via ${payload.meeting_platform}` : ""}`;
    addActivity({
      user: userName, entity_type: "lead",
      entity_name: `${meetingModalLead.first_name} ${meetingModalLead.last_name}`,
      activity_type: "meeting",
      description: `Scheduled meeting: ${payload.title} on ${payload.date} (${modeLabel})`,
      created_at: nowISO(),
    });
    setMeetingModalLead(null);
    showToast("Meeting scheduled");
  }

  function startRecordingEdit(meetingId: string, current?: string) {
    setRecordingEditId(meetingId);
    setRecordingInput(current ?? "");
  }
  function saveRecording(meetingId: string) {
    const url = recordingInput.trim();
    updateCalendarEvent(meetingId, { recording_url: url || undefined });
    setRecordingEditId(null);
    setRecordingInput("");
    showToast(url ? "Recording saved" : "Recording removed");
  }

  // ── Outreach email ──
  const [emailLead,    setEmailLead]    = useState<Lead | null>(null);
  const [emailForm,    setEmailForm]    = useState({ subject: "", body: "" });
  const [emailSending, setEmailSending] = useState(false);
  const [emailError,   setEmailError]   = useState("");
  const EMPTY_EMAIL_MEETING = { enabled: false, date: "", time: "", mode: "online" as "online" | "offline", location: "", link: "" };
  const [emailMeeting, setEmailMeeting] = useState(EMPTY_EMAIL_MEETING);

  function openEmailCompose(lead: Lead) {
    const { subject, body } = buildManpowerIntro({
      pocName:    `${lead.first_name} ${lead.last_name}`.trim(),
      company:    lead.company_name,
      openRoles:  lead.profile?.open_roles,
      senderName: userName,
    });
    setEmailForm({ subject, body });
    setEmailMeeting({ ...EMPTY_EMAIL_MEETING, date: today });
    setEmailError("");
    setEmailLead(lead);
  }

  async function handleSendEmail() {
    if (!emailLead || !emailForm.subject.trim() || !emailForm.body.trim() || emailSending) return;
    setEmailSending(true);
    setEmailError("");
    try {
      const withMeeting = emailMeeting.enabled && emailMeeting.date;
      const meeting = withMeeting
        ? {
            title:    emailForm.subject.trim(),
            date:     emailMeeting.date,
            time:     emailMeeting.time || undefined,
            mode:     emailMeeting.mode,
            location: emailMeeting.mode === "offline" ? emailMeeting.location.trim() || undefined : undefined,
            link:     emailMeeting.mode === "online"  ? emailMeeting.link.trim()     || undefined : undefined,
          }
        : undefined;
      const leadFullName = `${emailLead.first_name} ${emailLead.last_name}`.trim();
      await sendEmail({ to: emailLead.email, subject: emailForm.subject.trim(), text: emailForm.body, meeting, lead_id: emailLead.id, lead_name: leadFullName });
      const sentAt = nowISO();
      updateLead(emailLead.id, { email_sent_at: sentAt, email_status: "sent" });
      setViewLead(prev => prev && prev.id === emailLead.id ? { ...prev, email_sent_at: sentAt, email_status: "sent" } : prev);
      addActivity({
        user: userName, entity_type: "lead",
        entity_name: leadFullName,
        activity_type: "email",
        description: withMeeting
          ? `Sent meeting invite to ${emailLead.email} for ${emailMeeting.date}${emailMeeting.time ? ` at ${emailMeeting.time}` : ""} (Accept/Decline)`
          : `Sent outreach email to ${emailLead.email}: "${emailForm.subject.trim()}"`,
        created_at: sentAt,
      });
      setEmailLead(null);
      showToast(withMeeting ? "Meeting invite sent" : "Email sent");
    } catch (err) {
      setEmailError((err as Error).message);
    } finally {
      setEmailSending(false);
    }
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  // Pending approval requests, keyed by lead id.
  const pendingByLead = new Map(leadRequests.filter(r => r.status === "pending").map(r => [r.lead_id, r] as const));
  const pendingRequests = leadRequests.filter(r => r.status === "pending");
  const hasPending = (id: string) => pendingByLead.has(id);

  const filtered =
    filter === "all"       ? leads.filter(l => l.status !== "approved")
    : filter === "incorrect" ? leads.filter(l => l.flagged)
    : leads.filter(l => l.status === filter);

  // ── Approval-request workflow ──────────────────────────────────────
  function handleRequestApproval(lead: Lead) {
    if (hasPending(lead.id)) { showToast("Approval already requested"); return; }
    createRequest({
      lead_id:      lead.id,
      lead_name:    `${lead.first_name} ${lead.last_name}`,
      company_name: lead.company_name,
      requested_by: userName,
      requested_at: nowISO(),
      status:       "pending",
    });
    if (lead.status === "new") updateLead(lead.id, { status: "reviewing" });
    addActivity({
      user: userName, entity_type: "lead", entity_name: `${lead.first_name} ${lead.last_name}`,
      activity_type: "note", description: `Requested approval for ${lead.company_name || "lead"}`, created_at: nowISO(),
    });
    showToast("Approval requested");
    if (viewLead?.id === lead.id) setViewLead(null);
  }
  function startApproveRequest(req: LeadRequest) {
    const lead = leads.find(l => l.id === req.lead_id);
    if (!lead) { showToast("Lead no longer exists"); updateRequest(req.id, { status: "rejected" }); return; }
    setActiveRequestId(req.id);
    setApprovePreset(null);
    setApproveLead(lead);
  }
  function rejectRequest(req: LeadRequest) {
    updateRequest(req.id, { status: "rejected" });
    updateLead(req.lead_id, { status: "rejected" });
    showToast(`Request from ${req.requested_by} rejected`);
  }

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
    if (activeRequestId) { updateRequest(activeRequestId, { status: "approved" }); setActiveRequestId(null); }
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
    // Executives raise approval requests in bulk instead of approving directly.
    if (restricted) {
      let n = 0;
      for (const id of ids) {
        const lead = leads.find(l => l.id === id);
        if (!lead || hasPending(id)) continue;
        createRequest({
          lead_id: id, lead_name: `${lead.first_name} ${lead.last_name}`, company_name: lead.company_name,
          requested_by: userName, requested_at: nowISO(), status: "pending",
        });
        if (lead.status === "new") updateLead(id, { status: "reviewing" });
        n++;
      }
      showToast(`${n} approval request${n === 1 ? "" : "s"} raised`);
      return;
    }
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
        account_id:    acc.id,
        first_name:    lead.first_name,
        last_name:     lead.last_name,
        email:         lead.email,
        phone:         lead.phone ?? "",
        job_title:     "",
        account_name:  acc.name,
        date_of_birth: lead.date_of_birth ?? "",
        address:       lead.address ?? "",
        linkedin:      lead.linkedin ?? "",
        summary:       lead.summary ?? "",
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
      company_name:  addForm.company_name.trim(),
      source:        addForm.source || "inbound_web",
      status:        addForm.status,
      created_at:    new Date().toISOString().slice(0,10),
      date_of_birth: addForm.date_of_birth,
      address:       addForm.address.trim(),
      linkedin:      addForm.linkedin.trim(),
      summary:       addForm.summary.trim(),
    });
    setAddForm(EMPTY_FORM);
    setShowAddModal(false);
    showToast("Lead added");
  }
  function startEditLead(lead: Lead) {
    setEditForm({
      first_name:    lead.first_name,
      last_name:     lead.last_name,
      email:         lead.email,
      phone:         lead.phone ?? "",
      company_name:  lead.company_name,
      source:        lead.source,
      status:        lead.status,
      date_of_birth: lead.date_of_birth ?? "",
      address:       lead.address ?? "",
      linkedin:      lead.linkedin ?? "",
      summary:       lead.summary ?? "",
    });
    setEditLead(lead);
  }
  function handleSaveEditLead() {
    if (!editLead || !editForm.first_name.trim() || !editForm.email.trim()) return;
    const patch = {
      first_name:    editForm.first_name.trim(),
      last_name:     editForm.last_name.trim(),
      email:         editForm.email.trim(),
      phone:         editForm.phone.trim(),
      company_name:  editForm.company_name.trim(),
      source:        editForm.source,
      status:        editForm.status,
      date_of_birth: editForm.date_of_birth,
      address:       editForm.address.trim(),
      linkedin:      editForm.linkedin.trim(),
      summary:       editForm.summary.trim(),
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

  // ── Web enrichment ──
  const [enrichTarget,  setEnrichTarget]  = useState<Lead | null>(null);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [enrichResult,  setEnrichResult]  = useState<EnrichmentResult | null>(null);
  const [enrichError,   setEnrichError]   = useState("");

  function domainOf(lead: Lead): string | undefined {
    if (lead.email.includes("@")) return lead.email.split("@")[1].trim().toLowerCase();
    const site = lead.profile?.website;
    if (site) return site.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim().toLowerCase() || undefined;
    return undefined;
  }

  async function runEnrichment(lead: Lead) {
    setEnrichTarget(lead);
    setEnrichResult(null);
    setEnrichError("");
    setEnrichLoading(true);
    try {
      const result = await enrichLeadRequest({ company_name: lead.company_name, domain: domainOf(lead) });
      setEnrichResult(result);
      if (result.providers_used.length === 0 && !result.provider_errors) {
        setEnrichError("No matching data found for this company.");
      }
    } catch (err) {
      setEnrichError((err as Error).message);
    } finally {
      setEnrichLoading(false);
    }
  }

  function applyEnrichedCompany() {
    if (!enrichTarget || !enrichResult) return;
    const c = enrichResult.company;
    const patch: Partial<Lead> = {
      profile: {
        ...enrichTarget.profile,
        industry:     enrichTarget.profile?.industry     || c.industry,
        company_size: enrichTarget.profile?.company_size || c.size,
        website:      enrichTarget.profile?.website      || c.website,
        enriched_at:     new Date().toISOString().slice(0, 10),
        enrichment_from: enrichResult.providers_used.join(", ") || undefined,
        last_updated:    new Date().toISOString().slice(0, 10),
      },
      ...(enrichTarget.summary || !c.description ? {} : { summary: c.description }),
    };
    updateLead(enrichTarget.id, patch);
    setViewLead(prev => prev && prev.id === enrichTarget.id ? { ...prev, ...patch } : prev);
    setEnrichTarget(prev => prev ? { ...prev, ...patch } : prev);
    showToast("Company info applied to profile");
  }

  function applyEnrichedPoc(poc: EnrichedPOC) {
    if (!enrichTarget) return;
    const patch: Partial<Lead> = {
      profile: {
        ...enrichTarget.profile,
        poc_name:     poc.name,
        poc_title:    poc.title || enrichTarget.profile?.poc_title,
        poc_email:    poc.email || enrichTarget.profile?.poc_email,
        poc_linkedin: poc.linkedin || enrichTarget.profile?.poc_linkedin,
        enriched_at:     new Date().toISOString().slice(0, 10),
        enrichment_from: poc.source,
        last_updated:    new Date().toISOString().slice(0, 10),
      },
    };
    updateLead(enrichTarget.id, patch);
    setViewLead(prev => prev && prev.id === enrichTarget.id ? { ...prev, ...patch } : prev);
    setEnrichTarget(prev => prev ? { ...prev, ...patch } : prev);
    showToast(`${poc.name} set as first point of contact`);
  }

  // ── Naukri scout verification ──
  const [naukriScout,   setNaukriScout]   = useState("");
  const [naukriSending, setNaukriSending] = useState(false);

  async function handleRequestNaukri(lead: Lead) {
    if (naukriSending) return;
    setNaukriSending(true);
    const p = lead.profile ?? {};
    try {
      const created = await requestScoutVerification({
        lead_id:      lead.id,
        lead_name:    `${lead.first_name} ${lead.last_name}`.trim(),
        company_name: lead.company_name,
        poc_name:     p.poc_name,
        poc_title:    p.poc_title,
        poc_email:    p.poc_email,
        poc_linkedin: p.poc_linkedin,
        requested_by: userName,
        assigned_to:  naukriScout || undefined,
      });
      const patch: Partial<Lead> = {
        profile: { ...p, naukri_status: "pending_verification", last_updated: new Date().toISOString().slice(0, 10) },
      };
      updateLead(lead.id, patch);
      setViewLead(prev => prev && prev.id === lead.id ? { ...prev, ...patch } : prev);
      // Notify the assigned scout via an assigned follow-up (shows in their queue).
      if (naukriScout) {
        addFollowUp({
          source: "task", source_id: `naukri-${created.id}`,
          entity_name: `${lead.first_name} ${lead.last_name} · ${lead.company_name}`,
          category: "naukri", note: "Verify this lead on Naukri",
          follow_up_date: today, logged_at: nowISO(), done: false,
          assignee: naukriScout, assigned_by: userName,
        });
      }
      addActivity({
        user: userName, entity_type: "lead", entity_name: `${lead.first_name} ${lead.last_name}`,
        activity_type: "note",
        description: `Requested Naukri verification${naukriScout ? ` from ${naukriScout}` : ""} for ${p.poc_name || lead.company_name}`,
        created_at: nowISO(),
      });
      showToast("Naukri verification requested");
    } catch (err) {
      showToast((err as Error).message);
    } finally {
      setNaukriSending(false);
    }
  }

  if (ready && !canRead("Leads")) return <NoAccess module="Leads" />;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Table ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[var(--tx5)] text-sm">{leads.length} total leads</span>
            {selected.size > 0 && <span className="text-[var(--a-text)] text-sm font-medium">· {selected.size} selected</span>}
          </div>
          {canWrite && (
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <>
                <button onClick={handleBulkApprove} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg hover:bg-emerald-500/20 transition-colors">{restricted ? <><Send size={13} /> Request Approval</> : <><CheckSquare size={13} /> Bulk Approve</>}</button>
                <button onClick={handleBulkReject}  className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg hover:bg-rose-500/20 transition-colors"><XCircle size={13} /> Reject</button>
                <button onClick={handleBulkDelete}  className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs rounded-lg hover:bg-rose-500/30 transition-colors"><Trash2 size={13} /> Delete</button>
              </>
            )}
            <button onClick={handleSyncApify} disabled={syncing} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors disabled:opacity-60">
              {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {syncing ? "Syncing…" : "Sync Apify"}
            </button>
            <button onClick={() => openAddNote()} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors"><MessageSquare size={13} /> Add Note</button>
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
          {/* Approval requests queue — visible to approvers (not Executives) */}
          {!restricted && (
            <button
              onClick={() => setFilter("requests")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
                filter === "requests" ? "bg-[var(--a)] text-white" : "text-[var(--tx4)] hover:text-[var(--tx2)]"
              )}
            >
              <Inbox size={13} /> Requests
              {pendingRequests.length > 0 && (
                <span className={cn("min-w-[16px] h-4 px-1 text-[9px] font-bold rounded-full flex items-center justify-center leading-none",
                  filter === "requests" ? "bg-white/25 text-white" : "bg-amber-500 text-white")}>{pendingRequests.length}</span>
              )}
            </button>
          )}
        </div>

        {/* Requests queue (approvers) */}
        {filter === "requests" ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
            {pendingRequests.length === 0 ? (
              <p className="px-4 py-10 text-center text-[var(--tx5)] text-sm">No pending approval requests.</p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {pendingRequests.map(req => (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface2)] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0"><Send size={14} className="text-amber-400" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--tx2)] text-sm font-medium truncate">{req.lead_name} <span className="text-[var(--tx5)] font-normal">· {req.company_name}</span></p>
                      <p className="text-[var(--tx6)] text-[10px] mt-0.5">Requested by {req.requested_by} · {new Date(req.requested_at).toLocaleDateString()}</p>
                    </div>
                    {canWrite && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => startApproveRequest(req)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg hover:bg-emerald-500/20 transition-colors"><CheckCircle size={13} /> Approve</button>
                        <button onClick={() => rejectRequest(req)} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg hover:bg-rose-500/20 transition-colors"><XCircle size={13} /> Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        /* Table */
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
                          {hasPending(lead.id) && <span className="flex items-center gap-1 text-[10px] mt-0.5 text-amber-400"><Send size={9} /> Approval requested</span>}
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
                        {restricted ? (
                          <button onClick={() => handleRequestApproval(lead)} disabled={hasPending(lead.id)} className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50 disabled:cursor-default">{hasPending(lead.id) ? "Requested" : <><Send size={11} /> Request</>}</button>
                        ) : (
                          <button onClick={() => { setApprovePreset(null); setApproveLead(lead); }} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Approve</button>
                        )}
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
        )}
      </div>

      {/* ── Lead detail modal ── */}
      {viewLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setViewLead(null); setDetailTab("overview"); setEditingProfile(false); }}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--border)]">
              <span className="text-[var(--tx2)] font-semibold text-sm">Lead Detail</span>
              <button onClick={() => { setViewLead(null); setDetailTab("overview"); setEditingProfile(false); }} className="text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors"><X size={14} /></button>
            </div>
            <div className="flex flex-col items-center gap-2 pt-5 pb-4 px-5 border-b border-[var(--border)]">
              <div className="w-14 h-14 rounded-full bg-[var(--a-muted)] flex items-center justify-center text-[var(--a-text)] text-xl font-bold">{viewLead.first_name[0]}{viewLead.last_name[0]}</div>
              <p className="text-[var(--tx1)] font-semibold text-base text-center">{viewLead.first_name} {viewLead.last_name}</p>
              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border capitalize font-medium", statusColors[viewLead.status])}>{statusIcons[viewLead.status]}{viewLead.status}</span>
            </div>

            {/* Tab bar — only for roles that can read Lead Profiles */}
            {canReadProfile && (
              <div className="flex border-b border-[var(--border)]">
                {(["overview", "profile"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setDetailTab(tab); setEditingProfile(false); }}
                    className={cn(
                      "flex-1 py-2.5 text-xs font-medium transition-colors capitalize relative",
                      detailTab === tab
                        ? "text-[var(--a-text)]"
                        : "text-[var(--tx5)] hover:text-[var(--tx3)]"
                    )}
                  >
                    {tab === "overview" ? "Overview" : "Lead Profile"}
                    {detailTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--a)] rounded-t" />}
                  </button>
                ))}
              </div>
            )}

            {/* ── Profile tab ── */}
            {canReadProfile && detailTab === "profile" && (
              <div className="px-5 py-4 space-y-5">

                {/* Company Profile */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[var(--tx5)] text-xs font-medium flex items-center gap-1.5"><Building2 size={12} /> Company Profile</p>
                    {canWriteProfile && !editingProfile && (
                      <div className="flex items-center gap-3">
                        <button onClick={() => runEnrichment(viewLead)} className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 transition-colors"><Sparkles size={10} /> Enrich from web</button>
                        <button onClick={() => openProfileEdit(viewLead)} className="flex items-center gap-1 text-[10px] text-[var(--tx5)] hover:text-[var(--a-text)] transition-colors"><Pencil size={10} /> Edit</button>
                      </div>
                    )}
                  </div>

                  {editingProfile ? (
                    <div className="space-y-3">
                      <div><label className={labelCls}>Industry</label><input className={inputCls} placeholder="SaaS, FinTech, Healthcare…" value={profileForm.industry} onChange={e => setProfileForm(f => ({ ...f, industry: e.target.value }))} /></div>
                      <div><label className={labelCls}>Company Size</label><input className={inputCls} placeholder="50-200 employees" value={profileForm.company_size} onChange={e => setProfileForm(f => ({ ...f, company_size: e.target.value }))} /></div>
                      <div><label className={labelCls}>Website</label><input className={inputCls} placeholder="https://company.com" value={profileForm.website} onChange={e => setProfileForm(f => ({ ...f, website: e.target.value }))} /></div>
                      <div><label className={labelCls}>Open Roles Being Hired</label><textarea rows={3} className={cn(inputCls, "resize-none")} placeholder="Frontend Developer, Sales Executive…" value={profileForm.open_roles} onChange={e => setProfileForm(f => ({ ...f, open_roles: e.target.value }))} /></div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[
                        { icon: <Briefcase size={12} className="text-violet-400" />, label: "Industry",    value: viewLead.profile?.industry },
                        { icon: <Users size={12} className="text-sky-400" />,       label: "Company Size", value: viewLead.profile?.company_size },
                        { icon: <Globe size={12} className="text-emerald-400" />,   label: "Website",      value: viewLead.profile?.website },
                      ].map(({ icon, label, value }) => (
                        <div key={label} className="flex items-center gap-3 p-2.5 bg-[var(--surface2)] rounded-lg">
                          <span className="shrink-0">{icon}</span>
                          <div><p className="text-[10px] text-[var(--tx5)] mb-0.5">{label}</p><p className="text-[var(--tx3)] text-xs">{value || <span className="text-[var(--tx6)] italic">Not set</span>}</p></div>
                        </div>
                      ))}
                      {viewLead.profile?.open_roles && (
                        <div className="p-2.5 bg-[var(--surface2)] rounded-lg">
                          <p className="text-[10px] text-[var(--tx5)] mb-1.5">Open Roles Being Hired</p>
                          <div className="flex flex-wrap gap-1.5">
                            {viewLead.profile.open_roles.split(/[,\n]+/).map(r => r.trim()).filter(Boolean).map(role => (
                              <span key={role} className="px-2 py-0.5 bg-[var(--a-muted)] text-[var(--a-text)] text-[10px] rounded-full border border-[var(--a-border)]">{role}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* First Point of Contact */}
                <div>
                  <p className="text-[var(--tx5)] text-xs font-medium mb-2.5 flex items-center gap-1.5"><Star size={12} className="text-amber-400" /> First Point of Contact</p>
                  {editingProfile ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className={labelCls}>Name</label><input className={inputCls} placeholder="Jane Smith" value={profileForm.poc_name} onChange={e => setProfileForm(f => ({ ...f, poc_name: e.target.value }))} /></div>
                        <div><label className={labelCls}>Job Title</label><input className={inputCls} placeholder="HR Manager" value={profileForm.poc_title} onChange={e => setProfileForm(f => ({ ...f, poc_title: e.target.value }))} /></div>
                      </div>
                      <div><label className={labelCls}>Email</label><input className={inputCls} placeholder="jane@company.com" value={profileForm.poc_email} onChange={e => setProfileForm(f => ({ ...f, poc_email: e.target.value }))} /></div>
                      <div><label className={labelCls}>LinkedIn</label><input className={inputCls} placeholder="linkedin.com/in/…" value={profileForm.poc_linkedin} onChange={e => setProfileForm(f => ({ ...f, poc_linkedin: e.target.value }))} /></div>
                    </div>
                  ) : viewLead.profile?.poc_name || viewLead.profile?.poc_title || viewLead.profile?.poc_email ? (
                    <div className="p-3 bg-[var(--surface2)] rounded-xl space-y-1.5">
                      {viewLead.profile?.poc_name && <p className="text-[var(--tx2)] text-xs font-medium flex items-center gap-1.5"><Users size={11} className="text-amber-400" /> {viewLead.profile.poc_name}</p>}
                      {viewLead.profile?.poc_title && <p className="text-[var(--tx4)] text-[11px] flex items-center gap-1.5"><Briefcase size={10} /> {viewLead.profile.poc_title}</p>}
                      {viewLead.profile?.poc_email && <a href={`mailto:${viewLead.profile.poc_email}`} className="text-sky-400 text-[11px] flex items-center gap-1.5 hover:underline"><Mail size={10} /> {viewLead.profile.poc_email}</a>}
                      {viewLead.profile?.poc_linkedin && <a href={viewLead.profile.poc_linkedin.startsWith("http") ? viewLead.profile.poc_linkedin : `https://${viewLead.profile.poc_linkedin}`} target="_blank" rel="noreferrer" className="text-sky-400 text-[11px] flex items-center gap-1.5 hover:underline"><Link size={10} /> LinkedIn</a>}
                    </div>
                  ) : (
                    <p className="text-[var(--tx6)] text-xs italic">No contact set. Use <span className="text-violet-400">Enrich from web</span> or Edit to add one.</p>
                  )}
                </div>

                {/* Naukri Verification */}
                <div>
                  <p className="text-[var(--tx5)] text-xs font-medium mb-2.5 flex items-center gap-1.5"><ShieldCheck size={12} /> Naukri Verification</p>
                  {editingProfile ? (
                    <div className="space-y-2">
                      <div>
                        <label className={labelCls}>Verification Status</label>
                        <select className={inputCls} value={profileForm.naukri_status} onChange={e => setProfileForm(f => ({ ...f, naukri_status: e.target.value as "" }))}>
                          <option value="">Not Verified</option>
                          <option value="pending_verification">Pending Verification</option>
                          <option value="found">Found on Naukri</option>
                          <option value="not_found">Not Found</option>
                        </select>
                      </div>
                      <div><label className={labelCls}>Naukri Profile URL</label><input className={inputCls} placeholder="https://naukri.com/…" value={profileForm.naukri_url} onChange={e => setProfileForm(f => ({ ...f, naukri_url: e.target.value }))} /></div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3 p-3 rounded-xl border">
                        {!viewLead.profile?.naukri_status ? (
                          <><AlertCircle size={14} className="text-[var(--tx5)] shrink-0" /><span className="text-[var(--tx5)] text-xs">Not verified yet</span></>
                        ) : viewLead.profile.naukri_status === "pending_verification" ? (
                          <><Clock size={14} className="text-amber-400 shrink-0" /><span className="text-amber-400 text-xs font-medium">Verification Pending with scout</span></>
                        ) : viewLead.profile.naukri_status === "found" ? (
                          <><ShieldCheck size={14} className="text-emerald-400 shrink-0" /><div><p className="text-emerald-400 text-xs font-medium">Found on Naukri</p>{viewLead.profile.naukri_url && <a href={viewLead.profile.naukri_url} target="_blank" rel="noreferrer" className="text-[10px] text-sky-400 hover:underline">{viewLead.profile.naukri_url}</a>}</div></>
                        ) : (
                          <><XCircle size={14} className="text-rose-400 shrink-0" /><span className="text-rose-400 text-xs font-medium">Not Found on Naukri</span></>
                        )}
                      </div>

                      {/* Request verification from a scout (Leads-write roles) */}
                      {canWrite && viewLead.profile?.naukri_status !== "pending_verification" && (
                        <div className="flex items-center gap-2">
                          {scoutUsers.length > 0 && (
                            <select className={cn(inputCls, "flex-1")} value={naukriScout} onChange={e => setNaukriScout(e.target.value)}>
                              <option value="">Any scout</option>
                              {scoutUsers.map(s => { const n = `${s.first_name} ${s.last_name}`.trim(); return <option key={s.id} value={n}>{n}</option>; })}
                            </select>
                          )}
                          <button onClick={() => handleRequestNaukri(viewLead)} disabled={naukriSending} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-lg hover:bg-amber-500/20 transition-colors disabled:opacity-50 whitespace-nowrap">
                            {naukriSending ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                            {viewLead.profile?.naukri_status ? "Re-request" : "Request Verification"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Internal Notes (AM read / BM+ write) */}
                <div>
                  <p className="text-[var(--tx5)] text-xs font-medium mb-2 flex items-center gap-1.5"><FileText size={12} /> Internal Notes <span className="text-[var(--tx6)] font-normal">(AM+ visible)</span></p>
                  {editingProfile ? (
                    <textarea rows={3} className={cn(inputCls, "resize-none")} placeholder="Internal observations, context for BM/Director…" value={profileForm.internal_notes} onChange={e => setProfileForm(f => ({ ...f, internal_notes: e.target.value }))} />
                  ) : (
                    <div className="p-2.5 bg-[var(--surface2)] rounded-lg min-h-[60px]">
                      {viewLead.profile?.internal_notes
                        ? <p className="text-[var(--tx3)] text-xs leading-relaxed whitespace-pre-wrap">{viewLead.profile.internal_notes}</p>
                        : <p className="text-[var(--tx6)] text-xs italic">No internal notes.</p>
                      }
                    </div>
                  )}
                </div>

                {/* Save / Cancel when editing */}
                {editingProfile && (
                  <div className="flex gap-3">
                    <button onClick={() => setEditingProfile(false)} className="flex-1 py-2 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-xs rounded-xl hover:border-[var(--a-border)] transition-colors">Cancel</button>
                    <button onClick={() => handleSaveProfile(viewLead)} className="flex-1 py-2 bg-[var(--a)] text-white text-xs rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors">Save Profile</button>
                  </div>
                )}

                {/* Last updated */}
                {viewLead.profile?.last_updated && !editingProfile && (
                  <p className="text-[var(--tx6)] text-[10px] text-right">Last updated: {viewLead.profile.last_updated}</p>
                )}
              </div>
            )}

            {/* ── Overview sections (hidden when Profile tab is active) ── */}
            {(!canReadProfile || detailTab === "overview") && (
            <>
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
              {viewLead.date_of_birth && <div className="flex items-center gap-3 p-2.5 bg-[var(--surface2)] rounded-lg"><Cake size={13} className="text-pink-400 shrink-0" /><div><p className="text-[10px] text-[var(--tx5)] mb-0.5">Date of Birth</p><p className="text-[var(--tx3)] text-xs">{viewLead.date_of_birth}</p></div></div>}
              {viewLead.address && <div className="flex items-center gap-3 p-2.5 bg-[var(--surface2)] rounded-lg"><MapPin size={13} className="text-rose-400 shrink-0" /><div><p className="text-[10px] text-[var(--tx5)] mb-0.5">Address</p><p className="text-[var(--tx3)] text-xs">{viewLead.address}</p></div></div>}
              {viewLead.linkedin && <a href={viewLead.linkedin.startsWith("http") ? viewLead.linkedin : `https://${viewLead.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2.5 bg-[var(--surface2)] rounded-lg hover:bg-[var(--surface3)] transition-colors group"><Link size={13} className="text-sky-400 shrink-0" /><span className="text-[var(--tx3)] text-xs truncate group-hover:text-[var(--tx1)] transition-colors">{viewLead.linkedin}</span></a>}
              {viewLead.summary && <div className="flex items-start gap-3 p-2.5 bg-[var(--surface2)] rounded-lg"><FileText size={13} className="text-[var(--tx5)] shrink-0 mt-0.5" /><div><p className="text-[10px] text-[var(--tx5)] mb-0.5">Summary / About</p><p className="text-[var(--tx3)] text-xs leading-relaxed whitespace-pre-wrap">{viewLead.summary}</p></div></div>}
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
                {restricted ? (
                  <button onClick={() => handleRequestApproval(viewLead)} disabled={hasPending(viewLead.id)} className="py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-lg hover:bg-amber-500/20 transition-colors font-medium flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-default"><Send size={13} /> {hasPending(viewLead.id) ? "Requested" : "Request Approval"}</button>
                ) : (
                  <button onClick={() => { setApprovePreset(null); setApproveLead(viewLead); setViewLead(null); }} className="py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg hover:bg-emerald-500/20 transition-colors font-medium">✓ Approve</button>
                )}
                <button onClick={() => handleReject(viewLead.id)}  className="py-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg hover:bg-rose-500/20 transition-colors font-medium">✕ Reject</button>
                <button onClick={() => openEmailCompose(viewLead)} className="py-2 bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs rounded-lg hover:bg-sky-500/20 transition-colors font-medium col-span-2 flex items-center justify-center gap-2">
                  <Mail size={13} /> {viewLead.email_sent_at ? "Send Another Email" : "Send Intro Email"}
                  {viewLead.email_sent_at && <CheckCircle size={12} className="text-emerald-400" />}
                </button>
                <button onClick={() => startEditLead(viewLead)} className="py-2 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors col-span-2 flex items-center justify-center gap-2"><Pencil size={13} /> Edit Lead</button>
                <button onClick={() => handleToggleFlag(viewLead)} className={cn("py-2 text-xs rounded-lg transition-colors font-medium border col-span-2 flex items-center justify-center gap-2", viewLead.flagged ? "bg-[var(--surface2)] border-[var(--border)] text-[var(--tx4)] hover:border-[var(--a-border)]" : "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20")}><Flag size={13} /> {viewLead.flagged ? "Remove Incorrect Flag" : "Flag as Incorrect"}</button>
              </div>
            </div>
            )}

            {/* Notes */}
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <NotesSection entityType="lead" entityId={viewLead.id} entityName={`${viewLead.first_name} ${viewLead.last_name}`} canWrite={canWrite} />
            </div>

            {/* Meetings */}
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[var(--tx5)] text-xs font-medium flex items-center gap-1.5"><CalendarPlus size={12} /> Meetings</p>
                {canWrite && (
                  <button onClick={() => setMeetingModalLead(viewLead)} className="flex items-center gap-1 text-[10px] text-[var(--tx5)] hover:text-[var(--a-text)] transition-colors"><Plus size={11} /> Schedule</button>
                )}
              </div>
              {leadMeetings.length === 0 ? (
                <p className="text-[var(--tx6)] text-xs">No meetings scheduled.</p>
              ) : (
                <div className="space-y-2.5">
                  {leadMeetings.map(m => (
                    <div key={m.id} className="p-3 bg-[var(--surface2)] rounded-xl space-y-2">
                      {/* Header: title + mode */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[var(--tx2)] text-xs font-medium leading-tight">{m.title}</p>
                        <span className={cn("shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium border",
                          m.meeting_mode === "offline" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-sky-500/10 text-sky-400 border-sky-500/30")}>
                          {m.meeting_mode === "offline" ? <MapPin size={9} /> : <Video size={9} />}
                          {m.meeting_mode === "offline" ? "In person" : "Online"}
                        </span>
                      </div>

                      {/* Date / time */}
                      <div className="flex items-center gap-1.5 text-[10px] text-[var(--tx5)]">
                        <Calendar size={10} /> {m.date}{m.time && ` · ${m.time}`}
                      </div>

                      {/* Platform / link or location */}
                      {m.meeting_mode === "online"
                        ? (m.meeting_platform || m.meeting_link) && (
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <Video size={10} className="text-sky-400 shrink-0" />
                              {m.meeting_link
                                ? <a href={m.meeting_link} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline truncate">{m.meeting_platform || "Join link"}</a>
                                : <span className="text-[var(--tx4)]">{m.meeting_platform}</span>}
                            </div>
                          )
                        : m.location && (
                            <div className="flex items-center gap-1.5 text-[10px] text-[var(--tx4)]"><MapPin size={10} className="text-amber-400 shrink-0" /> {m.location}</div>
                          )}

                      {/* Attendees */}
                      {m.attendees && m.attendees.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {m.attendees.map((a, i) => (
                            <span key={i} className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] border", a.is_external ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-sky-500/10 text-sky-400 border-sky-500/30")}>
                              {a.is_external ? <Building2 size={8} /> : <Users size={8} />}{a.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Recording */}
                      {recordingEditId === m.id ? (
                        <div className="flex items-center gap-1.5 pt-1">
                          <input autoFocus className="flex-1 px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-[10px] placeholder:text-[var(--tx6)] focus:outline-none focus:border-[var(--a-border)]" placeholder="Paste recording link…" value={recordingInput} onChange={e => setRecordingInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveRecording(m.id); }} />
                          <button onClick={() => saveRecording(m.id)} className="px-2 py-1 bg-[var(--a)] text-white text-[10px] rounded-lg hover:bg-[var(--a-hover)] transition-colors">Save</button>
                          <button onClick={() => { setRecordingEditId(null); setRecordingInput(""); }} className="px-2 py-1 bg-[var(--surface)] border border-[var(--border)] text-[var(--tx5)] text-[10px] rounded-lg hover:border-[var(--a-border)] transition-colors">Cancel</button>
                        </div>
                      ) : m.recording_url ? (
                        <div className="flex items-center gap-2 pt-1">
                          <a href={m.recording_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] rounded-lg hover:bg-rose-500/20 transition-colors"><Film size={10} /> View Recording</a>
                          {canWrite && <button onClick={() => startRecordingEdit(m.id, m.recording_url)} className="text-[10px] text-[var(--tx5)] hover:text-[var(--a-text)] transition-colors"><Pencil size={10} /></button>}
                        </div>
                      ) : canWrite ? (
                        <button onClick={() => startRecordingEdit(m.id)} className="flex items-center gap-1.5 text-[10px] text-[var(--tx5)] hover:text-rose-400 transition-colors pt-0.5"><Film size={10} /> Add recording link</button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
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
            </>
            )}
          </div>
        </div>
      )}

      {/* ── Add Lead modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl max-h-[88vh] overflow-y-auto">
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
                <div><label className={labelCls}>Date of Birth</label><input type="date" className={cn(inputCls, "[color-scheme:dark]")} value={addForm.date_of_birth} onChange={e => setAddForm(f => ({ ...f, date_of_birth: e.target.value }))} /></div>
                <div><label className={labelCls}>LinkedIn</label><input className={inputCls} placeholder="linkedin.com/in/…" value={addForm.linkedin} onChange={e => setAddForm(f => ({ ...f, linkedin: e.target.value }))} /></div>
              </div>
              <div><label className={labelCls}>Address</label><input className={inputCls} placeholder="City, Country" value={addForm.address} onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))} /></div>
              <div><label className={labelCls}>Summary / About</label><textarea rows={3} className={cn(inputCls, "resize-none")} placeholder="Interests, hobbies, background… (AI-scraped later)" value={addForm.summary} onChange={e => setAddForm(f => ({ ...f, summary: e.target.value }))} /></div>
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
          onClose={() => { setApproveLead(null); setApprovePreset(null); setActiveRequestId(null); }}
          initialAddAccount={approvePreset ? approvePreset.account : true}
          initialAddContact={approvePreset ? approvePreset.contact : true}
          autoStart={!!approvePreset}
        />
      )}

      {/* Edit Lead modal */}
      {editLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={() => setEditLead(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
                <div><label className={labelCls}>Date of Birth</label><input type="date" className={cn(inputCls, "[color-scheme:dark]")} value={editForm.date_of_birth} onChange={e => setEditForm(f => ({ ...f, date_of_birth: e.target.value }))} /></div>
                <div><label className={labelCls}>LinkedIn</label><input className={inputCls} placeholder="linkedin.com/in/…" value={editForm.linkedin} onChange={e => setEditForm(f => ({ ...f, linkedin: e.target.value }))} /></div>
              </div>
              <div><label className={labelCls}>Address</label><input className={inputCls} placeholder="City, Country" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} /></div>
              <div><label className={labelCls}>Summary / About</label><textarea rows={3} className={cn(inputCls, "resize-none")} placeholder="Interests, hobbies, background…" value={editForm.summary} onChange={e => setEditForm(f => ({ ...f, summary: e.target.value }))} /></div>
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

      {/* Schedule Meeting modal (pre-linked to the lead) */}
      {meetingModalLead && (
        <MeetingModal
          onClose={() => setMeetingModalLead(null)}
          onSave={handleSaveMeeting}
          userOptions={userOptions}
          today={today}
          lead={meetingModalLead}
        />
      )}

      {/* Web enrichment results */}
      {enrichTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80]" onClick={() => !enrichLoading && setEnrichTarget(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center"><Sparkles size={18} className="text-violet-400" /></span>
                <div>
                  <h3 className="text-[var(--tx1)] font-semibold">Web Enrichment</h3>
                  <p className="text-[var(--tx5)] text-xs mt-0.5">{enrichTarget.company_name || `${enrichTarget.first_name} ${enrichTarget.last_name}`}</p>
                </div>
              </div>
              <button onClick={() => !enrichLoading && setEnrichTarget(null)} className="text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors"><X size={16} /></button>
            </div>

            <div className="px-6 py-5">
              {enrichLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 size={28} className="animate-spin text-violet-400" />
                  <p className="text-[var(--tx5)] text-xs">Searching the web for company &amp; contacts…</p>
                </div>
              ) : enrichError && !enrichResult ? (
                <div className="flex items-start gap-2 px-3 py-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                  <AlertCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-rose-400 text-xs leading-relaxed">{enrichError}</p>
                </div>
              ) : enrichResult ? (
                <div className="space-y-5">
                  {/* Providers */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-[var(--tx5)]">Sources:</span>
                    {enrichResult.providers_available.map(p => (
                      <span key={p} className={cn("text-[9px] px-1.5 py-0.5 rounded-full border capitalize", enrichResult.providers_used.includes(p) ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-[var(--surface2)] text-[var(--tx6)] border-[var(--border)]")}>{p}{enrichResult.providers_used.includes(p) ? " ✓" : ""}</span>
                    ))}
                  </div>

                  {/* Company card */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[var(--tx5)] text-xs font-medium flex items-center gap-1.5"><Building2 size={12} /> Company</p>
                      {canWriteProfile && (enrichResult.company.industry || enrichResult.company.size || enrichResult.company.website) && (
                        <button onClick={applyEnrichedCompany} className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors">Apply to profile</button>
                      )}
                    </div>
                    <div className="p-3 bg-[var(--surface2)] rounded-xl space-y-1.5 text-xs">
                      {enrichResult.company.industry && <p className="text-[var(--tx3)]"><span className="text-[var(--tx5)]">Industry:</span> {enrichResult.company.industry}</p>}
                      {enrichResult.company.size && <p className="text-[var(--tx3)]"><span className="text-[var(--tx5)]">Size:</span> {enrichResult.company.size}</p>}
                      {enrichResult.company.website && <a href={enrichResult.company.website} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline flex items-center gap-1"><Globe size={10} /> {enrichResult.company.website}</a>}
                      {enrichResult.company.location && <p className="text-[var(--tx3)]"><span className="text-[var(--tx5)]">Location:</span> {enrichResult.company.location}</p>}
                      {enrichResult.company.description && <p className="text-[var(--tx4)] leading-relaxed border-t border-[var(--border)] pt-1.5 mt-1.5">{enrichResult.company.description}</p>}
                      {!enrichResult.company.industry && !enrichResult.company.size && !enrichResult.company.website && !enrichResult.company.location && <p className="text-[var(--tx6)] italic">No company details found.</p>}
                    </div>
                  </div>

                  {/* Contacts */}
                  <div>
                    <p className="text-[var(--tx5)] text-xs font-medium flex items-center gap-1.5 mb-2"><Users size={12} /> Points of Contact <span className="text-[var(--tx6)] font-normal">({enrichResult.pocs.length})</span></p>
                    {enrichResult.pocs.length === 0 ? (
                      <p className="text-[var(--tx6)] text-xs italic">No contacts found.</p>
                    ) : (
                      <div className="space-y-2">
                        {enrichResult.pocs.map((poc, i) => (
                          <div key={i} className="p-3 bg-[var(--surface2)] rounded-xl flex items-start gap-3">
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-[var(--tx2)] text-xs font-medium">{poc.name}</p>
                                {i === 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">Best match</span>}
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--surface)] text-[var(--tx6)] border border-[var(--border)] capitalize">{poc.source}</span>
                              </div>
                              {poc.title && <p className="text-[var(--tx4)] text-[11px] flex items-center gap-1"><Briefcase size={9} /> {poc.title}</p>}
                              {poc.email && <p className="text-sky-400 text-[11px] flex items-center gap-1"><Mail size={9} /> {poc.email}</p>}
                              {poc.linkedin && <a href={poc.linkedin.startsWith("http") ? poc.linkedin : `https://${poc.linkedin}`} target="_blank" rel="noreferrer" className="text-sky-400 text-[11px] flex items-center gap-1 hover:underline"><ExternalLink size={9} /> LinkedIn</a>}
                            </div>
                            {canWriteProfile && (
                              <button onClick={() => applyEnrichedPoc(poc)} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] rounded-lg hover:bg-amber-500/20 transition-colors"><Star size={10} /> Set as POC</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Per-provider errors (debugging) */}
                  {enrichResult.provider_errors && (
                    <div className="space-y-1">
                      {Object.entries(enrichResult.provider_errors).map(([p, msg]) => (
                        <p key={p} className="text-[10px] text-rose-400/80 flex items-start gap-1"><AlertCircle size={10} className="shrink-0 mt-0.5" /><span className="capitalize">{p}:</span> {msg}</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setEnrichTarget(null)} disabled={enrichLoading} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors disabled:opacity-50">Close</button>
              <button onClick={() => runEnrichment(enrichTarget)} disabled={enrichLoading} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">{enrichLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Re-run</button>
            </div>
          </div>
        </div>
      )}

      {/* Compose / send outreach email */}
      {emailLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80]" onClick={() => !emailSending && setEmailLead(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center"><Mail size={18} className="text-sky-400" /></span>
                <div>
                  <h3 className="text-[var(--tx1)] font-semibold">Send Email</h3>
                  <p className="text-[var(--tx5)] text-xs mt-0.5">Review before sending · auto-logged to activity</p>
                </div>
              </div>
              <button onClick={() => !emailSending && setEmailLead(null)} className="text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={labelCls}>To</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg">
                  <Mail size={13} className="text-[var(--tx5)] shrink-0" />
                  <span className="text-[var(--tx3)] text-xs truncate">{emailLead.first_name} {emailLead.last_name} · {emailLead.email}</span>
                </div>
              </div>
              <div><label className={labelCls}>Subject *</label><input className={inputCls} value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} /></div>
              <div><label className={labelCls}>Message *</label><textarea rows={9} className={cn(inputCls, "resize-none leading-relaxed")} value={emailForm.body} onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))} /></div>

              {/* Propose a meeting (Accept/Decline + calendar) */}
              <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setEmailMeeting(m => ({ ...m, enabled: !m.enabled }))}
                  className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors", emailMeeting.enabled ? "bg-[var(--a-subtle)]" : "bg-[var(--surface2)] hover:bg-[var(--surface3)]")}
                >
                  <CalendarPlus size={14} className={emailMeeting.enabled ? "text-[var(--a-text)]" : "text-[var(--tx5)]"} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-medium", emailMeeting.enabled ? "text-[var(--a-text)]" : "text-[var(--tx3)]")}>Propose a meeting</p>
                    <p className="text-[var(--tx6)] text-[10px]">Adds Accept / Decline buttons + calendar invite</p>
                  </div>
                  <div className={cn("w-8 h-4.5 rounded-full transition-colors relative shrink-0", emailMeeting.enabled ? "bg-[var(--a)]" : "bg-[var(--surface3)]")} style={{ height: 18 }}>
                    <div className={cn("absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all", emailMeeting.enabled ? "left-[14px]" : "left-0.5")} />
                  </div>
                </button>

                {emailMeeting.enabled && (
                  <div className="px-3 py-3 space-y-3 border-t border-[var(--border)]">
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={labelCls}>Date *</label><input type="date" className={cn(inputCls, "[color-scheme:dark]")} value={emailMeeting.date} onChange={e => setEmailMeeting(m => ({ ...m, date: e.target.value }))} /></div>
                      <div><label className={labelCls}>Time</label><input type="time" className={cn(inputCls, "[color-scheme:dark]")} value={emailMeeting.time} onChange={e => setEmailMeeting(m => ({ ...m, time: e.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setEmailMeeting(m => ({ ...m, mode: "online" }))} className={cn("flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-colors", emailMeeting.mode === "online" ? "bg-sky-500/15 border-sky-500/50 text-sky-400" : "bg-[var(--surface2)] border-[var(--border)] text-[var(--tx4)]")}><Video size={12} /> Online</button>
                      <button type="button" onClick={() => setEmailMeeting(m => ({ ...m, mode: "offline" }))} className={cn("flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-colors", emailMeeting.mode === "offline" ? "bg-amber-500/15 border-amber-500/50 text-amber-400" : "bg-[var(--surface2)] border-[var(--border)] text-[var(--tx4)]")}><MapPin size={12} /> In person</button>
                    </div>
                    {emailMeeting.mode === "online"
                      ? <div><label className={labelCls}>Meeting link</label><input className={inputCls} placeholder="https://meet.google.com/…" value={emailMeeting.link} onChange={e => setEmailMeeting(m => ({ ...m, link: e.target.value }))} /></div>
                      : <div><label className={labelCls}>Location</label><input className={inputCls} placeholder="UFT Office, Bangalore" value={emailMeeting.location} onChange={e => setEmailMeeting(m => ({ ...m, location: e.target.value }))} /></div>}
                  </div>
                )}
              </div>

              {emailError && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                  <AlertCircle size={13} className="text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-rose-400 text-xs leading-relaxed">{emailError}</p>
                </div>
              )}
              <p className="text-[var(--tx6)] text-[10px]">Sent via your configured email service. A branded HTML version is generated automatically.</p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setEmailLead(null)} disabled={emailSending} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleSendEmail} disabled={emailSending || !emailForm.subject.trim() || !emailForm.body.trim() || (emailMeeting.enabled && !emailMeeting.date)} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {emailSending ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> {emailMeeting.enabled ? "Send Invite" : "Send Email"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] px-4 py-3 rounded-xl text-sm font-medium shadow-2xl bg-[var(--surface)] border border-[var(--a-border)] text-[var(--a-text)] flex items-center gap-2">
          <CheckCircle size={14} /> {toast}
        </div>
      )}
    </div>
  );
}
