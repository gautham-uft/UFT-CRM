"use client";

import { cn } from "@/lib/utils";

// Records are colour-coded by data quality:
//   white  → complete & trusted
//   yellow → missing details (incomplete fields)
//   red    → flagged as incorrect data
export type RecordColor = "white" | "yellow" | "red";
export type ColorFilterValue = "all" | RecordColor;

const OPTS: { key: ColorFilterValue; swatch: string; label: string; popup: string; text?: string }[] = [
  { key: "all",    swatch: "bg-white", label: "All",             popup: "border-[var(--border)] text-[var(--tx3)]", text: "All" },
  { key: "white",  swatch: "bg-white",     label: "Complete",        popup: "border-[var(--border)] text-[var(--tx3)]" },
  { key: "yellow", swatch: "bg-amber-400", label: "Missing details", popup: "border-amber-500/40 text-amber-400" },
  { key: "red",    swatch: "bg-rose-500",  label: "Incorrect data",  popup: "border-rose-500/40 text-rose-400" },
];

export default function ColorFilter({
  value,
  onChange,
}: {
  value: ColorFilterValue;
  onChange: (v: ColorFilterValue) => void;
}) {
  return (
    // Fixed-spacing rectangle of colour squares. The hover label is an absolutely
    // positioned popup that drops downward, so it never shifts the squares.
    <div className="flex items-center gap-2 p-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
      {OPTS.map(o => {
        const active = value === o.key;
        return (
          <div key={o.key} className="relative group">
            <button
              onClick={() => onChange(o.key)}
              aria-label={o.label}
              className={cn(
                "w-6 h-6 rounded-md border transition-all flex items-center justify-center",
                o.swatch,
                active
                  ? "ring-2 ring-[var(--a)] ring-offset-2 ring-offset-[var(--surface)] border-transparent"
                  : "border-black/20 hover:scale-110",
              )}
            >
              {o.text && <span className="text-[8px] font-bold text-black/70 leading-none">{o.text}</span>}
            </button>
            {/* Downward popup label */}
            <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 z-30 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150">
              <div className={cn("whitespace-nowrap rounded-md border bg-[var(--surface)] px-2 py-1 text-[10px] font-medium shadow-lg", o.popup)}>
                {o.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
