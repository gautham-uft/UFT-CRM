"use client";

import { useState } from "react";
import { ShieldCheck, Sparkles, Check, Save, Database, Bot, KeyRound, Globe, Plus, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCollection } from "@/hooks/useCollection";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { SUPERUSER_ROLE } from "@/lib/permissions";
import { defaultSettings, type AppSettings, type AiProvider, type AiModel, type EnrichmentVendor } from "@/lib/core/settings";
import { type DumpRecord } from "@/lib/core/dump";
import NoAccess from "@/components/NoAccess";

type SettingsDoc = {
  id: string;
  enrichment?: Partial<Record<EnrichmentVendor, boolean>>;
  ai?: { provider?: string; model?: string; apiKey?: string; baseUrl?: string };
  models?: AiModel[];
  activeModelId?: string;
};

const ADD = "__add__";

function newId(): string {
  try { return crypto.randomUUID(); } catch { return `m-${Date.now()}-${Math.floor(Math.random() * 1e6)}`; }
}

const VENDORS: { key: EnrichmentVendor; label: string; kind: string; env: string; note: string }[] = [
  { key: "apollo",  label: "Apollo.io",        kind: "Enrichment", env: "APOLLO_API_KEY", note: "Company + people search (hiring contacts)." },
  { key: "hunter",  label: "Hunter.io",        kind: "Enrichment", env: "HUNTER_API_KEY", note: "Emails by company domain." },
  { key: "pdl",     label: "People Data Labs",  kind: "Enrichment", env: "PDL_API_KEY",    note: "Company + person data; strong India coverage." },
  { key: "serpapi", label: "SerpAPI",           kind: "Job postings", env: "SERPAPI_KEY",  note: "Google Jobs engine (Quick Tab)." },
];

const AI_PROVIDERS: { key: AiProvider; label: string; env: string; models: string[]; baseUrl?: boolean }[] = [
  { key: "gemini",    label: "Google Gemini",        env: "GEMINI_API_KEY",    models: ["gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-2.5-pro"] },
  { key: "openai",    label: "OpenAI-compatible",    env: "OPENAI_API_KEY",    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"], baseUrl: true },
  { key: "anthropic", label: "Anthropic (Claude)",   env: "ANTHROPIC_API_KEY", models: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"] },
];

const inputCls = "w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-sm focus:outline-none focus:border-[var(--a-border)] transition-colors";
const labelCls = "block text-[var(--tx5)] text-xs font-medium mb-1.5";

function fromDoc(doc?: SettingsDoc): AppSettings {
  const d = defaultSettings();
  if (!doc) return d;
  const e = doc.enrichment ?? {};
  const a = doc.ai ?? {};
  const provider = (["gemini", "openai", "anthropic"] as const).includes(a.provider as AiProvider) ? (a.provider as AiProvider) : d.ai.provider;
  const ai = { provider, model: a.model ?? "", apiKey: a.apiKey ?? "", baseUrl: a.baseUrl ?? "" };

  let models = Array.isArray(doc.models) ? doc.models.filter(m => m && m.id) : [];
  let activeModelId = doc.activeModelId ?? "";
  // Seed with the built-in models of the provider we actually use (Gemini by
  // default), so the dropdown lists the models we have. Admins add others via
  // "Add AI model". Deterministic ids keep them stable across reloads.
  if (models.length === 0) {
    const prov = AI_PROVIDERS.find(p => p.key === ai.provider) ?? AI_PROVIDERS[0];
    models = prov.models.map(m => ({ id: `${prov.key}:${m}`, name: m, provider: prov.key, model: m, apiKey: "", baseUrl: "" }));
    // Carry any stored key/baseUrl onto the matching (or first) entry.
    if (ai.apiKey || ai.baseUrl) {
      const match = models.find(m => m.model === ai.model) ?? models[0];
      match.apiKey = ai.apiKey;
      match.baseUrl = ai.baseUrl;
    }
    activeModelId = models.find(m => m.model === ai.model)?.id ?? models[0].id;
  }
  if (!models.some(m => m.id === activeModelId)) activeModelId = models[0].id;

  return {
    enrichment: {
      apollo:  e.apollo  ?? d.enrichment.apollo,
      hunter:  e.hunter  ?? d.enrichment.hunter,
      pdl:     e.pdl     ?? d.enrichment.pdl,
      serpapi: e.serpapi ?? d.enrichment.serpapi,
    },
    ai,
    models,
    activeModelId,
  };
}

const EMPTY_MODEL_FORM: { name: string; provider: AiProvider; model: string; apiKey: string; baseUrl: string } =
  { name: "", provider: "gemini", model: "", apiKey: "", baseUrl: "" };

export default function AdminPage() {
  const { currentUser } = useCurrentUser();
  const isDirector = currentUser.role === SUPERUSER_ROLE;

  const { items, loading, create, update } = useCollection<SettingsDoc>("settings");
  const doc = items.find(i => i.id === "app");

  // Hidden "dump" store — extra/personal info per entity, only visible here.
  const { items: dumps } = useCollection<DumpRecord>("dump");
  const [dumpQuery, setDumpQuery] = useState("");
  const dumpFiltered = dumps.filter(d => {
    const q = dumpQuery.trim().toLowerCase();
    if (!q) return true;
    return [d.entity_type, d.entity_name, JSON.stringify(d.data)].some(s => String(s).toLowerCase().includes(q));
  });

  const [form, setForm] = useState<AppSettings>(defaultSettings());
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  // Add/Edit AI model modal.
  const [modelModal, setModelModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [modelForm, setModelForm] = useState(EMPTY_MODEL_FORM);

  // Seed the form once the stored settings arrive (adjust-state-during-render).
  if (!seeded && !loading) {
    setSeeded(true);
    setForm(fromDoc(doc));
  }

  if (!isDirector) return <NoAccess module="Admin Panel" />;

  const activeModel = form.models.find(m => m.id === form.activeModelId) ?? null;
  const modelProviderCfg = AI_PROVIDERS.find(p => p.key === (activeModel?.provider ?? "gemini"))!;
  const formProviderCfg = AI_PROVIDERS.find(p => p.key === modelForm.provider)!;

  function setEnrichment(k: EnrichmentVendor, v: boolean) {
    setForm(f => ({ ...f, enrichment: { ...f.enrichment, [k]: v } }));
  }

  // Active-model dropdown: pick an existing model, or "Add a model…".
  function onSelectModel(value: string) {
    if (value === ADD) { openAddModel(); return; }
    setForm(f => ({ ...f, activeModelId: value }));
  }
  function openAddModel() {
    setEditId(null);
    setModelForm(EMPTY_MODEL_FORM);
    setModelModal(true);
  }
  function openEditModel(m: AiModel) {
    setEditId(m.id);
    setModelForm({ name: m.name, provider: m.provider, model: m.model, apiKey: m.apiKey ?? "", baseUrl: m.baseUrl ?? "" });
    setModelModal(true);
  }
  function saveModel() {
    if (!modelForm.name.trim() || !modelForm.model.trim()) return;
    const entry: AiModel = {
      id: editId ?? newId(),
      name: modelForm.name.trim(),
      provider: modelForm.provider,
      model: modelForm.model.trim(),
      apiKey: modelForm.apiKey.trim(),
      baseUrl: modelForm.provider === "openai" ? modelForm.baseUrl.trim() : "",
    };
    setForm(f => {
      const models = editId ? f.models.map(m => (m.id === editId ? entry : m)) : [...f.models, entry];
      return { ...f, models, activeModelId: entry.id };
    });
    setModelModal(false);
  }
  function removeModel(id: string) {
    setForm(f => {
      const models = f.models.filter(m => m.id !== id);
      const activeModelId = f.activeModelId === id ? (models[0]?.id ?? "") : f.activeModelId;
      return { ...f, models, activeModelId };
    });
  }

  async function save() {
    setSaving(true);
    try {
      // Mirror the active model onto `ai` so the AI provider layer (which reads a
      // single flat config) keeps working unchanged.
      const am = form.models.find(m => m.id === form.activeModelId);
      const ai = am
        ? { provider: am.provider, model: am.model, apiKey: am.apiKey ?? "", baseUrl: am.baseUrl ?? "" }
        : form.ai;
      const payload = { enrichment: form.enrichment, ai, models: form.models, activeModelId: form.activeModelId };
      if (doc) await update(doc.id, payload as Partial<SettingsDoc>);
      else await create({ id: "app", ...payload } as Partial<SettingsDoc>);
      setToast("Settings saved");
      setTimeout(() => setToast(""), 3000);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Failed to save");
      setTimeout(() => setToast(""), 4000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-[var(--tx1)] text-lg font-semibold flex items-center gap-2"><ShieldCheck size={18} className="text-[var(--a-text)]" /> Admin Panel</h1>
        <p className="text-[var(--tx5)] text-sm mt-0.5">Director-only. Choose which data vendors enrich leads and which AI model powers summaries.</p>
      </div>

      {/* ── Data vendors ── */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1"><Database size={15} className="text-[var(--a-text)]" /><h2 className="text-[var(--tx2)] font-semibold text-sm">Data Vendors</h2></div>
        <p className="text-[var(--tx5)] text-xs mb-4">Turn vendors on or off for lead enrichment & Quick Tab. The API key for each lives in <span className="font-mono text-[var(--tx4)]">.env.local</span>; a vendor with no key shows as not configured.</p>
        <div className="space-y-2">
          {VENDORS.map(v => {
            const on = form.enrichment[v.key];
            return (
              <button key={v.key} onClick={() => setEnrichment(v.key, !on)} className={cn("w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors", on ? "bg-[var(--a-muted)] border-[var(--a-border)]" : "bg-[var(--surface2)] border-[var(--border)] hover:border-[var(--a-border)]")}>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--tx2)] text-sm font-medium flex items-center gap-2">{v.label}<span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[var(--surface3)] text-[var(--tx5)]">{v.kind}</span></p>
                  <p className="text-[var(--tx5)] text-xs mt-0.5">{v.note} <span className="text-[var(--tx6)]">· key: {v.env}</span></p>
                </div>
                <span className={cn("relative w-9 h-5 rounded-full transition-colors shrink-0", on ? "bg-emerald-500" : "bg-[var(--surface3)]")}>
                  <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all", on ? "left-[18px]" : "left-0.5")} />
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[var(--tx6)] text-[11px] mt-3">Note: Apify is a lead-import source (configured via webhook/env), not an enrichment vendor, so it isn&apos;t toggled here.</p>
      </section>

      {/* ── AI model ── */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1"><Bot size={15} className="text-violet-400" /><h2 className="text-[var(--tx2)] font-semibold text-sm">AI Model</h2></div>
        <p className="text-[var(--tx5)] text-xs mb-4">Powers the AI summaries (leads, contacts, accounts). Pick the active model, or add your own.</p>

        <div>
          <label className={labelCls}><span className="flex items-center gap-1.5"><Sparkles size={12} className="text-violet-400" /> Active model</span></label>
          <select className={inputCls} value={form.activeModelId} onChange={e => onSelectModel(e.target.value)}>
            {form.models.map(m => {
              const pl = AI_PROVIDERS.find(p => p.key === m.provider)?.label ?? m.provider;
              const label = m.name && m.name !== m.model ? `${m.name} — ${pl} · ${m.model}` : `${pl} · ${m.model || "default"}`;
              return <option key={m.id} value={m.id}>{label}</option>;
            })}
            <option value={ADD}>➕ Add a model…</option>
          </select>
        </div>

        {/* Active model details + manage */}
        {activeModel && (
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[var(--tx2)] text-sm font-medium">{activeModel.name}</p>
                <div className="mt-1.5 space-y-1 text-[11px] text-[var(--tx5)]">
                  <p><span className="text-[var(--tx6)]">Provider:</span> {modelProviderCfg.label}</p>
                  <p><span className="text-[var(--tx6)]">Model ID:</span> <span className="font-mono text-[var(--tx4)]">{activeModel.model || "(provider default)"}</span></p>
                  {activeModel.baseUrl && <p><span className="text-[var(--tx6)]">Base URL:</span> <span className="font-mono text-[var(--tx4)]">{activeModel.baseUrl}</span></p>}
                  <p><span className="text-[var(--tx6)]">API key:</span> {activeModel.apiKey ? "set (stored in DB)" : `using ${modelProviderCfg.env} from .env.local`}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => openEditModel(activeModel)} className="flex items-center gap-1 text-[11px] text-[var(--tx5)] hover:text-[var(--a-text)] transition-colors px-2 py-1 rounded-md hover:bg-[var(--surface3)]"><Pencil size={12} /> Edit</button>
                {form.models.length > 1 && (
                  <button onClick={() => removeModel(activeModel.id)} className="flex items-center gap-1 text-[11px] text-[var(--tx5)] hover:text-rose-400 transition-colors px-2 py-1 rounded-md hover:bg-rose-500/10"><Trash2 size={12} /> Remove</button>
                )}
              </div>
            </div>
          </div>
        )}

        <button onClick={openAddModel} className="mt-3 inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"><Plus size={13} /> Add a model</button>
      </section>

      {/* ── Dump data (hidden store) ── */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1"><Database size={15} className="text-[var(--tx4)]" /><h2 className="text-[var(--tx2)] font-semibold text-sm">Dump Data</h2></div>
        <p className="text-[var(--tx5)] text-xs mb-4">Extra info captured for records (hobbies, favourites, unmapped CSV columns, etc.). Hidden everywhere else and never deleted — it&apos;s fed into AI summaries to add a personal touch and conversation starters.</p>

        {dumps.length === 0 ? (
          <p className="text-[var(--tx5)] text-xs italic">No dump data yet. Extra columns from a CSV import (left as “Extra”) land here.</p>
        ) : (
          <>
            <input
              value={dumpQuery}
              onChange={e => setDumpQuery(e.target.value)}
              placeholder="Search by type, name, or content…"
              className={cn(inputCls, "mb-3")}
            />
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {dumpFiltered.length === 0 ? (
                <p className="text-[var(--tx5)] text-xs italic">No dump records match “{dumpQuery}”.</p>
              ) : dumpFiltered.map(d => (
                <div key={d.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-3">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[var(--surface3)] text-[var(--tx4)]">{d.entity_type || "—"}</span>
                    <span className="text-[var(--tx2)] text-sm font-medium">{d.entity_name || d.entity_id}</span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(d.data ?? {}).map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-xs">
                        <span className="text-[var(--tx5)] min-w-[110px] shrink-0 capitalize">{k.replace(/[_-]+/g, " ")}</span>
                        <span className="text-[var(--tx3)] break-words">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving || loading} className="flex items-center gap-2 px-4 py-2 bg-[var(--a)] text-white text-sm rounded-lg hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-50">
          <Save size={15} /> {saving ? "Saving…" : "Save settings"}
        </button>
      </div>

      {/* ── Add / Edit AI model modal ── */}
      {modelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80]" onClick={() => setModelModal(false)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[var(--tx1)] font-semibold flex items-center gap-2"><Bot size={16} className="text-violet-400" /> {editId ? "Edit AI model" : "Add AI model"}</h3>
              <button onClick={() => setModelModal(false)} className="text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Name *</label>
                <input className={inputCls} placeholder="e.g. Gemini Flash (prod)" value={modelForm.name} onChange={e => setModelForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}><span className="flex items-center gap-1.5"><Sparkles size={12} className="text-violet-400" /> Provider</span></label>
                <select className={inputCls} value={modelForm.provider} onChange={e => setModelForm(f => ({ ...f, provider: e.target.value as AiProvider }))}>
                  {AI_PROVIDERS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Model ID *</label>
                <input className={inputCls} list="ai-model-suggestions" placeholder={formProviderCfg.models[0]} value={modelForm.model} onChange={e => setModelForm(f => ({ ...f, model: e.target.value }))} />
                <datalist id="ai-model-suggestions">{formProviderCfg.models.map(m => <option key={m} value={m} />)}</datalist>
                <p className="text-[var(--tx6)] text-[11px] mt-1.5">The exact model id sent to the provider. Suggestions for {formProviderCfg.label} are listed; you can type any.</p>
              </div>
              {modelForm.provider === "openai" && (
                <div>
                  <label className={labelCls}><span className="flex items-center gap-1.5"><Globe size={12} /> Base URL <span className="text-[var(--tx6)] font-normal">(OpenAI-compatible endpoints)</span></span></label>
                  <input className={inputCls} placeholder="https://api.openai.com/v1" value={modelForm.baseUrl} onChange={e => setModelForm(f => ({ ...f, baseUrl: e.target.value }))} />
                </div>
              )}
              <div>
                <label className={labelCls}><span className="flex items-center gap-1.5"><KeyRound size={12} /> API Key <span className="text-[var(--tx6)] font-normal">(optional)</span></span></label>
                <input type="password" className={inputCls} placeholder={`Leave blank to use ${formProviderCfg.env} from .env.local`} value={modelForm.apiKey} onChange={e => setModelForm(f => ({ ...f, apiKey: e.target.value }))} />
                <p className="text-[var(--tx6)] text-[11px] mt-1.5">Stored in the database. For production prefer the <span className="font-mono">{formProviderCfg.env}</span> env var and leave this blank.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModelModal(false)} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors">Cancel</button>
              <button onClick={saveModel} disabled={!modelForm.name.trim() || !modelForm.model.trim()} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">{editId ? "Save model" : "Add model"}</button>
            </div>
            <p className="text-[var(--tx6)] text-[11px] mt-3">Note: adding here doesn&apos;t save the panel — click <span className="text-[var(--tx4)]">Save settings</span> afterwards to persist.</p>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] px-4 py-3 rounded-xl text-sm font-medium shadow-2xl bg-[var(--surface)] border border-[var(--a-border)] text-[var(--a-text)] flex items-center gap-2">
          <Check size={14} /> {toast}
        </div>
      )}
    </div>
  );
}
