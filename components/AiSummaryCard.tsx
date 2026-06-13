"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, Pencil, Settings, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Reusable "AI Summary" card: shows the generated summary, a generate/regenerate
// button, loading + error states. The caller owns the data + the generate call.
// On error (e.g. the AI API is unreachable) the user can type a summary by hand
// or jump to the Admin Panel to switch the AI model.
export default function AiSummaryCard({
  summary,
  busy,
  error,
  canWrite,
  onGenerate,
  onSaveManual,
}: {
  summary?: string;
  busy: boolean;
  error: string;
  canWrite: boolean;
  onGenerate: () => void;
  onSaveManual?: (text: string) => void;
}) {
  const [manual, setManual] = useState(false);
  const [draft, setDraft] = useState("");

  function saveManual() {
    const text = draft.trim();
    if (!text || !onSaveManual) return;
    onSaveManual(text);
    setManual(false);
    setDraft("");
  }

  // Manual-entry editor (opened from an error state).
  const manualEditor = (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-3">
      <textarea
        autoFocus rows={4} value={draft} onChange={e => setDraft(e.target.value)}
        placeholder="Type a summary…"
        className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--tx2)] text-xs resize-none focus:outline-none focus:border-[var(--a-border)]"
      />
      <div className="flex items-center gap-2 mt-2">
        <button onClick={saveManual} disabled={!draft.trim()} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--a)] text-white text-[11px] rounded-md hover:bg-[var(--a-hover)] transition-colors disabled:opacity-40"><Check size={11} /> Save</button>
        <button onClick={() => { setManual(false); setDraft(""); }} className="text-[11px] text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors">Cancel</button>
      </div>
    </div>
  );

  // Actions shown when generation failed: retry, type by hand, or change model.
  const errorActions = (
    <div className="flex items-center justify-center gap-3 flex-wrap mt-2">
      {canWrite && <button onClick={onGenerate} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 border border-violet-500/30 text-violet-300 text-[11px] rounded-lg hover:bg-violet-500/20 transition-colors"><Sparkles size={11} /> Retry</button>}
      {canWrite && onSaveManual && <button onClick={() => setManual(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--tx3)] text-[11px] rounded-lg hover:border-[var(--a-border)] transition-colors"><Pencil size={11} /> Type manually</button>}
      <Link href="/admin" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--tx3)] text-[11px] rounded-lg hover:border-[var(--a-border)] transition-colors"><Settings size={11} /> Change AI model</Link>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[var(--tx5)] text-xs font-medium flex items-center gap-1.5"><Sparkles size={12} className="text-violet-400" /> AI Summary</p>
        {canWrite && summary && !busy && !manual && (
          <button onClick={onGenerate} className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"><Sparkles size={10} /> Regenerate</button>
        )}
      </div>
      {manual ? manualEditor : busy ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface2)] p-4 text-center">
          <Loader2 size={16} className="text-violet-400 mx-auto mb-1.5 animate-spin" />
          <p className="text-[var(--tx5)] text-xs italic">Generating summary…</p>
        </div>
      ) : summary ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-3">
          <p className="text-[var(--tx3)] text-xs leading-relaxed whitespace-pre-wrap">{summary}</p>
          {error && <><p className="text-rose-400 text-[10px] mt-2">{error}</p>{errorActions}</>}
        </div>
      ) : (
        <div className={cn("rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface2)] p-4 text-center")}>
          <Sparkles size={18} className="text-violet-400 mx-auto mb-1.5 opacity-70" />
          {error
            ? <p className="text-rose-400 text-xs mb-2">{error}</p>
            : <p className="text-[var(--tx5)] text-xs italic mb-2">No summary yet.</p>}
          {canWrite
            ? (error
                ? errorActions
                : <button onClick={onGenerate} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 border border-violet-500/30 text-violet-300 text-[11px] rounded-lg hover:bg-violet-500/20 transition-colors"><Sparkles size={11} /> Generate with AI</button>)
            : <span className="text-[var(--tx6)] text-[10px]">Ask an editor to generate one.</span>}
        </div>
      )}
    </div>
  );
}
