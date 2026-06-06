"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Bell, Search, Moon, Sun, Telescope, CalendarDays, Clock, RotateCcw, Database } from "lucide-react";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { useAppData } from "@/contexts/AppDataContext";
import { useNow } from "@/contexts/NowContext";
import { resetKeepLeads } from "@/lib/api";
import { cn } from "@/lib/utils";
import CalendarPanel from "@/components/CalendarPanel";
import NotificationsPanel from "@/components/NotificationsPanel";

const titles: Record<string, string> = {
  "/":              "Dashboard",
  "/leads":         "Leads",
  "/contacts":      "Contacts",
  "/accounts":      "Accounts",
  "/deals":         "Deals Pipeline",
  "/activities":    "Activities",
  "/follow-ups":    "Follow-ups",
  "/business-card": "Business Card Scanner",
  "/products":      "Products & Catalog",
  "/settings":      "Settings",
};

const themes: { id: Theme; label: string; icon: React.ReactNode }[] = [
  { id: "dark1", label: "Dark",  icon: <Moon size={13} /> },
  { id: "dark2", label: "Abyss", icon: <Telescope size={13} /> },
  { id: "light", label: "Day",   icon: <Sun size={13} /> },
];

export default function TopBar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { followUps, calendarEvents } = useAppData();
  const { now, today, setNow, isOverridden, reset } = useNow();
  const base = "/" + pathname.split("/")[1];
  const title = titles[base] ?? "UFT CRM";

  const [calendarOpen, setCalendarOpen]   = useState(false);
  const [notifOpen,    setNotifOpen]      = useState(false);
  const [dateOpen,     setDateOpen]       = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleResetData() {
    if (!window.confirm("Reset all data and keep only the leads?\n\nThis clears contacts, accounts, deals, follow-ups, calendar events and activities.")) return;
    await resetKeepLeads();
    window.location.reload();
  }

  const notifCount =
    followUps.filter(f => !f.done && f.follow_up_date && f.follow_up_date <= today).length +
    calendarEvents.filter(e => e.date === today && !e.done).length;

  return (
    <header className="h-14 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between px-6 sticky top-0 z-30 transition-colors duration-250">
      <div className="flex items-center gap-3">
        <h1 className="text-[var(--tx1)] font-semibold text-base">{title}</h1>

        <div className="flex items-center gap-1.5">
          {/* Date & time override — testing only */}
          <div className="relative" ref={dateRef}>
            <button
              onClick={() => { setDateOpen(o => !o); setCalendarOpen(false); setNotifOpen(false); }}
              title="Set current date & time (for testing)"
              className={cn(
                "relative w-8 h-8 rounded-lg border flex items-center justify-center transition-colors",
                isOverridden || dateOpen
                  ? "bg-[var(--a-muted)] border-[var(--a-border)] text-[var(--a-text)]"
                  : "bg-[var(--surface2)] border-[var(--border)] hover:border-[var(--a-border)] text-[var(--tx4)]"
              )}
            >
              <Clock size={14} />
              {isOverridden && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--a)] border border-[var(--surface)]" />}
            </button>
            {dateOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl z-50 p-3">
                <p className="text-[10px] font-semibold text-[var(--tx5)] uppercase tracking-wide mb-2">Current date &amp; time (testing)</p>
                <input
                  type="datetime-local"
                  value={now}
                  onChange={e => setNow(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-xs focus:outline-none focus:border-[var(--a-border)] [color-scheme:dark]"
                />
                {isOverridden && (
                  <button
                    onClick={reset}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-[var(--tx4)] bg-[var(--surface2)] border border-[var(--border)] rounded-lg hover:border-[var(--a-border)] transition-colors"
                  >
                    <RotateCcw size={11} /> Reset to real time
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Reset data — keep only leads */}
          <button
            onClick={handleResetData}
            title="Reset all data (keep only leads)"
            className="w-8 h-8 rounded-lg border bg-[var(--surface2)] border-[var(--border)] text-[var(--tx4)] hover:border-rose-500/50 hover:text-rose-400 flex items-center justify-center transition-colors"
          >
            <Database size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme switcher */}
        <div className="flex items-center gap-0.5 p-1 bg-[var(--surface2)] border border-[var(--border)] rounded-lg">
          {themes.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              title={label}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                theme === id
                  ? "bg-[var(--a)] text-white shadow-sm"
                  : "text-[var(--tx5)] hover:text-[var(--tx2)] hover:bg-[var(--surface3)]"
              )}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tx5)]" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx3)] placeholder-[var(--tx6)] text-sm rounded-lg pl-8 pr-4 py-1.5 w-48 focus:outline-none focus:border-[var(--a-border)] focus:ring-1 focus:ring-[var(--a-ring)] transition-colors"
          />
        </div>

        {/* Calendar */}
        <div className="relative">
          <button
            onClick={() => { setCalendarOpen(o => !o); setNotifOpen(false); }}
            className={cn(
              "relative w-8 h-8 rounded-lg bg-[var(--surface2)] border flex items-center justify-center transition-colors",
              calendarOpen
                ? "border-[var(--a-border)] text-[var(--a-text)]"
                : "border-[var(--border)] hover:border-[var(--a-border)] text-[var(--tx4)]"
            )}
          >
            <CalendarDays size={14} />
          </button>
          {calendarOpen && <CalendarPanel onClose={() => setCalendarOpen(false)} />}
        </div>

        {/* Notifications bell */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(o => !o); setCalendarOpen(false); }}
            className={cn(
              "relative w-8 h-8 rounded-lg bg-[var(--surface2)] border flex items-center justify-center transition-colors",
              notifOpen
                ? "border-[var(--a-border)] text-[var(--a-text)]"
                : "border-[var(--border)] hover:border-[var(--a-border)] text-[var(--tx4)]"
            )}
          >
            <Bell size={14} />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-[var(--a)] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </button>
          {notifOpen && <NotificationsPanel onClose={() => setNotifOpen(false)} />}
        </div>
      </div>
    </header>
  );
}
