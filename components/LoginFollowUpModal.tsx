"use client";

import { useState, useEffect } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useNow } from "@/contexts/NowContext";
import { Bell, X, CheckCircle, AlertCircle, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const RESPECTED_ROLES = ["Director", "Business Manager", "Account Manager"];
const AUTO_DISMISS_MS = 9000;

// "Welcome back" — a toast that slides in at the top-right (near the notification
// bell) once per user per day, summarising their pending follow-ups.
export default function LoginFollowUpModal() {
  const { currentUser } = useCurrentUser();
  const { followUps, loading } = useAppData();
  const { today } = useNow();
  const [isOpen, setIsOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [shown, setShown] = useState(false);

  // Show once per login (per user, per day) for respected roles. State updates
  // are deferred a tick so they don't run synchronously inside the effect body.
  useEffect(() => {
    if (shown || loading || !RESPECTED_ROLES.includes(currentUser.role)) return;
    const sessionKey = `login-toast-shown-${currentUser.id}-${new Date().toDateString()}`;
    const already = !!sessionStorage.getItem(sessionKey);
    if (!already) sessionStorage.setItem(sessionKey, "true");
    const id = setTimeout(() => {
      setShown(true);
      if (!already) setIsOpen(true);
    }, 0);
    return () => clearTimeout(id);
  }, [currentUser.id, currentUser.role, loading, shown]);

  // Slide-in on open + auto-dismiss.
  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => setEntered(true));
    const timer = setTimeout(() => setIsOpen(false), AUTO_DISMISS_MS);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [isOpen]);

  const pending = followUps.filter(
    (f) => !f.done && f.assignee === `${currentUser.first_name} ${currentUser.last_name}`.trim(),
  );
  const overdue = pending.filter((f) => f.follow_up_date && f.follow_up_date < today).length;
  const dueToday = pending.filter((f) => f.follow_up_date === today).length;

  if (!isOpen) return null;

  const allCaughtUp = pending.length === 0;

  return (
    <div
      className={cn(
        "fixed right-6 top-[4.5rem] z-40 w-80 transition-all duration-300 ease-out",
        entered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-3",
      )}
    >
      <div className="bg-[var(--surface)] border border-[var(--a-border)] rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", allCaughtUp ? "bg-emerald-500/15" : "bg-blue-500/15")}>
            {allCaughtUp ? <CheckCircle size={18} className="text-emerald-400" /> : <Bell size={18} className="text-blue-400" />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[var(--tx1)] text-sm font-semibold">Welcome back, {currentUser.first_name}!</p>
            {allCaughtUp ? (
              <p className="text-[var(--tx5)] text-xs mt-0.5">You&apos;re all caught up — no pending follow-ups. 🎉</p>
            ) : (
              <>
                <p className="text-[var(--tx4)] text-xs mt-0.5">
                  {pending.length} pending follow-up{pending.length !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  {overdue > 0 && <span className="flex items-center gap-1 text-[11px] text-rose-400"><AlertCircle size={12} /> {overdue} overdue</span>}
                  {dueToday > 0 && <span className="flex items-center gap-1 text-[11px] text-amber-400"><Clock size={12} /> {dueToday} due today</span>}
                </div>
                <Link
                  href="/follow-ups"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium mt-2.5"
                >
                  View follow-ups <ChevronRight size={13} />
                </Link>
              </>
            )}
          </div>
          <button onClick={() => setIsOpen(false)} className="text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors shrink-0"><X size={15} /></button>
        </div>
      </div>
    </div>
  );
}
