"use client";

import { useState } from "react";
import {
  ShieldCheck, XCircle, Clock, Building2, Briefcase, Mail, Link as LinkIcon,
  Loader2, CheckCircle, Inbox, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useCollection } from "@/hooks/useCollection";
import NoAccess from "@/components/NoAccess";
import { respondScoutRequest, type ScoutRequest } from "@/lib/scout-client";

const inputCls = "w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-xs placeholder:text-[var(--tx6)] focus:outline-none focus:border-[var(--a-border)] transition-colors";

const statusCfg: Record<string, { label: string; cls: string; Icon: typeof ShieldCheck }> = {
  pending:   { label: "Pending",   cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",     Icon: Clock },
  found:     { label: "Found",     cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", Icon: ShieldCheck },
  not_found: { label: "Not Found", cls: "bg-rose-500/15 text-rose-400 border-rose-500/30",         Icon: XCircle },
};

export default function NaukriVerifyPage() {
  const { ready, canRead, canWrite } = usePermissions();
  const { currentUser } = useCurrentUser();
  const canVerify = canWrite("Naukri Verification");
  const userName = `${currentUser.first_name} ${currentUser.last_name}`.trim();

  const { items: requests, loading, refresh } = useCollection<ScoutRequest>("scoutRequests");
  const [filter, setFilter] = useState<"pending" | "responded" | "all">("pending");
  const [active, setActive] = useState<{ id: string; status: "found" | "not_found" } | null>(null);
  const [url, setUrl]       = useState("");
  const [note, setNote]     = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState("");

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(""), 3000); }

  const sorted = [...requests].sort((a, b) => (b.requested_at || "").localeCompare(a.requested_at || ""));
  const filtered = sorted.filter(r =>
    filter === "pending"   ? r.status === "pending" :
    filter === "responded" ? r.status !== "pending" : true,
  );
  const pendingCount = requests.filter(r => r.status === "pending").length;

  function startRespond(id: string, status: "found" | "not_found") {
    setActive({ id, status }); setUrl(""); setNote("");
  }

  async function submitRespond() {
    if (!active || saving) return;
    setSaving(true);
    try {
      await respondScoutRequest({ request_id: active.id, status: active.status, naukri_url: url.trim() || undefined, note: note.trim() || undefined, responded_by: userName });
      await refresh();
      setActive(null); setUrl(""); setNote("");
      showToast(active.status === "found" ? "Marked as found on Naukri" : "Marked as not found");
    } catch (err) {
      showToast((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (ready && !canRead("Naukri Verification")) return <NoAccess module="Naukri Verification" />;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[var(--tx1)] text-lg font-semibold flex items-center gap-2"><ShieldCheck size={18} className="text-[var(--a-text)]" /> Naukri Verification</h1>
        <p className="text-[var(--tx5)] text-sm mt-0.5">Verify whether a lead&apos;s point of contact is present on Naukri, and report back.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-stretch gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1 w-fit">
        {(["pending", "responded", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize flex items-center gap-1.5", filter === f ? "bg-[var(--a)] text-white" : "text-[var(--tx4)] hover:text-[var(--tx2)]")}>
            {f}
            {f === "pending" && pendingCount > 0 && <span className={cn("min-w-[16px] h-4 px-1 text-[9px] font-bold rounded-full flex items-center justify-center", filter === f ? "bg-white/25 text-white" : "bg-amber-500 text-white")}>{pendingCount}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={26} className="animate-spin text-[var(--a-text)]" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox size={28} className="text-[var(--tx6)] mb-3" />
          <p className="text-[var(--tx4)] text-sm">No {filter === "all" ? "" : filter} verification requests.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map(r => {
            const cfg = statusCfg[r.status] ?? statusCfg.pending;
            const isActive = active?.id === r.id;
            return (
              <div key={r.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-[var(--tx1)] text-sm font-semibold truncate">{r.poc_name || r.lead_name}</p>
                    <p className="text-[var(--tx5)] text-xs flex items-center gap-1.5 mt-0.5"><Building2 size={11} /> {r.company_name || "—"}</p>
                  </div>
                  <span className={cn("shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border", cfg.cls)}><cfg.Icon size={10} /> {cfg.label}</span>
                </div>

                <div className="space-y-1.5 mb-3">
                  {r.poc_title && <p className="text-[var(--tx4)] text-xs flex items-center gap-1.5"><Briefcase size={11} className="text-[var(--tx5)]" /> {r.poc_title}</p>}
                  {r.poc_email && <p className="text-sky-400 text-xs flex items-center gap-1.5"><Mail size={11} /> {r.poc_email}</p>}
                  {r.poc_linkedin && <a href={r.poc_linkedin.startsWith("http") ? r.poc_linkedin : `https://${r.poc_linkedin}`} target="_blank" rel="noreferrer" className="text-sky-400 text-xs flex items-center gap-1.5 hover:underline"><LinkIcon size={11} /> LinkedIn</a>}
                  <p className="text-[var(--tx6)] text-[10px] flex items-center gap-1.5 pt-1"><User size={10} /> Requested by {r.requested_by || "—"}{r.assigned_to ? ` · for ${r.assigned_to}` : ""} · {r.requested_at ? new Date(r.requested_at).toLocaleDateString() : ""}</p>
                </div>

                {/* Responded result */}
                {r.status !== "pending" && (
                  <div className={cn("rounded-lg border p-2.5 text-xs", cfg.cls)}>
                    <p className="font-medium flex items-center gap-1.5"><cfg.Icon size={12} /> {r.status === "found" ? "Found on Naukri" : "Not found on Naukri"}</p>
                    {r.naukri_url && <a href={r.naukri_url} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline break-all">{r.naukri_url}</a>}
                    {r.note && <p className="text-[var(--tx4)] mt-1">{r.note}</p>}
                    {r.responded_by && <p className="text-[var(--tx6)] text-[10px] mt-1">by {r.responded_by}{r.responded_at ? ` · ${new Date(r.responded_at).toLocaleDateString()}` : ""}</p>}
                  </div>
                )}

                {/* Respond actions (pending only) */}
                {r.status === "pending" && canVerify && (
                  isActive ? (
                    <div className="space-y-2 border-t border-[var(--border)] pt-3">
                      {active.status === "found" && (
                        <input className={inputCls} placeholder="Naukri profile URL (optional)" value={url} onChange={e => setUrl(e.target.value)} />
                      )}
                      <input className={inputCls} placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
                      <div className="flex gap-2">
                        <button onClick={() => setActive(null)} className="flex-1 py-2 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors">Cancel</button>
                        <button onClick={submitRespond} disabled={saving} className={cn("flex-1 py-2 text-white text-xs rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50", active.status === "found" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700")}>
                          {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Confirm {active.status === "found" ? "Found" : "Not Found"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 border-t border-[var(--border)] pt-3">
                      <button onClick={() => startRespond(r.id, "found")} className="flex-1 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg hover:bg-emerald-500/20 transition-colors font-medium flex items-center justify-center gap-1.5"><ShieldCheck size={12} /> Found</button>
                      <button onClick={() => startRespond(r.id, "not_found")} className="flex-1 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg hover:bg-rose-500/20 transition-colors font-medium flex items-center justify-center gap-1.5"><XCircle size={12} /> Not Found</button>
                    </div>
                  )
                )}
              </div>
            );
          })}
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
