"use client";

import { mockPipelineStages } from "@/lib/mock-data";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Users, Building2, Zap, DollarSign, Activity, ArrowUpRight, ArrowDownRight, Bell, Clock } from "lucide-react";
import { useChartColors } from "@/hooks/useChartColors";
import { cn } from "@/lib/utils";
import { useCollection } from "@/hooks/useCollection";
import { useAppData } from "@/contexts/AppDataContext";
import { useNow } from "@/contexts/NowContext";
import { usePermissions } from "@/contexts/PermissionsContext";
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
  const { activities, calendarEvents, followUps } = useAppData();
  const { today } = useNow();
  const { ready, canRead } = usePermissions();

  // Events & follow-ups coming due within one day → banner alerts.
  const dueSoon = [
    ...calendarEvents
      .filter(e => !e.done && e.date)
      .map(e => ({ key: `ce-${e.id}`, name: e.title, kind: e.type, date: e.date })),
    ...followUps
      .filter(f => !f.done && f.follow_up_date && f.source !== "calendar")
      .map(f => ({ key: `fu-${f.id}`, name: f.note || f.entity_name, kind: f.source, date: f.follow_up_date! })),
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

  if (ready && !canRead("Dashboard")) return <NoAccess module="Dashboard" />;

  return (
    <div className="space-y-6">
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
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--a-border)] transition-colors">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[var(--tx5)] text-xs font-medium">{label}</p>
              <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={14} className={color} />
              </div>
            </div>
            <p className="text-[var(--tx1)] text-xl font-bold">{value}</p>
            <p className="text-[var(--tx5)] text-xs mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Charts — Deals module */}
      {showDeals && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[var(--tx2)] font-semibold text-sm">Pipeline by Stage</h2>
            <span className="text-xs text-[var(--tx5)]">Open: ${pipelineValue.toLocaleString()}</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dealsByStage} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
              <XAxis dataKey="stage" tick={{ fill: c.tick, fontSize: 11 }} />
              <YAxis tick={{ fill: c.tick, fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: c.tooltip.background, border: `1px solid ${c.tooltip.border}`, borderRadius: 8, color: c.tooltip.color }}
                formatter={(v) => [`$${Number(v).toLocaleString()}`, "Value"]}
              />
              <Bar dataKey="value" fill={c.bar} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[var(--tx2)] font-semibold text-sm">Revenue Over Time</h2>
            {momChange !== null && (
              <span className={cn("text-xs flex items-center gap-1", momChange >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {momChange >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {momChange >= 0 ? "+" : ""}{momChange}% MoM
              </span>
            )}
          </div>
          {revenueOverTime.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-center">
              <p className="text-[var(--tx5)] text-xs">No closed-won revenue yet.<br />Win a deal to start tracking revenue over time.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenueOverTime} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis dataKey="month" tick={{ fill: c.tick, fontSize: 11 }} />
                <YAxis tick={{ fill: c.tick, fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: c.tooltip.background, border: `1px solid ${c.tooltip.border}`, borderRadius: 8, color: c.tooltip.color }}
                  formatter={(v) => [`$${Number(v).toLocaleString()}`, "Revenue"]}
                />
                <Line type="monotone" dataKey="revenue" stroke={c.line} strokeWidth={2} dot={{ fill: c.dot, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      )}

      {/* Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {showActivities && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <h2 className="text-[var(--tx2)] font-semibold text-sm mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {activities.length === 0 && <p className="text-[var(--tx6)] text-xs">No activity yet.</p>}
            {activities.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <span className="text-lg leading-none mt-0.5">{activityIcons[a.activity_type] ?? "📌"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--tx3)] text-xs leading-relaxed line-clamp-2">{a.description}</p>
                  <p className="text-[var(--tx6)] text-xs mt-0.5">{a.user} · {new Date(a.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {showDeals && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <h2 className="text-[var(--tx2)] font-semibold text-sm mb-4">Deal Count by Stage</h2>
          <div className="space-y-3">
            {dealsByStage.map((s) => (
              <div key={s.stage}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--tx4)]">{s.stage}</span>
                  <span className="text-[var(--tx4)]">{s.count} deals · ${s.value.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--a)] rounded-full transition-all" style={{ width: `${(s.value / maxStageValue) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
