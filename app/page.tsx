"use client";

import { useState, type ReactNode } from "react";
import { mockPipelineStages } from "@/lib/mock-data";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Users, Building2, Zap, DollarSign, Activity, ArrowUpRight, ArrowDownRight, Bell, Clock, CalendarPlus, ClipboardList, StickyNote, X, SlidersHorizontal, Check } from "lucide-react";
import { useChartColors } from "@/hooks/useChartColors";
import { cn } from "@/lib/utils";
import { useCollection } from "@/hooks/useCollection";
import { useAppData } from "@/contexts/AppDataContext";
import { useNow } from "@/contexts/NowContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useQuickActions } from "@/components/QuickActions";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { isRestrictedRole, roleRank } from "@/lib/permissions";
import NoAccess from "@/components/NoAccess";

type DealRow = { id: string; stage_id: string; total_amount: number; created_at?: string };

const CLOSED_WON = "5";
const CLOSED_LOST = "6";

// Whole-day difference between two YYYY-MM-DD dates (negative = `to` is past).
function daysBetween(fromStr: string, toStr: string) {
  const a = new Date(fromStr + "T00:00:00");
  const b = new Date(toStr + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

const activityIcons: Record<string, string> = {
  call_log: "📞", email: "✉️", note: "📝", meeting: "📅",
};

export default function Dashboard() {
  const c = useChartColors();
  const { items: leads }    = useCollection<{ id: string }>("leads");
  const { items: contacts } = useCollection<{ id: string }>("contacts");
  const { items: accounts } = useCollection<{ id: string }>("accounts");
  const { items: deals }    = useCollection<DealRow>("deals");
  const { activities, calendarEvents, followUps, deleteActivity, deleteCalendarEvent, deleteFollowUp } = useAppData();
  const { today } = useNow();
  const { ready, canRead } = usePermissions();
  const { openScheduleMeeting, openAssignTask, openAddNote } = useQuickActions();
  const { currentUser } = useCurrentUser();
  const restricted = isRestrictedRole(currentUser.role);
  // Removing activities / meetings is limited to Account Manager and above.
  const canManageActivities = roleRank(currentUser.role) >= roleRank("Account Manager");

  // Events & follow-ups coming due within one day → banner alerts.
  const dueSoon = [
    ...calendarEvents
      .filter(e => !e.done && e.date)
      .map(e => ({ key: `ce-${e.id}`, name: e.title, kind: e.type, date: e.date as string, evId: e.id as string | undefined, fuId: undefined as string | undefined })),
    ...followUps
      .filter(f => !f.done && f.follow_up_date && f.source !== "calendar")
      .map(f => ({ key: `fu-${f.id}`, name: f.note || f.entity_name, kind: f.source, date: f.follow_up_date!, evId: undefined as string | undefined, fuId: f.id as string | undefined })),
  ]
    .map(x => ({ ...x, days: daysBetween(today, x.date) }))
    .filter(x => x.days >= 0 && x.days <= 1)
    .sort((a, b) => a.days - b.days);

  // ── Derived metrics ───────────────────────────────────────────────
  const openDeals    = deals.filter(d => d.stage_id !== CLOSED_WON && d.stage_id !== CLOSED_LOST);
  const pipelineValue = openDeals.reduce((s, d) => s + (d.total_amount || 0), 0);
  const closedWon    = deals.filter(d => d.stage_id === CLOSED_WON);
  const closedWonValue = closedWon.reduce((s, d) => s + (d.total_amount || 0), 0);
  const closedTotal  = deals.filter(d => d.stage_id === CLOSED_WON || d.stage_id === CLOSED_LOST).length;
  const winRate      = closedTotal > 0 ? Math.round((closedWon.length / closedTotal) * 100) : 0;

  // Pipeline grouped by stage (excludes Closed Lost), in stage order.
  const dealsByStage = mockPipelineStages
    .filter(s => s.name !== "Closed Lost")
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(s => {
      const stageDeals = deals.filter(d => d.stage_id === s.id);
      return { stage: s.name, count: stageDeals.length, value: stageDeals.reduce((sum, d) => sum + (d.total_amount || 0), 0) };
    });
  const maxStageValue = Math.max(1, ...dealsByStage.map(s => s.value));

  // Revenue over time — real closed-won revenue grouped by the month the deal
  // was created, in chronological order. No mock numbers.
  const revenueOverTime = (() => {
    const byMonth = new Map<string, number>();
    closedWon.forEach(d => {
      const key = (d.created_at ?? "").slice(0, 7); // "YYYY-MM"
      if (key.length === 7) byMonth.set(key, (byMonth.get(key) ?? 0) + (d.total_amount || 0));
    });
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, revenue]) => {
        const [y, m] = key.split("-").map(Number);
        return { month: new Date(y, m - 1, 1).toLocaleString(undefined, { month: "short" }), revenue };
      });
  })();

  // Month-over-month change, only when there are at least two months to compare.
  const momChange = (() => {
    if (revenueOverTime.length < 2) return null;
    const last = revenueOverTime[revenueOverTime.length - 1].revenue;
    const prev = revenueOverTime[revenueOverTime.length - 2].revenue;
    if (!prev) return null;
    return Math.round(((last - prev) / prev) * 100);
  })();

  const statCards = [
    { label: "Total Leads",      module: "Leads"    as const, value: String(leads.length),            sub: `${leads.length} in queue`,                   icon: Zap,        color: "text-violet-400",      bg: "bg-violet-500/10" },
    { label: "Open Deals",       module: "Deals"    as const, value: String(openDeals.length),        sub: `$${pipelineValue.toLocaleString()} pipeline`, icon: TrendingUp, color: "text-[var(--a-text)]", bg: "bg-[var(--a-muted)]" },
    { label: "Closed Won",       module: "Deals"    as const, value: `$${closedWonValue.toLocaleString()}`, sub: `${closedWon.length} deal${closedWon.length === 1 ? "" : "s"} won`, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Total Contacts",   module: "Contacts" as const, value: String(contacts.length),         sub: `Across ${accounts.length} accounts`,          icon: Users,      color: "text-sky-400",         bg: "bg-sky-500/10" },
    { label: "Accounts",         module: "Accounts" as const, value: String(accounts.length),         sub: "Active accounts",                             icon: Building2,  color: "text-amber-400",       bg: "bg-amber-500/10" },
    { label: "Win Rate",         module: "Deals"    as const, value: `${winRate}%`,                    sub: "Closed Won vs Lost",                          icon: Activity,   color: "text-rose-400",        bg: "bg-rose-500/10" },
  ].filter((card) => canRead(card.module));

  // The dashboard aggregates other modules, so each widget is shown only if the
  // role can read that module.
  const showDeals      = canRead("Deals");
  const showActivities = canRead("Activities");
  const showFollowUps  = canRead("Follow-ups");

  // ── Customizable panels ───────────────────────────────────────────
  // Each panel belongs to a section (sections stack vertically; panels within a
  // section scroll horizontally). Users pick which to show; the choice persists
  // per user. `defaultOn` panels show out of the box; the rest are "more panels"
  // available in edit mode.
  const SECTIONS = [
    { id: "metrics",  label: "Key Metrics" },
    { id: "pipeline", label: "Pipeline & Revenue" },
    { id: "activity", label: "Activity" },
    { id: "actions",  label: "Quick Actions" },
  ];
  const sectionWidth: Record<string, string> = {
    metrics: "w-[200px]", pipeline: "w-[440px]", activity: "w-[360px]", actions: "w-[340px]",
  };

  type Panel = { id: string; label: string; section: string; show: boolean; defaultOn: boolean; render: () => ReactNode };

  const kpiPanels: Panel[] = statCards.map(card => {
    const Icon = card.icon;
    return {
      id: `kpi:${card.label}`, label: card.label, section: "metrics", show: true, defaultOn: true,
      render: () => (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 h-full">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[var(--tx5)] text-xs font-medium">{card.label}</p>
            <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center`}><Icon size={14} className={card.color} /></div>
          </div>
          <p className="text-[var(--tx1)] text-xl font-bold">{card.value}</p>
          <p className="text-[var(--tx5)] text-xs mt-1">{card.sub}</p>
        </div>
      ),
    };
  });

  const myFollowUps = followUps.filter(f => !f.done && f.follow_up_date).sort((a, b) => (a.follow_up_date! < b.follow_up_date! ? -1 : 1)).slice(0, 6);

  const otherPanels: Panel[] = [
    { id: "pipeline-bar", label: "Pipeline by Stage", section: "pipeline", show: showDeals, defaultOn: true, render: () => (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 h-full">
        <div className="flex items-center justify-between mb-4"><h2 className="text-[var(--tx2)] font-semibold text-sm">Pipeline by Stage</h2><span className="text-xs text-[var(--tx5)]">Open: ${pipelineValue.toLocaleString()}</span></div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dealsByStage} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={c.grid} /><XAxis dataKey="stage" tick={{ fill: c.tick, fontSize: 11 }} /><YAxis tick={{ fill: c.tick, fontSize: 11 }} />
            <Tooltip contentStyle={{ background: c.tooltip.background, border: `1px solid ${c.tooltip.border}`, borderRadius: 8, color: c.tooltip.color }} formatter={(v) => [`$${Number(v).toLocaleString()}`, "Value"]} />
            <Bar dataKey="value" fill={c.bar} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    ) },
    { id: "revenue-line", label: "Revenue Over Time", section: "pipeline", show: showDeals, defaultOn: true, render: () => (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 h-full">
        <div className="flex items-center justify-between mb-4"><h2 className="text-[var(--tx2)] font-semibold text-sm">Revenue Over Time</h2>{momChange !== null && (<span className={cn("text-xs flex items-center gap-1", momChange >= 0 ? "text-emerald-400" : "text-rose-400")}>{momChange >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{momChange >= 0 ? "+" : ""}{momChange}% MoM</span>)}</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={revenueOverTime} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={c.grid} /><XAxis dataKey="month" tick={{ fill: c.tick, fontSize: 11 }} /><YAxis tick={{ fill: c.tick, fontSize: 11 }} />
            <Tooltip contentStyle={{ background: c.tooltip.background, border: `1px solid ${c.tooltip.border}`, borderRadius: 8, color: c.tooltip.color }} formatter={(v) => [`$${Number(v).toLocaleString()}`, "Revenue"]} />
            <Line type="monotone" dataKey="revenue" stroke={c.line} strokeWidth={2} dot={{ fill: c.dot, r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    ) },
    { id: "stage-bars", label: "Deal Count by Stage", section: "pipeline", show: showDeals, defaultOn: false, render: () => (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 h-full">
        <h2 className="text-[var(--tx2)] font-semibold text-sm mb-4">Deal Count by Stage</h2>
        <div className="space-y-3">{dealsByStage.map((s) => (<div key={s.stage}><div className="flex justify-between text-xs mb-1"><span className="text-[var(--tx4)]">{s.stage}</span><span className="text-[var(--tx4)]">{s.count} · ${s.value.toLocaleString()}</span></div><div className="h-2 bg-[var(--border)] rounded-full overflow-hidden"><div className="h-full bg-[var(--a)] rounded-full transition-all" style={{ width: `${(s.value / maxStageValue) * 100}%` }} /></div></div>))}</div>
      </div>
    ) },
    { id: "recent-activity", label: "Recent Activity", section: "activity", show: showActivities, defaultOn: true, render: () => (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 h-full">
        <h2 className="text-[var(--tx2)] font-semibold text-sm mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {activities.length === 0 && <p className="text-[var(--tx6)] text-xs">No activity yet.</p>}
          {activities.slice(0, 6).map((a) => (
            <div key={a.id} className="flex items-start gap-3 group">
              <span className="text-lg leading-none mt-0.5">{activityIcons[a.activity_type] ?? "📌"}</span>
              <div className="flex-1 min-w-0"><p className="text-[var(--tx3)] text-xs leading-relaxed line-clamp-2">{a.description}</p><p className="text-[var(--tx6)] text-xs mt-0.5">{a.user} · {new Date(a.created_at).toLocaleDateString()}</p></div>
              {canManageActivities && (<button onClick={() => { if (a.ref_id) deleteCalendarEvent(a.ref_id); else deleteActivity(a.id); }} title={a.ref_id ? "Delete meeting" : "Delete activity"} className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-[var(--tx5)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"><X size={14} /></button>)}
            </div>
          ))}
        </div>
      </div>
    ) },
    { id: "my-followups", label: "Upcoming Follow-ups", section: "activity", show: showFollowUps, defaultOn: false, render: () => (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 h-full">
        <h2 className="text-[var(--tx2)] font-semibold text-sm mb-4">Upcoming Follow-ups</h2>
        <div className="space-y-2.5">
          {myFollowUps.length === 0 && <p className="text-[var(--tx6)] text-xs">Nothing scheduled.</p>}
          {myFollowUps.map((f) => (
            <div key={f.id} className="flex items-center gap-2.5">
              <Clock size={13} className="text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0"><p className="text-[var(--tx3)] text-xs truncate">{f.note || f.entity_name}</p><p className="text-[var(--tx6)] text-[10px]">{f.follow_up_date}</p></div>
            </div>
          ))}
        </div>
      </div>
    ) },
    { id: "quick-actions", label: "Quick Actions", section: "actions", show: true, defaultOn: true, render: () => (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 h-full">
        <h2 className="text-[var(--tx2)] font-semibold text-sm">Quick Actions</h2>
        <p className="text-[var(--tx5)] text-xs mt-0.5 mb-3">{restricted ? "Add a note to a record." : "Schedule, assign, or note."}</p>
        <div className="flex flex-col gap-2">
          {!restricted && (<>
            <button onClick={openScheduleMeeting} className="flex items-center gap-2 px-3 py-2 bg-[var(--a)] text-white text-xs rounded-lg hover:bg-[var(--a-hover)] transition-colors"><CalendarPlus size={14} /> Schedule a Meeting</button>
            <button onClick={openAssignTask} className="flex items-center gap-2 px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx3)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors"><ClipboardList size={14} /> Assign a Task</button>
          </>)}
          <button onClick={() => openAddNote()} className="flex items-center gap-2 px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx3)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors"><StickyNote size={14} /> Add a Note</button>
        </div>
      </div>
    ) },
  ];

  const allPanels = [...kpiPanels, ...otherPanels].filter(p => p.show);
  const STORAGE_KEY = `uft-dash-panels-${currentUser.id}`;
  const defaultEnabled = () => new Set(allPanels.filter(p => p.defaultOn).map(p => p.id));
  // Stored prefs win (even an empty set = user hid everything); otherwise default.
  const [enabled, setEnabled] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return new Set(JSON.parse(raw) as string[]); } catch { /* ignore */ }
    }
    return defaultEnabled();
  });
  const [editing, setEditing] = useState(false);

  function persist(next: Set<string>) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
  }
  function togglePanel(id: string) {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      persist(next);
      return next;
    });
  }
  function resetPanels() { const d = defaultEnabled(); setEnabled(d); persist(d); }

  if (ready && !canRead("Dashboard")) return <NoAccess module="Dashboard" />;

  const visibleCount = allPanels.filter(p => enabled.has(p.id)).length;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-end">
        <button onClick={() => setEditing(e => !e)} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors", editing ? "bg-[var(--a)] text-white border-[var(--a)]" : "bg-[var(--surface2)] border-[var(--border)] text-[var(--tx4)] hover:border-[var(--a-border)]")}>
          {editing ? <><Check size={13} /> Done</> : <><SlidersHorizontal size={13} /> Edit Panels</>}
        </button>
      </div>

      {/* Panel editor */}
      {editing && (
        <div className="bg-[var(--surface)] border border-[var(--a-border)] rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[var(--tx2)] text-sm font-semibold">Customize your dashboard</p>
              <p className="text-[var(--tx5)] text-xs mt-0.5">Pick the panels you want to see. Sections stack vertically; panels within a section scroll sideways.</p>
            </div>
            <button onClick={resetPanels} className="text-[10px] text-[var(--tx5)] hover:text-[var(--a-text)] transition-colors shrink-0 whitespace-nowrap">Reset to default</button>
          </div>
          {SECTIONS.map(sec => {
            const ps = allPanels.filter(p => p.section === sec.id);
            if (!ps.length) return null;
            return (
              <div key={sec.id}>
                <p className="text-[10px] text-[var(--tx5)] uppercase tracking-wide mb-1.5">{sec.label}</p>
                <div className="flex flex-wrap gap-2">
                  {ps.map(p => {
                    const on = enabled.has(p.id);
                    return (
                      <button key={p.id} onClick={() => togglePanel(p.id)} className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors", on ? "bg-[var(--a-muted)] border-[var(--a-border)] text-[var(--a-text)]" : "bg-[var(--surface2)] border-[var(--border)] text-[var(--tx4)] hover:border-[var(--a-border)]")}>
                        <span className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0", on ? "bg-[var(--a)] border-[var(--a)]" : "border-[var(--tx6)]")}>{on && <Check size={10} className="text-white" />}</span>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Due-soon banners */}
      {showFollowUps && dueSoon.length > 0 && (
        <div className="space-y-2">
          {dueSoon.map(item => (
            <div key={item.key} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border bg-rose-500/10 border-rose-500/40">
              <Bell size={15} className="shrink-0 text-rose-400" />
              <span className="text-[var(--tx2)] text-sm font-medium flex-1 truncate">{item.name}</span>
              <span className="text-[10px] text-[var(--tx5)] uppercase tracking-wide bg-[var(--surface2)] px-2 py-0.5 rounded-full capitalize">{item.kind}</span>
              <span className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-rose-400">
                <Clock size={12} /> {item.days === 0 ? "Due today" : `Due in ${item.days} day`}
              </span>
              {canManageActivities && (
                <button
                  onClick={() => { if (item.evId) deleteCalendarEvent(item.evId); else if (item.fuId) deleteFollowUp(item.fuId); }}
                  title={item.evId ? "Delete meeting" : "Dismiss"}
                  className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/15 transition-colors"
                ><X size={14} /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Panels — sections stack vertically; each scrolls horizontally */}
      {SECTIONS.map(sec => {
        const secPanels = allPanels.filter(p => p.section === sec.id && enabled.has(p.id));
        if (secPanels.length === 0) return null;
        return (
          <section key={sec.id} className="space-y-2">
            <h2 className="text-[var(--tx5)] text-xs font-semibold uppercase tracking-wide">{sec.label}</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {secPanels.map(p => (
                <div key={p.id} className={cn("shrink-0", sectionWidth[p.section] ?? "w-[360px]")}>{p.render()}</div>
              ))}
            </div>
          </section>
        );
      })}

      {visibleCount === 0 && !editing && (
        <div className="text-center py-16">
          <p className="text-[var(--tx5)] text-sm">No panels selected.</p>
          <button onClick={() => setEditing(true)} className="mt-2 text-[var(--a-text)] text-xs hover:underline">Edit panels</button>
        </div>
      )}
    </div>
  );
}
