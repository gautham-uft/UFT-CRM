"use client";

import { useState } from "react";
import { Activity, ChevronDown, Sparkles, Loader2, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCollection } from "@/hooks/useCollection";
import type { CollectionName } from "@/lib/contracts/collections";
import { apiUrl } from "@/lib/api-base";

type ActivityKind = "account" | "contact" | "lead";
type EntityRow = { id: string; activity_summary?: string; activity_summary_at?: string };

const SCOPE_HINT: Record<ActivityKind, string> = {
  account: "Digest every call, email, note, and meeting logged across this account, its contacts, deals, and leads.",
  contact: "Digest every call, email, note, and meeting logged for this contact and the deals they're on.",
  lead: "Digest every call, email, note, and meeting logged for this lead.",
};

// Collapsible "Activity Summary" section at the bottom of an account / contact /
// lead detail view. On demand it asks the AI to digest every interaction logged
// for the record (for an account, across everything under it). The result is
// cached on the record's row so reopening it doesn't regenerate.
export default function ActivityPanel({
  kind,
  collection,
  entityId,
  canWrite,
}: {
  kind: ActivityKind;
  collection: CollectionName;
  entityId: string;
  canWrite: boolean;
}) {
  const { items, update } = useCollection<EntityRow>(collection);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [empty, setEmpty] = useState(false);

  const rec = items.find(r => r.id === entityId);
  const summary = rec?.activity_summary;
  const at = rec?.activity_summary_at;

  async function generate() {
    setBusy(true); setError(""); setEmpty(false);
    try {
      const res = await fetch(apiUrl("/api/v1/ai/activity-summary"), {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id: entityId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string })?.error || `Failed (${res.status})`);
      const text = String((data as { summary?: string }).summary ?? "").trim();
      if (!text) { setEmpty(true); return; }
      update(entityId, { activity_summary: text, activity_summary_at: new Date().toISOString() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to summarise activity.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-[var(--border)] pt-4">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors">
        <span className="flex items-center gap-1.5 text-xs font-medium"><Activity size={13} className="text-violet-400" /> Activity Summary</span>
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {busy ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface2)] p-4 text-center">
              <Loader2 size={16} className="text-violet-400 mx-auto mb-1.5 animate-spin" />
              <p className="text-[var(--tx5)] text-xs italic">Digesting activity…</p>
            </div>
          ) : summary ? (
            <>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-3">
                <p className="text-[var(--tx3)] text-xs leading-relaxed whitespace-pre-wrap">{summary}</p>
                {at && <p className="text-[var(--tx6)] text-[10px] mt-2">Generated {new Date(at).toLocaleString()}</p>}
              </div>
              {canWrite && (
                <button onClick={generate} className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"><Sparkles size={10} /> Regenerate</button>
              )}
              {error && <p className="text-rose-400 text-[10px]">{error}</p>}
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface2)] p-4 text-center">
              {empty
                ? <p className="text-[var(--tx5)] text-xs mb-2.5">No activity logged for this {kind} yet.</p>
                : error
                ? <p className="text-rose-400 text-xs mb-2.5">{error}</p>
                : <p className="text-[var(--tx5)] text-xs mb-2.5">{SCOPE_HINT[kind]}</p>}
              {canWrite ? (
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <button onClick={generate} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 border border-violet-500/30 text-violet-300 text-[11px] rounded-lg hover:bg-violet-500/20 transition-colors"><Sparkles size={11} /> {error ? "Retry" : "Summarise activity"}</button>
                  {error && <Link href="/admin" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--tx3)] text-[11px] rounded-lg hover:border-[var(--a-border)] transition-colors"><Settings size={11} /> Change AI model</Link>}
                </div>
              ) : (
                <span className="text-[var(--tx6)] text-[10px]">Ask an editor to generate one.</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
