"use client";

import { useEffect, useRef } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import { Phone, Clock, Users, CheckSquare, AlertCircle, Zap, TrendingUp, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const EVENT_CFG = {
  meeting:  { Icon: Users,        color: "text-blue-400",   bg: "bg-blue-400/10",   label: "Meeting"  },
  task:     { Icon: CheckSquare,  color: "text-green-400",  bg: "bg-green-400/10",  label: "Task"     },
  call:     { Icon: Phone,        color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Call"     },
  deadline: { Icon: AlertCircle,  color: "text-red-400",    bg: "bg-red-400/10",    label: "Deadline" },
} as const;

const SRC_CFG = {
  lead:     { Icon: Zap,          color: "text-violet-400",  bg: "bg-violet-500/10"  },
  deal:     { Icon: TrendingUp,   color: "text-emerald-400", bg: "bg-emerald-500/10" },
  calendar: { Icon: CalendarClock, color: "text-sky-400",   bg: "bg-sky-500/10"     },
} as const;

export default function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { calendarEvents, followUps } = useAppData();
  const today = todayStr();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const dueFollowUps = followUps.filter(f => !f.done && f.follow_up_date && f.follow_up_date <= today);
  const todayEvents  = calendarEvents
    .filter(e => e.date === today)
    .sort((a, b) => (a.time ?? "ZZ").localeCompare(b.time ?? "ZZ"));

  const total = dueFollowUps.length + todayEvents.length;

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-2 w-80 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <span className="text-sm font-semibold text-[var(--tx1)]">Notifications</span>
        <span className="text-[10px] text-[var(--tx5)]">{total} item{total !== 1 ? "s" : ""} today</span>
      </div>

      <div className="max-h-[22rem] overflow-y-auto">
        {/* Follow-ups due / overdue */}
        {dueFollowUps.length > 0 && (
          <div>
            <div className="px-4 py-1.5 bg-[var(--surface2)] border-b border-[var(--border)]">
              <span className="text-[10px] font-semibold text-[var(--tx5)] uppercase tracking-wide">Follow-ups Due</span>
            </div>
            {dueFollowUps.map(f => {
              const src = SRC_CFG[f.source] ?? SRC_CFG.calendar;
              const isOverdue = f.follow_up_date! < today;
              return (
                <div key={f.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--surface2)] transition-colors border-b border-[var(--border)]">
                  <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5", src.bg)}>
                    <src.Icon size={11} className={src.color} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[var(--tx2)] text-xs font-medium truncate">{f.entity_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {f.follow_up_date && (
                        <span className={cn("text-[10px]", isOverdue ? "text-rose-400 font-medium" : "text-[var(--tx5)]")}>
                          {isOverdue ? "Overdue · " : ""}{f.follow_up_date}
                        </span>
                      )}
                      {f.note && <span className="text-[var(--tx6)] text-[10px] truncate">· {f.note}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Today's calendar events */}
        {todayEvents.length > 0 && (
          <div>
            <div className="px-4 py-1.5 bg-[var(--surface2)] border-b border-[var(--border)]">
              <span className="text-[10px] font-semibold text-[var(--tx5)] uppercase tracking-wide">Today's Schedule</span>
            </div>
            {todayEvents.map(e => {
              const cfg = EVENT_CFG[e.type];
              return (
                <div key={e.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--surface2)] transition-colors border-b border-[var(--border)]">
                  <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
                    <cfg.Icon size={11} className={cfg.color} />
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-[var(--tx2)] text-xs font-medium truncate", e.done && "line-through opacity-50")}>
                      {e.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {e.time && <span className="text-[var(--tx5)] text-[10px]">{e.time}</span>}
                      {e.assignee && <span className="text-[var(--tx6)] text-[10px]">· {e.assignee}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {total === 0 && (
          <p className="px-4 py-8 text-center text-[var(--tx5)] text-xs">No notifications for today</p>
        )}
      </div>

      {/* Footer */}
      {dueFollowUps.length > 0 && (
        <div className="px-4 py-2.5 border-t border-[var(--border)]">
          <Link href="/follow-ups" onClick={onClose} className="text-xs text-[var(--a-text)] hover:text-[var(--a)] transition-colors">
            View all follow-ups →
          </Link>
        </div>
      )}
    </div>
  );
}
