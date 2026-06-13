"use client";

import { List, CheckCircle, AlertTriangle, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

// Records are colour-coded by data quality:
//   white  → complete & trusted
//   yellow → missing details (incomplete fields)
//   red    → flagged as incorrect data
export type RecordColor = "white" | "yellow" | "red";
export type ColorFilterValue = "all" | RecordColor;

const NEUTRAL_ACTIVE = "bg-[var(--a)] text-white";
const NEUTRAL_IDLE = "text-[var(--tx4)] hover:text-[var(--tx2)] hover:bg-[var(--surface2)]";

const OPTS: { key: ColorFilterValue; label: string; Icon: typeof List; activeCls: string; idleCls: string }[] = [
  { key: "all",    label: "All",       Icon: List,          activeCls: NEUTRAL_ACTIVE,              idleCls: NEUTRAL_IDLE },
  { key: "white",  label: "Complete",  Icon: CheckCircle,   activeCls: "bg-emerald-500 text-white", idleCls: "text-emerald-400 hover:bg-emerald-500/10" },
  { key: "yellow", label: "Missing",   Icon: AlertTriangle, activeCls: "bg-amber-500 text-white",   idleCls: "text-amber-400 hover:bg-amber-500/10" },
  { key: "red",    label: "Incorrect", Icon: Flag,          activeCls: "bg-rose-500 text-white",    idleCls: "text-rose-400 hover:bg-rose-500/10" },
];

export default function ColorFilter({
  value,
  onChange,
}: {
  value: ColorFilterValue;
  onChange: (v: ColorFilterValue) => void;
}) {
  // Icon + name-below filters, matching the Leads page design.
  return (
    <div className="flex items-stretch gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1 w-fit">
      {OPTS.map(o => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            aria-label={o.label}
            className={cn("flex flex-col items-center gap-0.5 px-2 pt-1.5 pb-1 rounded-md min-w-[56px] transition-colors", active ? o.activeCls : o.idleCls)}
          >
            <o.Icon size={16} />
            <span className="text-[10px] font-medium leading-none">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
