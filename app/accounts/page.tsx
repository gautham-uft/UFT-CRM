"use client";

import { useState } from "react";
import { mockAccounts, mockContacts } from "@/lib/mock-data";
import { Plus, Globe, Users, TrendingUp, X, Building2, CheckCircle } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";

type Account = (typeof mockAccounts)[0];
type Contact = (typeof mockContacts)[0];

const inputCls = "w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-xs placeholder:text-[var(--tx6)] focus:outline-none focus:border-[var(--a-border)] transition-colors";
const labelCls = "block text-[var(--tx5)] text-xs font-medium mb-1";

const EMPTY_FORM = { name: "", domain: "", industry: "", employee_count: "", founded_year: "", annual_revenue: "" };

export default function AccountsPage() {
  const { items: accounts, create: createAccount } = useCollection<Account>("accounts");
  const { items: contacts } = useCollection<Contact>("contacts");
  const [selected,     setSelected]     = useState<Account | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm,      setAddForm]      = useState(EMPTY_FORM);
  const [toast,        setToast]        = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  const accountContacts = selected ? contacts.filter(c => c.account_id === selected.id) : [];

  function handleAddAccount() {
    if (!addForm.name.trim()) return;
    createAccount({
      name:           addForm.name.trim(),
      domain:         addForm.domain.trim(),
      industry:       addForm.industry.trim() || "Other",
      website:        addForm.domain ? `https://${addForm.domain}` : "",
      employee_count: parseInt(addForm.employee_count) || 0,
      annual_revenue: addForm.annual_revenue.trim() || "—",
      founded_year:   parseInt(addForm.founded_year) || new Date().getFullYear(),
      contacts:       0,
      deals:          0,
    });
    setAddForm(EMPTY_FORM);
    setShowAddModal(false);
    showToast("Account added");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-[var(--tx5)] text-sm">{accounts.length} accounts</span>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--a)] text-white text-xs rounded-lg hover:bg-[var(--a-hover)] transition-colors">
          <Plus size={13} /> Add Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accounts.map(acc => (
          <div key={acc.id} onClick={() => setSelected(acc)} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 cursor-pointer hover:border-[var(--a-border)] transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center"><Building2 size={16} className="text-amber-400" /></div>
              <span className="text-xs text-[var(--tx5)] bg-[var(--surface2)] px-2 py-0.5 rounded-full">{acc.industry}</span>
            </div>
            <h3 className="text-[var(--tx1)] font-semibold text-sm mb-1">{acc.name}</h3>
            <p className="text-[var(--tx5)] text-xs mb-3">{acc.domain || "—"}</p>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border)]">
              <div className="text-center"><p className="text-[var(--tx1)] font-semibold text-sm">{acc.contacts}</p><p className="text-[var(--tx6)] text-xs">Contacts</p></div>
              <div className="text-center"><p className="text-[var(--tx1)] font-semibold text-sm">{acc.deals}</p><p className="text-[var(--tx6)] text-xs">Deals</p></div>
              <div className="text-center"><p className="text-emerald-400 font-semibold text-sm">{acc.annual_revenue}</p><p className="text-[var(--tx6)] text-xs">Revenue</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Account detail modal ── */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col gap-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 className="text-[var(--tx2)] font-semibold text-sm">Account Detail</h2>
              <button onClick={() => setSelected(null)} className="text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors"><X size={14} /></button>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0"><Building2 size={24} className="text-amber-400" /></div>
              <div><p className="text-[var(--tx1)] font-semibold text-base">{selected.name}</p><p className="text-[var(--tx4)] text-xs mt-0.5">{selected.industry}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-3 p-4 bg-[var(--surface2)] rounded-xl">
              <div className="text-center"><p className="text-[var(--tx1)] font-bold text-lg">{selected.contacts}</p><p className="text-[var(--tx6)] text-xs">Contacts</p></div>
              <div className="text-center border-x border-[var(--border)]"><p className="text-[var(--tx1)] font-bold text-lg">{selected.deals}</p><p className="text-[var(--tx6)] text-xs">Deals</p></div>
              <div className="text-center"><p className="text-emerald-400 font-bold text-lg">{selected.annual_revenue}</p><p className="text-[var(--tx6)] text-xs">Revenue</p></div>
            </div>
            <div className="space-y-2">
              {[
                { label: "Domain",    value: selected.domain || "—",                          icon: Globe },
                { label: "Employees", value: selected.employee_count?.toLocaleString() ?? "—", icon: Users },
                { label: "Revenue",   value: selected.annual_revenue,                          icon: TrendingUp },
                { label: "Founded",   value: String(selected.founded_year),                    icon: Building2 },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 p-2.5 bg-[var(--surface2)] rounded-lg">
                  <Icon size={13} className="text-[var(--tx5)]" />
                  <span className="text-[var(--tx5)] text-xs w-16">{label}</span>
                  <span className="text-[var(--tx3)] text-xs">{value}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[var(--tx5)] text-xs font-medium mb-2">Contacts ({accountContacts.length})</p>
              {accountContacts.length === 0 ? (
                <p className="text-[var(--tx6)] text-xs">No contacts linked.</p>
              ) : (
                <div className="space-y-2">
                  {accountContacts.map(c => (
                    <div key={c.id} className="flex items-center gap-2 p-2.5 bg-[var(--surface2)] rounded-lg">
                      <div className="w-7 h-7 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 text-xs font-medium">{c.first_name[0]}</div>
                      <div><p className="text-[var(--tx3)] text-xs font-medium">{c.first_name} {c.last_name}</p><p className="text-[var(--tx6)] text-xs">{c.job_title}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Account modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[var(--tx1)] font-semibold">Add Account</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className={labelCls}>Company Name *</label><input className={inputCls} placeholder="Acme Corporation" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><label className={labelCls}>Domain</label><input className={inputCls} placeholder="acme.com" value={addForm.domain} onChange={e => setAddForm(f => ({ ...f, domain: e.target.value }))} /></div>
              <div><label className={labelCls}>Industry</label><input className={inputCls} placeholder="SaaS, Healthcare, Finance…" value={addForm.industry} onChange={e => setAddForm(f => ({ ...f, industry: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Employee Count</label><input type="number" className={inputCls} placeholder="250" value={addForm.employee_count} onChange={e => setAddForm(f => ({ ...f, employee_count: e.target.value }))} /></div>
                <div><label className={labelCls}>Founded Year</label><input type="number" className={inputCls} placeholder="2015" value={addForm.founded_year} onChange={e => setAddForm(f => ({ ...f, founded_year: e.target.value }))} /></div>
              </div>
              <div><label className={labelCls}>Annual Revenue</label><input className={inputCls} placeholder="$10M" value={addForm.annual_revenue} onChange={e => setAddForm(f => ({ ...f, annual_revenue: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setAddForm(EMPTY_FORM); }} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors">Cancel</button>
              <button onClick={handleAddAccount} disabled={!addForm.name.trim()} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Add Account</button>
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
