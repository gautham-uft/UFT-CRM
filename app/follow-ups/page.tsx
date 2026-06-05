"use client";

import { useAppData, type FollowUpItem } from "@/contexts/AppDataContext";
import { cn } from "@/lib/utils";
import {
  Phone, Clock, XCircle, CheckCircle, Calendar, Check,
  Zap, TrendingUp, CalendarClock,
} from "lucide-react";

// ── Category config ───────────────────────────────────────────────

type CatCfg = { label: string; color: string; bg: string; Icon: typeof Phone };

const CAT: Record<string, CatCfg> = {
  callback:       { label: "Callback",       color: "text-sky-400",     bg: "bg-sky-500/15 border-sky-500/30",     Icon: Phone       },
  postponed:      { label: "Postponed",      color: "text-amber-400",   bg: "bg-amber-500/15 border-amber-500/30", Icon: Clock       },
  not_interested: { label: "Not Interested", color: "text-rose-400",    bg: "bg-rose-500/15 border-rose-500/30",   Icon: XCircle     },
  progressing:    { label: "Moving Forward", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", Icon: CheckCircle },
  call:           { label: "Call",           color: "text-sky-400",     bg: "bg-sky-500/15 border-sky-500/30",     Icon: Phone       },
  task:           { label: "Task",           color: "text-violet-400",  bg: "bg-violet-500/15 border-violet-500/30", Icon: CheckCircle },
  deadline:       { label: "Deadline",       color: "text-red-400",     bg: "bg-red-500/15 border-red-500/30",     Icon: Clock       },
};

type SrcCfg = { label: string; color: string; Icon: typeof Phone };
const SRC: Record<string, SrcCfg> = {
  lead:     { label: "Lead",     color: "text-violet-400",  Icon: Zap         },
  deal:     { label: "Deal",     color: "text-emerald-400", Icon: TrendingUp  },
  calendar: { label: "Calendar", color: "text-sky-400",     Icon: CalendarClock },
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(base: string, n: number) {
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── FollowUpCard ──────────────────────────────────────────────────

function FollowUpCard({ item, onToggle }: { item: FollowUpItem; onToggle: () => void }) {
  const cat = CAT[item.category] ?? { label: item.category, color: "text-[var(--tx4)]", bg: "bg-[var(--surface2)] border-[var(--border)]", Icon: Calendar };
  const src = SRC[item.source] ?? SRC.calendar;

  return (
    <div className={cn(
      "bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--a-border)] transition-all",
      item.done && "opacity-40"
    )}>
      <div className="flex items-start gap-3">
        {/* Done toggle */}
        <button
          onClick={onToggle}
          className={cn(
            "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
            item.done ? "bg-[var(--a)] border-[var(--a)]" : "border-[var(--tx5)] hover:border-[var(--a)]"
          )}
        >
          {item.done && <Check size={11} className="text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5 flex-wrap">
            <p className={cn("text-[var(--tx2)] text-sm font-medium", item.done && "line-through text-[var(--tx5)]")}>
              {item.entity_name}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn("flex items-center gap-1 text-[10px] font-medium", src.color)}>
                <src.Icon size={10} /> {src.label}
              </span>
              <span className={cn("px-2 py-0.5 rounded-full text-[10px] border", cat.bg, cat.color)}>
                {cat.label}
              </span>
            </div>
          </div>

          {item.note && (
            <p className="text-[var(--tx4)] text-xs leading-relaxed mb-2">{item.note}</p>
          )}

          {item.follow_up_date && (
            <span className="flex items-center gap-1 text-[10px] text-[var(--tx5)]">
              <Calendar size={9} /> {item.follow_up_date}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function FollowUpsPage() {
  const { followUps, toggleFollowUp } = useAppData();

  const today   = todayStr();
  const weekEnd = addDays(today, 7);

  const pending  = followUps.filter(f => !f.done);
  const overdue  = pending.filter(f => f.follow_up_date && f.follow_up_date < today);
  const dueToday = pending.filter(f => f.follow_up_date === today);
  const thisWeek = pending.filter(f => f.follow_up_date && f.follow_up_date > today && f.follow_up_date <= weekEnd);
  const upcoming = pending.filter(f => !f.follow_up_date || f.follow_up_date > weekEnd);
  const done     = followUps.filter(f => f.done);

  const sections = [
    { key: "overdue",  label: "Overdue",   items: overdue,  dotCls: "bg-rose-400",          headCls: "text-rose-400"          },
    { key: "today",    label: "Today",     items: dueToday, dotCls: "bg-[var(--a)]",         headCls: "text-[var(--a-text)]"   },
    { key: "week",     label: "This Week", items: thisWeek, dotCls: "bg-amber-400",          headCls: "text-amber-400"         },
    { key: "upcoming", label: "Upcoming",  items: upcoming, dotCls: "bg-[var(--tx5)]",       headCls: "text-[var(--tx4)]"      },
    { key: "done",     label: "Completed", items: done,     dotCls: "bg-[var(--tx6)]",       headCls: "text-[var(--tx6)]"      },
  ].filter(s => s.items.length > 0);

  return (
    <div className="space-y-6">

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending",   value: pending.length,  color: "text-[var(--tx1)]"     },
          { label: "Due Today", value: dueToday.length, color: "text-[var(--a-text)]"  },
          { label: "Overdue",   value: overdue.length,  color: "text-rose-400"          },
          { label: "Completed", value: done.length,     color: "text-[var(--tx5)]"      },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
            <p className="text-[var(--tx5)] text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Sections */}
      {sections.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-16 text-center">
          <CheckCircle className="text-[var(--a-text)] mx-auto mb-3" size={32} />
          <p className="text-[var(--tx2)] font-medium">All clear!</p>
          <p className="text-[var(--tx6)] text-xs mt-1">No pending follow-ups.</p>
        </div>
      ) : (
        sections.map(section => (
          <div key={section.key}>
            <div className="flex items-center gap-2 mb-3">
              <div className={cn("w-2 h-2 rounded-full", section.dotCls)} />
              <h2 className={cn("text-sm font-semibold", section.headCls)}>{section.label}</h2>
              <span className="text-[var(--tx6)] text-xs">{section.items.length}</span>
            </div>
            <div className="space-y-2.5">
              {section.items.map(item => (
                <FollowUpCard key={item.id} item={item} onToggle={() => toggleFollowUp(item.id)} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
