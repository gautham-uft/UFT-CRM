"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string };

// A <select>-like dropdown with a type-to-search filter.
export default function SearchableSelect({
  value, onChange, options, placeholder = "Select…", disabled = false, className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(""); }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const selected = options.find(o => o.value === value);
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;

  const base = "w-full flex items-center gap-2 px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-xs transition-colors";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(o => !o); setQuery(""); } }}
        className={cn(base, "focus:outline-none hover:border-[var(--a-border)] disabled:opacity-50", open && "border-[var(--a-border)]", className)}
      >
        <span className={cn("flex-1 text-left truncate", selected ? "text-[var(--tx2)]" : "text-[var(--tx6)]")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={13} className="text-[var(--tx5)] shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-2.5 py-2 border-b border-[var(--border)]">
            <Search size={13} className="text-[var(--tx5)] shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type to search…"
              className="flex-1 bg-transparent text-[var(--tx2)] text-xs placeholder:text-[var(--tx6)] focus:outline-none"
            />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-center text-[var(--tx6)] text-xs">No matches</p>
            ) : (
              filtered.map(o => (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                    o.value === value ? "bg-[var(--a-muted)] text-[var(--a-text)]" : "text-[var(--tx3)] hover:bg-[var(--surface2)]"
                  )}
                >
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.value === value && <Check size={13} className="shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
