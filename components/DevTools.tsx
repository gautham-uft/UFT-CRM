"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  Cog, Clock, Database, UserCog, SlidersHorizontal,
  ChevronLeft, ChevronRight, RotateCcw, Check, X, AlertTriangle,
  Users, Shield, RefreshCw, CloudUpload, CloudDownload, Cloud, CloudOff,
} from "lucide-react";
import { useNow } from "@/contexts/NowContext";
import { useCurrentUser, DEFAULT_USER, type CurrentUser } from "@/contexts/CurrentUserContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useCollection } from "@/hooks/useCollection";
import { resetDatabase } from "@/lib/api";
import { subscribe as syncSubscribe, getStatus as getSyncStatus, checkDivergence, syncLocalToCloud, syncCloudToLocal } from "@/lib/sync-store";
import { subscribeMode, getModeSnapshot, getModeServerSnapshot, setOnlineMode } from "@/lib/data-mode";
import { cn } from "@/lib/utils";

type View = "menu" | "time" | "db" | "user" | "settings" | "sync";

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

  // Offline/cloud sync status (red indicator when local and cloud diverge).
  const sync = useSyncExternalStore(syncSubscribe, getSyncStatus, getSyncStatus);
  const onlineMode = useSyncExternalStore(subscribeMode, getModeSnapshot, getModeServerSnapshot);
  const diverged = !onlineMode && sync.diverged;

  function toggleOnlineMode() {
    setOnlineMode(!onlineMode);
    window.location.reload(); // reload so all data re-loads from the chosen source
  }

  // Status indicator beside the bar: red = out of sync, blue = time overridden,
  // green = normal. (Out-of-sync takes priority over a time override.)
  const indicator = diverged
    ? { color: "bg-rose-500",    glow: "shadow-[0_0_6px_1px_rgba(244,63,94,0.8)]",  label: "Database out of sync — open Dev Tools → Sync Data", pulse: true }
    : isOverridden
      ? { color: "bg-blue-500",    glow: "shadow-[0_0_6px_1px_rgba(59,130,246,0.8)]", label: "Date & time overridden", pulse: false }
      : { color: "bg-emerald-500", glow: "shadow-[0_0_6px_1px_rgba(16,185,129,0.8)]", label: "Local and cloud in sync", pulse: false };

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const ref = useRef<HTMLDivElement>(null);

  // Drafts (apply/confirm pattern — nothing changes until you Apply).
  const [timeDraft, setTimeDraft] = useState("");
  const [userDraft, setUserDraft] = useState<string>(currentUser.id);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function close() { setOpen(false); }

  // When (re)opening a sub-view, seed its draft from the live value.
  function go(v: View) {
    if (v === "time") setTimeDraft(now);
    if (v === "user") setUserDraft(currentUser.id);
    if (v === "sync") void checkDivergence(); // refresh the comparison
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

  async function confirmReset() {
    setResetting(true);
    await resetDatabase();
    window.location.reload();
  }

  async function doSync(dir: "up" | "down") {
    if (dir === "up") await syncLocalToCloud();
    else { await syncCloudToLocal(); window.location.reload(); return; }
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
              {view === "db" && "Reset Database"}
              {view === "user" && "Switch User"}
              {view === "settings" && "Settings"}
              {view === "sync" && "Sync Data"}
            </span>
          </div>

          <div className="p-2.5">
            {/* ── Menu ── */}
            {view === "menu" && (
              <div className="space-y-1.5">
                {/* Online Mode toggle — direct cloud vs offline-first local copy */}
                <button onClick={toggleOnlineMode} className={cn(rowCls, onlineMode && "border-emerald-500/50 bg-emerald-500/5")}>
                  <span className={cn(iconBoxCls, onlineMode && "bg-emerald-500/15")}>
                    {onlineMode ? <Cloud size={14} className="text-emerald-400" /> : <CloudOff size={14} className="text-[var(--tx4)]" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-[var(--tx2)]">Online Mode</span>
                    <span className="block text-[10px] text-[var(--tx5)] truncate">{onlineMode ? "Connected directly to the cloud" : "Using local copy (offline-first)"}</span>
                  </span>
                  <span className={cn(
                    "relative w-9 h-5 rounded-full transition-colors shrink-0",
                    onlineMode ? "bg-emerald-500" : "bg-[var(--surface3)]"
                  )}>
                    <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all", onlineMode ? "left-[18px]" : "left-0.5")} />
                  </span>
                </button>

                <button onClick={() => go("time")} title={fmtNow(now)} className={rowCls}>
                  <span className={iconBoxCls}><Clock size={14} className="text-[var(--a-text)]" /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-[var(--tx2)]">Current Time</span>
                    <span className="block text-[10px] text-[var(--tx5)] truncate">{fmtNow(now)}</span>
                  </span>
                  {isOverridden && <span className="text-[9px] text-[var(--a-text)] font-semibold uppercase tracking-wide">Overridden</span>}
                  <ChevronRight size={14} className="text-[var(--tx5)] shrink-0" />
                </button>

                {!onlineMode && (
                <button onClick={() => go("sync")} className={cn(rowCls, diverged && "border-rose-500/60 bg-rose-500/5")}>
                  <span className={cn(iconBoxCls, diverged && "bg-rose-500/15")}>
                    <RefreshCw size={14} className={diverged ? "text-rose-400" : "text-[var(--a-text)]"} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-[var(--tx2)] flex items-center gap-1.5">
                      Sync Data
                      {diverged && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                    </span>
                    <span className="block text-[10px] text-[var(--tx5)] truncate">
                      {sync.checking ? "Checking…" : diverged ? "Local and cloud differ" : "Local and cloud in sync"}
                    </span>
                  </span>
                  <ChevronRight size={14} className="text-[var(--tx5)] shrink-0" />
                </button>
                )}

                <button onClick={() => go("db")} className={rowCls}>
                  <span className={iconBoxCls}><Database size={14} className="text-[var(--a-text)]" /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-[var(--tx2)]">Reset Database</span>
                    <span className="block text-[10px] text-[var(--tx5)] truncate">Restore the persistent baseline</span>
                  </span>
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

            {/* ── Reset database ── */}
            {view === "db" && (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
                  <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[var(--tx3)] leading-relaxed">
                    This clears the working database and restores the persistent baseline (leads, users, roles). Everything created this session is dropped.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setView("menu")} disabled={resetting} className={cancelBtn}><X size={13} /> Reject</button>
                  <button onClick={confirmReset} disabled={resetting} className={cn(applyBtn, "bg-rose-500 hover:bg-rose-400")}>
                    {resetting ? <RotateCcw size={13} className="animate-spin" /> : <Check size={13} />} Confirm
                  </button>
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

            {/* ── Sync data (Local ↔ Cloud) ── */}
            {view === "sync" && (
              <div className="space-y-3">
                <div className={cn(
                  "flex items-start gap-2.5 p-3 rounded-lg border",
                  diverged ? "bg-rose-500/10 border-rose-500/30" : "bg-[var(--surface2)] border-[var(--border)]"
                )}>
                  <span className={cn("w-2 h-2 rounded-full mt-1 shrink-0", sync.checking ? "bg-amber-400 animate-pulse" : diverged ? "bg-rose-500" : "bg-emerald-400")} />
                  <p className="text-[11px] text-[var(--tx3)] leading-relaxed">
                    {sync.checking
                      ? "Comparing the local copy with the cloud…"
                      : diverged
                        ? "Your local copy and the cloud database differ. Choose a direction to reconcile them."
                        : "Local copy and cloud are in sync."}
                  </p>
                </div>

                <button
                  onClick={() => doSync("up")}
                  disabled={sync.syncing}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left bg-[var(--surface2)] border border-[var(--border)] hover:border-[var(--a-border)] transition-colors disabled:opacity-50"
                >
                  <span className={iconBoxCls}><CloudUpload size={14} className="text-[var(--a-text)]" /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-[var(--tx2)]">Local → Cloud</span>
                    <span className="block text-[10px] text-[var(--tx5)]">Push this device&apos;s data to the cloud (overwrites cloud)</span>
                  </span>
                </button>

                <button
                  onClick={() => doSync("down")}
                  disabled={sync.syncing}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left bg-[var(--surface2)] border border-[var(--border)] hover:border-[var(--a-border)] transition-colors disabled:opacity-50"
                >
                  <span className={iconBoxCls}><CloudDownload size={14} className="text-[var(--a-text)]" /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-[var(--tx2)]">Cloud → Local</span>
                    <span className="block text-[10px] text-[var(--tx5)]">Pull the cloud data to this device (overwrites local)</span>
                  </span>
                </button>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setView("menu")} className={cancelBtn}><X size={13} /> Close</button>
                  <button onClick={() => checkDivergence()} disabled={sync.checking || sync.syncing} className={applyBtn}>
                    <RefreshCw size={13} className={sync.checking ? "animate-spin" : ""} /> Re-check
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
