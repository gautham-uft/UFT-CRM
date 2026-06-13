"use client";

import { useState } from "react";
import {
  Search, Building2, Users, Briefcase, MapPin, Globe, Mail,
  ExternalLink, Loader2, Sparkles, UserPlus, AlertCircle, Star,
  Clock, CheckCircle, Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useNow } from "@/contexts/NowContext";
import { useAppData } from "@/contexts/AppDataContext";
import { useCollection } from "@/hooks/useCollection";
import NoAccess from "@/components/NoAccess";
import { quickSearch, type QuickSearchResult } from "@/lib/quick-search-client";
import type { EnrichedPOC } from "@/lib/enrichment/types";

const inputCls = "w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-sm placeholder:text-[var(--tx6)] focus:outline-none focus:border-[var(--a-border)] transition-colors";
const labelCls = "block text-[var(--tx5)] text-xs font-medium mb-1";

type Lead = { id: string; first_name: string; last_name: string; email: string; company_name: string };

function ProviderBadges({ used, available, label }: { used: string[]; available: string[]; label: string }) {
  if (available.length === 0) {
    return <span className="text-[10px] text-[var(--tx6)]">{label}: no provider configured</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] text-[var(--tx5)]">{label}:</span>
      {available.map(p => (
        <span key={p} className={cn("text-[9px] px-1.5 py-0.5 rounded-full border capitalize", used.includes(p) ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-[var(--surface2)] text-[var(--tx6)] border-[var(--border)]")}>{p}{used.includes(p) ? " ✓" : ""}</span>
      ))}
    </div>
  );
}

export default function QuickTabPage() {
  const { ready, canRead, canWrite } = usePermissions();
  const { currentUser } = useCurrentUser();
  const { today } = useNow();
  const { addActivity } = useAppData();
  const { items: leads, create: createLead } = useCollection<Lead>("leads");
  const canAddLead = canWrite("Leads");
  const userName = `${currentUser.first_name} ${currentUser.last_name}`.trim();

  const [company, setCompany]   = useState("");
  const [domain, setDomain]     = useState("");
  const [manager, setManager]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [result, setResult]     = useState<QuickSearchResult | null>(null);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [toast, setToast]       = useState("");

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(""), 3000); }

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!company.trim() || loading) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const r = await quickSearch({ company_name: company.trim(), domain: domain.trim() || undefined });
      setResult(r);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Sort contacts so any matching the typed hiring-manager name come first.
  function rankedPocs(pocs: EnrichedPOC[]): EnrichedPOC[] {
    const q = manager.trim().toLowerCase();
    if (!q) return pocs;
    return [...pocs].sort((a, b) => (b.name.toLowerCase().includes(q) ? 1 : 0) - (a.name.toLowerCase().includes(q) ? 1 : 0));
  }
  const matchesManager = (name: string) => {
    const q = manager.trim().toLowerCase();
    return q ? name.toLowerCase().includes(q) : false;
  };

  function addAsLead(poc: EnrichedPOC | null) {
    if (!result || !canAddLead) return;
    const companyName = result.company.name || company.trim();
    const fullName = poc?.name || "";
    const [first, ...rest] = fullName.split(" ");
    const email = poc?.email || "";
    const key = (email || fullName || companyName).toLowerCase();

    if (email && leads.some(l => l.email.toLowerCase() === email.toLowerCase())) {
      showToast("A lead with that email already exists");
      return;
    }

    const openRoles = result.jobs.slice(0, 6).map(j => j.title).join(", ");
    createLead({
      first_name: first || companyName,
      last_name:  rest.join(" "),
      email,
      phone:      "",
      company_name: companyName,
      source:     "quick_search",
      status:     "new",
      created_at: today,
      profile: {
        industry:      result.company.industry,
        company_size:  result.company.size,
        website:       result.company.website,
        open_roles:    openRoles || undefined,
        poc_name:      poc?.name,
        poc_title:     poc?.title,
        poc_email:     poc?.email,
        poc_linkedin:  poc?.linkedin,
        enriched_at:     today,
        enrichment_from: result.enrichment.providers_used.join(", ") || "quick_search",
        last_updated:    today,
      },
    } as Partial<Lead>);

    addActivity({
      user: userName, entity_type: "lead", entity_name: fullName || companyName,
      activity_type: "note", description: `Added ${fullName || companyName} as a lead from Quick Tab search`,
      created_at: new Date().toISOString(),
    });
    setAddedKeys(prev => new Set(prev).add(key));
    showToast("Added to Leads");
  }

  if (ready && !canRead("Quick Search")) return <NoAccess module="Quick Search" />;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[var(--tx1)] text-lg font-semibold flex items-center gap-2"><Search size={18} className="text-[var(--a-text)]" /> Quick Tab</h1>
        <p className="text-[var(--tx5)] text-sm mt-0.5">Research a company on the web — profile, hiring contacts, and open job postings.</p>
      </div>

      {/* Search form */}
      <form onSubmit={runSearch} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><label className={labelCls}>Company name *</label><input className={inputCls} placeholder="Infosys" value={company} onChange={e => setCompany(e.target.value)} /></div>
          <div><label className={labelCls}>Domain <span className="text-[var(--tx6)] font-normal">(optional, improves results)</span></label><input className={inputCls} placeholder="infosys.com" value={domain} onChange={e => setDomain(e.target.value)} /></div>
          <div><label className={labelCls}>Hiring manager <span className="text-[var(--tx6)] font-normal">(optional)</span></label><input className={inputCls} placeholder="Name to highlight" value={manager} onChange={e => setManager(e.target.value)} /></div>
        </div>
        <div className="flex justify-end mt-3">
          <button type="submit" disabled={!company.trim() || loading} className="flex items-center gap-2 px-5 py-2 bg-[var(--a)] text-white text-sm rounded-lg hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Searching…</> : <><Search size={15} /> Search</>}
          </button>
        </div>
      </form>

      {error && (
        <div className="flex items-start gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
          <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
          <p className="text-rose-400 text-sm">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={30} className="animate-spin text-[var(--a-text)]" />
          <p className="text-[var(--tx5)] text-sm">Searching the web for company, contacts &amp; jobs…</p>
        </div>
      )}

      {result && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Left column: company + contacts */}
          <div className="flex flex-col gap-5">
            {/* Company */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[var(--tx2)] text-sm font-semibold flex items-center gap-2"><Building2 size={15} className="text-amber-400" /> Company</h2>
                <ProviderBadges used={result.enrichment.providers_used} available={result.enrichment.providers_available} label="Enrichment" />
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-[var(--tx1)] font-medium">{result.company.name || company}</p>
                {result.company.industry && <p className="text-[var(--tx4)] text-xs"><span className="text-[var(--tx5)]">Industry:</span> {result.company.industry}</p>}
                {result.company.size && <p className="text-[var(--tx4)] text-xs"><span className="text-[var(--tx5)]">Size:</span> {result.company.size}</p>}
                {result.company.location && <p className="text-[var(--tx4)] text-xs flex items-center gap-1"><MapPin size={11} className="text-rose-400" /> {result.company.location}</p>}
                {result.company.website && <a href={result.company.website} target="_blank" rel="noreferrer" className="text-sky-400 text-xs flex items-center gap-1 hover:underline"><Globe size={11} /> {result.company.website}</a>}
                {result.company.description && <p className="text-[var(--tx4)] text-xs leading-relaxed border-t border-[var(--border)] pt-2 mt-2">{result.company.description}</p>}
                {!result.company.industry && !result.company.size && !result.company.website && (
                  <p className="text-[var(--tx6)] text-xs italic">No company details found{result.enrichment.providers_available.length === 0 ? " — add an enrichment key (HUNTER/PDL)." : "."}</p>
                )}
              </div>
              {canAddLead && (
                <button onClick={() => addAsLead(null)} className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx3)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors"><UserPlus size={12} /> Add company as lead</button>
              )}
            </div>

            {/* Contacts */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
              <h2 className="text-[var(--tx2)] text-sm font-semibold flex items-center gap-2 mb-3"><Users size={15} className="text-sky-400" /> Contacts <span className="text-[var(--tx6)] font-normal">({result.pocs.length})</span></h2>
              {result.pocs.length === 0 ? (
                <p className="text-[var(--tx6)] text-xs italic">No contacts found{result.enrichment.providers_available.length === 0 ? " — add an enrichment key." : "."}</p>
              ) : (
                <div className="space-y-2">
                  {rankedPocs(result.pocs).map((poc, i) => {
                    const isMatch = matchesManager(poc.name);
                    const key = (poc.email || poc.name).toLowerCase();
                    const added = addedKeys.has(key);
                    return (
                      <div key={i} className={cn("p-3 rounded-xl flex items-start gap-3 border", isMatch ? "bg-amber-500/10 border-amber-500/40" : "bg-[var(--surface2)] border-transparent")}>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[var(--tx2)] text-xs font-medium">{poc.name}</p>
                            {isMatch && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-0.5"><Star size={8} /> hiring manager</span>}
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--surface)] text-[var(--tx6)] border border-[var(--border)] capitalize">{poc.source}</span>
                          </div>
                          {poc.title && <p className="text-[var(--tx4)] text-[11px] flex items-center gap-1"><Briefcase size={9} /> {poc.title}</p>}
                          {poc.email && <p className="text-sky-400 text-[11px] flex items-center gap-1"><Mail size={9} /> {poc.email}</p>}
                          {poc.linkedin && <a href={poc.linkedin.startsWith("http") ? poc.linkedin : `https://${poc.linkedin}`} target="_blank" rel="noreferrer" className="text-sky-400 text-[11px] flex items-center gap-1 hover:underline"><LinkIcon size={9} /> LinkedIn</a>}
                        </div>
                        {canAddLead && (
                          <button onClick={() => addAsLead(poc)} disabled={added} className={cn("shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg border transition-colors", added ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default" : "bg-[var(--surface)] border-[var(--border)] text-[var(--tx3)] hover:border-[var(--a-border)]")}>
                            {added ? <><CheckCircle size={11} /> Added</> : <><UserPlus size={11} /> Add as Lead</>}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column: jobs */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[var(--tx2)] text-sm font-semibold flex items-center gap-2"><Briefcase size={15} className="text-violet-400" /> Job Postings <span className="text-[var(--tx6)] font-normal">({result.jobs.length})</span></h2>
              <ProviderBadges used={result.jobs_meta.providers_used} available={result.jobs_meta.providers_available} label="Jobs" />
            </div>
            {result.jobs.length === 0 ? (
              <div className="py-8 text-center">
                <Briefcase size={24} className="text-[var(--tx6)] mx-auto mb-2" />
                <p className="text-[var(--tx6)] text-xs">
                  {result.jobs_meta.providers_available.length === 0
                    ? "No jobs provider configured. Add SERPAPI_KEY to .env.local to pull live job postings."
                    : "No open postings found for this company."}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {result.jobs.map((job, i) => (
                  <div key={i} className="p-3 bg-[var(--surface2)] rounded-xl">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[var(--tx2)] text-xs font-medium leading-tight">{job.title}</p>
                      {job.url && <a href={job.url} target="_blank" rel="noreferrer" className="shrink-0 text-sky-400 hover:text-sky-300"><ExternalLink size={12} /></a>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[10px] text-[var(--tx5)]">
                      {job.location && <span className="flex items-center gap-1"><MapPin size={9} /> {job.location}</span>}
                      {job.schedule_type && <span className="flex items-center gap-1"><Clock size={9} /> {job.schedule_type}</span>}
                      {job.posted_at && <span>{job.posted_at}</span>}
                      {job.via && <span className="text-[var(--tx6)]">{job.via}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {result.jobs_meta.provider_errors && (
              <div className="mt-3 space-y-1">
                {Object.entries(result.jobs_meta.provider_errors).map(([p, msg]) => (
                  <p key={p} className="text-[10px] text-rose-400/80 flex items-start gap-1"><AlertCircle size={10} className="shrink-0 mt-0.5" /><span className="capitalize">{p}:</span> {msg}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--a-muted)] flex items-center justify-center mb-4"><Sparkles size={24} className="text-[var(--a-text)]" /></div>
          <p className="text-[var(--tx3)] text-sm font-medium">Search a company to begin</p>
          <p className="text-[var(--tx5)] text-xs mt-1 max-w-sm">Enter a company name above. Add the domain for richer contact data. We&apos;ll pull the company profile, hiring contacts, and live job postings.</p>
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
