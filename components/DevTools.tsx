"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cog, Clock, UserCog, SlidersHorizontal,
  ChevronLeft, ChevronRight, RotateCcw, Check, X,
  Users, Shield, Database, CloudDownload, CloudUpload, AlertTriangle,
} from "lucide-react";
import { useNow } from "@/contexts/NowContext";
import { useCurrentUser, DEFAULT_USER, type CurrentUser } from "@/contexts/CurrentUserContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useCollection } from "@/hooks/useCollection";
import { persistentAvailable, syncDatabases, type SyncDirection } from "@/lib/api";
import { cn } from "@/lib/utils";

type View = "menu" | "time" | "user" | "settings" | "db";

// "2/3 gears within a square" — two meshing cogs inside a rounded square.
function GearSquare() {
  return (
    <span className="relative inline-flex w-4 h-4">
      <Cog size={13} className="absolute -top-0.5 -left-0.5" strokeWidth={2} />
      <Cog size={9} className="absolute bottom-0 right-0" strokeWidth={2} />
    </span>
  );
}

function fmtNow(now: string) {
  if (!now) return "—";
  const d = new Date(now);
  if (Number.isNaN(d.getTime())) return now;
  return d.toLocaleString(undefined, {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const rowCls =
  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors bg-[var(--surface2)] border border-[var(--border)] hover:border-[var(--a-border)]";
const iconBoxCls = "w-7 h-7 rounded-lg bg-[var(--a-muted)] flex items-center justify-center shrink-0";
const applyBtn =
  "flex-1 flex items-center justify-center gap-1.5 py-2 bg-[var(--a)] text-white text-xs rounded-lg hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
const cancelBtn =
  "flex-1 flex items-center justify-center gap-1.5 py-2 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors";

export default function DevTools() {
  const router = useRouter();
  const { now, setNow, isOverridden, reset } = useNow();
  const { currentUser, setCurrentUser } = useCurrentUser();
  const { canRead } = usePermissions();
  const { items: users } = useCollection<CurrentUser & { is_active?: boolean }>("users");

  const canSeeUsers = canRead("User Management");
  const canSeeRoles = canRead("Roles & Permissions");

  // Status indicator beside the bar: blue = time overridden, green = normal.
  const indicator = isOverridden
    ? { color: "bg-blue-500",    glow: "shadow-[0_0_6px_1px_rgba(59,130,246,0.8)]", label: "Date & time overridden", pulse: false }
    : { color: "bg-emerald-500", glow: "shadow-[0_0_6px_1px_rgba(16,185,129,0.8)]", label: "Normal", pulse: false };

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const ref = useRef<HTMLDivElement>(null);

  // Drafts (apply/confirm pattern — nothing changes until you Apply).
  const [timeDraft, setTimeDraft] = useState("");
  const [userDraft, setUserDraft] = useState<string>(currentUser.id);

  // Database reset/sync state.
  const [hasPersistent, setHasPersistent] = useState(false);
  const [pendingDir, setPendingDir] = useState<SyncDirection | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    let active = true;
    persistentAvailable().then((ok) => active && setHasPersistent(ok));
    return () => { active = false; };
  }, []);

  async function runSync(dir: SyncDirection) {
    setSyncing(true);
    setSyncMsg("");
    try {
      await syncDatabases(dir);
      // Reset (persistent → working) changes the live data → reload so every
      // page re-fetches. Save (working → persistent) leaves the app unchanged.
      if (dir === "persistent-to-working") { window.location.reload(); return; }
      setPendingDir(null);
      setSyncMsg("Working database saved to persistent.");
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  function close() { setOpen(false); }

  // When (re)opening a sub-view, seed its draft from the live value.
  function go(v: View) {
    if (v === "time") setTimeDraft(now);
    if (v === "user") setUserDraft(currentUser.id);
    if (v === "db") { setPendingDir(null); setSyncMsg(""); }
    setView(v);
  }

  function toggle() {
    setOpen(o => {
      const next = !o;
      if (next) setView("menu");
      return next;
    });
  }

  // The switchable identities: the built-in default plus any users created in
  // Settings. De-duplicated by id.
  const userOptions: CurrentUser[] = [
    DEFAULT_USER,
    ...users
      .filter(u => u.id !== DEFAULT_USER.id)
      .map(u => ({ id: u.id, first_name: u.first_name, last_name: u.last_name, email: u.email, role: u.role })),
  ];

  function applyTime() {
    if (!timeDraft) return;
    setNow(timeDraft);
    setView("menu");
  }

  function applyUser() {
    const picked = userOptions.find(u => u.id === userDraft);
    if (picked) setCurrentUser(picked);
    setView("menu");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        title={indicator.label}
        className={cn(
          "flex items-center justify-center gap-1.5 h-8 w-32 shrink-0 rounded-lg border transition-colors",
          open
            ? "bg-[var(--a-muted)] border-[var(--a-border)] text-[var(--a-text)]"
            : "bg-[var(--surface2)] border-[var(--border)] hover:border-[var(--a-border)] text-[var(--tx4)]"
        )}
      >
        <GearSquare />
        <span className="text-xs font-medium">Dev Tools</span>
        <span className={cn("ml-1.5 w-2 h-2 rounded-full shrink-0 border border-white/50", indicator.color, indicator.glow, indicator.pulse && "animate-pulse")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)]">
            {view !== "menu" && (
              <button onClick={() => setView("menu")} className="text-[var(--tx5)] hover:text-[var(--tx2)] transition-colors">
                <ChevronLeft size={15} />
              </button>
            )}
            <span className="text-xs font-semibold text-[var(--tx1)] flex items-center gap-1.5">
              {view === "menu" && <><GearSquare /> Dev Tools</>}
              {view === "time" && "Current Date & Time"}
              {view === "user" && "Switch User"}
              {view === "settings" && "Settings"}
              {view === "db" && "Databases"}
            </span>
          </div>

          <div className="p-2.5">
            {/* ── Menu ── */}
            {view === "menu" && (
              <div className="space-y-1.5">
                <button onClick={() => go("time")} title={fmtNow(now)} className={rowCls}>
                  <span className={iconBoxCls}><Clock size={14} className="text-[var(--a-text)]" /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-[var(--tx2)]">Current Time</span>
                    <span className="block text-[10px] text-[var(--tx5)] truncate">{fmtNow(now)}</span>
                  </span>
                  {isOverridden && <span className="text-[9px] text-[var(--a-text)] font-semibold uppercase tracking-wide">Overridden</span>}
                  <ChevronRight size={14} className="text-[var(--tx5)] shrink-0" />
                </button>

                <button onClick={() => go("user")} className={rowCls}>
                  <span className={iconBoxCls}><UserCog size={14} className="text-[var(--a-text)]" /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-[var(--tx2)]">Switch User</span>
                    <span className="block text-[10px] text-[var(--tx5)] truncate">{currentUser.first_name} {currentUser.last_name} · {currentUser.role}</span>
                  </span>
                  <ChevronRight size={14} className="text-[var(--tx5)] shrink-0" />
                </button>

                {hasPersistent && (
                  <button onClick={() => go("db")} className={rowCls}>
                    <span className={iconBoxCls}><Database size={14} className="text-[var(--a-text)]" /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-medium text-[var(--tx2)]">Databases</span>
                      <span className="block text-[10px] text-[var(--tx5)] truncate">Reset & sync working ↔ persistent</span>
                    </span>
                    <ChevronRight size={14} className="text-[var(--tx5)] shrink-0" />
                  </button>
                )}

                {(canSeeUsers || canSeeRoles) && (
                  <button onClick={() => go("settings")} className={rowCls}>
                    <span className={iconBoxCls}><SlidersHorizontal size={14} className="text-[var(--a-text)]" /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-medium text-[var(--tx2)]">Settings</span>
                      <span className="block text-[10px] text-[var(--tx5)] truncate">Users & roles</span>
                    </span>
                    <ChevronRight size={14} className="text-[var(--tx5)] shrink-0" />
                  </button>
                )}
              </div>
            )}

            {/* ── Current time ── */}
            {view === "time" && (
              <div className="space-y-3">
                <p className="text-[10px] text-[var(--tx5)] leading-relaxed">
                  Move &ldquo;now&rdquo; around to see how banners, the calendar, follow-ups and notifications react.
                </p>
                <input
                  type="datetime-local"
                  value={timeDraft}
                  onChange={e => setTimeDraft(e.target.value)}
                  className="w-full px-2.5 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-xs focus:outline-none focus:border-[var(--a-border)]"
                />
                {isOverridden && (
                  <button
                    onClick={() => { reset(); setView("menu"); }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-[var(--tx4)] bg-[var(--surface2)] border border-[var(--border)] rounded-lg hover:border-[var(--a-border)] transition-colors"
                  >
                    <RotateCcw size={11} /> Reset to real time
                  </button>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setView("menu")} className={cancelBtn}><X size={13} /> Cancel</button>
                  <button onClick={applyTime} disabled={!timeDraft} className={applyBtn}><Check size={13} /> Apply</button>
                </div>
              </div>
            )}

            {/* ── Switch user ── */}
            {view === "user" && (
              <div className="space-y-3">
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                  {userOptions.map(u => {
                    const active = userDraft === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => setUserDraft(u.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-colors",
                          active ? "bg-[var(--a-muted)] border-[var(--a-border)]" : "bg-[var(--surface2)] border-[var(--border)] hover:border-[var(--a-border)]"
                        )}
                      >
                        <span className="w-7 h-7 rounded-full bg-[var(--a-muted)] flex items-center justify-center text-[var(--a-text)] text-[10px] font-medium shrink-0">
                          {u.first_name[0]}{u.last_name[0]}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-medium text-[var(--tx2)] truncate">{u.first_name} {u.last_name}</span>
                          <span className="block text-[10px] text-[var(--tx5)] truncate">{u.role}</span>
                        </span>
                        {active && <Check size={14} className="text-[var(--a-text)] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setView("menu")} className={cancelBtn}><X size={13} /> Cancel</button>
                  <button onClick={applyUser} className={applyBtn}><Check size={13} /> Apply</button>
                </div>
              </div>
            )}

            {/* ── Settings folder ── */}
            {view === "settings" && (
              <div className="space-y-2.5">
                <p className="text-[10px] text-[var(--tx5)]">Open a settings section.</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {canSeeUsers && (
                    <button
                      onClick={() => { router.push("/settings#users"); close(); }}
                      className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-[var(--surface2)] border border-[var(--border)] hover:border-[var(--a-border)] transition-colors"
                    >
                      <span className="w-10 h-10 rounded-xl bg-[var(--a-muted)] flex items-center justify-center"><Users size={18} className="text-[var(--a-text)]" /></span>
                      <span className="text-xs font-medium text-[var(--tx2)]">Users</span>
                    </button>
                  )}
                  {canSeeRoles && (
                    <button
                      onClick={() => { router.push("/settings#roles"); close(); }}
                      className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-[var(--surface2)] border border-[var(--border)] hover:border-[var(--a-border)] transition-colors"
                    >
                      <span className="w-10 h-10 rounded-xl bg-[var(--a-muted)] flex items-center justify-center"><Shield size={18} className="text-[var(--a-text)]" /></span>
                      <span className="text-xs font-medium text-[var(--tx2)]">Roles</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Databases (reset / sync working ↔ persistent) ── */}
            {view === "db" && (
              <div className="space-y-3">
                <p className="text-[10px] text-[var(--tx5)] leading-relaxed">
                  The <span className="text-[var(--tx3)] font-medium">working</span> database is what the app uses.
                  The <span className="text-[var(--tx3)] font-medium">persistent</span> one is a saved baseline.
                </p>

                {pendingDir ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
                      <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-[var(--tx3)] leading-relaxed">
                        {pendingDir === "persistent-to-working"
                          ? "This clears the working database and restores it from the persistent baseline. Unsaved working changes are lost."
                          : "This overwrites the persistent baseline with the current working database. The previous baseline is replaced."}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setPendingDir(null)} disabled={syncing} className={cancelBtn}><X size={13} /> Cancel</button>
                      <button onClick={() => runSync(pendingDir)} disabled={syncing} className={cn(applyBtn, "bg-rose-500 hover:bg-rose-400")}>
                        {syncing ? <RotateCcw size={13} className="animate-spin" /> : <Check size={13} />} Confirm
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => setPendingDir("persistent-to-working")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left bg-[var(--surface2)] border border-[var(--border)] hover:border-[var(--a-border)] transition-colors"
                    >
                      <span className={iconBoxCls}><CloudDownload size={14} className="text-[var(--a-text)]" /></span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-medium text-[var(--tx2)]">Reset · Persistent → Working</span>
                        <span className="block text-[10px] text-[var(--tx5)]">Clear working, restore from the baseline</span>
                      </span>
                    </button>

                    <button
                      onClick={() => setPendingDir("working-to-persistent")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left bg-[var(--surface2)] border border-[var(--border)] hover:border-[var(--a-border)] transition-colors"
                    >
                      <span className={iconBoxCls}><CloudUpload size={14} className="text-[var(--a-text)]" /></span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-medium text-[var(--tx2)]">Save · Working → Persistent</span>
                        <span className="block text-[10px] text-[var(--tx5)]">Update the baseline from working</span>
                      </span>
                    </button>

                    {syncMsg && <p className="text-[10px] text-[var(--a-text)] px-1">{syncMsg}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
