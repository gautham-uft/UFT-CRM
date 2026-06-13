"use client";

import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, CalendarRange, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ColFilter = { q?: string; from?: string; to?: string };
export type ColType = "text" | "select" | "date";

// A table column header that turns into a search box / dropdown / date-range
// popover on click. The parent owns the filter state and applies it via
// rowMatches(). Use type "none" (or just plain text) for non-filterable columns.
export function ColumnHeader({
  label,
  type = "text",
  value,
  onChange,
  options,
}: {
  label: string;
  type?: ColType;
  value: ColFilter;
  onChange: (v: ColFilter) => void;
  options?: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = !!(value.q || value.from || value.to);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const Icon = type === "select" ? ChevronDown : type === "date" ? CalendarRange : Search;
  const inputCls = "w-full px-2 py-1.5 bg-[var(--surface2)] border border-[var(--border)] rounded-md text-[var(--tx2)] text-xs focus:outline-none focus:border-[var(--a-border)]";

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn("flex items-center gap-1 text-xs font-medium transition-colors", active ? "text-[var(--a-text)]" : "text-[var(--tx5)] hover:text-[var(--tx3)]")}
      >
        {label}
        <Icon size={11} className={active ? "text-[var(--a-text)]" : "opacity-60"} />
        {active && <span className="w-1.5 h-1.5 rounded-full bg-[var(--a)]" />}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-40 w-52 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-2xl p-2.5">
          {type === "text" && (
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--tx5)]" />
              <input autoFocus value={value.q ?? ""} onChange={e => onChange({ q: e.target.value })} placeholder={`Filter ${label}…`} className={cn(inputCls, "pl-7")} />
            </div>
          )}
          {type === "select" && (
            <select autoFocus value={value.q ?? ""} onChange={e => onChange({ q: e.target.value })} className={inputCls}>
              <option value="">All</option>
              {(options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          {type === "date" && (
            <div className="space-y-2">
              <label className="block"><span className="text-[10px] text-[var(--tx5)]">From</span><input type="date" value={value.from ?? ""} onChange={e => onChange({ ...value, from: e.target.value })} className={cn(inputCls, "[color-scheme:dark]")} /></label>
              <label className="block"><span className="text-[10px] text-[var(--tx5)]">To</span><input type="date" value={value.to ?? ""} onChange={e => onChange({ ...value, to: e.target.value })} className={cn(inputCls, "[color-scheme:dark]")} /></label>
            </div>
          )}
          {active && (
            <button onClick={() => { onChange({}); }} className="mt-2 flex items-center gap-1 text-[10px] text-[var(--tx5)] hover:text-rose-400 transition-colors"><X size={10} /> Clear</button>
          )}
        </div>
      )}
    </div>
  );
}

// Pure predicate: does a row pass every active column filter?
export function rowMatches<T>(row: T, filters: Record<string, ColFilter>, getters: Record<string, (r: T) => string>): boolean {
  for (const [key, f] of Object.entries(filters)) {
    const get = getters[key];
    if (!get) continue;
    const val = (get(row) || "").toLowerCase();
    if (f.q && !val.includes(f.q.toLowerCase())) return false;
    if (f.from && (!val || val < f.from)) return false; // ISO date strings compare lexicographically
    if (f.to && (!val || val > f.to)) return false;
  }
  return true;
}
