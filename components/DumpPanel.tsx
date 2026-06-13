"use client";

import { useState } from "react";
import { Database, ChevronDown, DownloadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCollection } from "@/hooks/useCollection";
import { type DumpRecord } from "@/lib/core/dump";

// Collapsible "View Dump Data" section shown at the bottom of a lead / contact /
// account detail view. Reveals the hidden extra info linked to the record, or a
// "No dump found" state with a (currently inert) Fetch Dump button.
export default function DumpPanel({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { items: dumps } = useCollection<DumpRecord>("dump");
  const [open, setOpen] = useState(false);

  const dump = dumps.find(d => d.entity_type === entityType && d.entity_id === entityId);
  const entries = dump ? Object.entries(dump.data ?? {}) : [];

  return (
    <div className="border-t border-[var(--border)] pt-4">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors">
        <span className="flex items-center gap-1.5 text-xs font-medium"><Database size={13} /> View Dump Data</span>
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-3">
          {entries.length > 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-3 space-y-1">
              {entries.map(([k, v]) => (
                <div key={k} className="flex gap-2 text-xs">
                  <span className="text-[var(--tx5)] min-w-[110px] shrink-0 capitalize">{k.replace(/[_-]+/g, " ")}</span>
                  <span className="text-[var(--tx3)] break-words">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface2)] p-4 text-center">
              <p className="text-[var(--tx5)] text-xs mb-2.5">No dump found for this record.</p>
              <button
                onClick={() => { /* fetch dump — not wired yet */ }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--tx3)] text-[11px] rounded-lg hover:border-[var(--a-border)] transition-colors"
              >
                <DownloadCloud size={12} /> Fetch Dump
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
