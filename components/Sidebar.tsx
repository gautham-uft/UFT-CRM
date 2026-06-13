"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, UserCircle, TrendingUp,
  Activity, CreditCard, ChevronRight, Zap,
  CalendarClock, Search, ShieldCheck, Database, Cog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppData } from "@/contexts/AppDataContext";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { moduleForPath, SUPERUSER_ROLE } from "@/lib/permissions";

// Settings now lives inside the Dev Tools panel (top bar), not the sidebar.
const navItems: { label: string; href: string; icon: typeof LayoutDashboard; directorOnly?: boolean }[] = [
  { label: "Dashboard",     href: "/",              icon: LayoutDashboard },
  { label: "Leads",         href: "/leads",         icon: Zap },
  { label: "Quick Tab",     href: "/quick-tab",     icon: Search },
  { label: "Naukri Verify", href: "/naukri-verify", icon: ShieldCheck },
  { label: "Contacts",      href: "/contacts",      icon: UserCircle },
  { label: "Accounts",      href: "/accounts",      icon: Building2 },
  { label: "Deals",         href: "/deals",         icon: TrendingUp },
  { label: "Activities",    href: "/activities",    icon: Activity },
  { label: "Follow-ups",    href: "/follow-ups",    icon: CalendarClock },
  { label: "Business Card", href: "/business-card", icon: CreditCard },
  { label: "Database",      href: "/database",      icon: Database },
  { label: "Admin Panel",   href: "/admin",         icon: Cog, directorOnly: true },
];

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { followUps } = useAppData();
  const { currentUser } = useCurrentUser();
  const { canRead } = usePermissions();

  const today = getTodayStr();
  const pendingCount = followUps.filter(f => !f.done && f.follow_up_date && f.follow_up_date <= today).length;

  // Only show modules the current role can read; Admin Panel is Director-only.
  const visibleNav = navItems.filter((item) => {
    if (item.directorOnly) return currentUser.role === SUPERUSER_ROLE;
    const mod = moduleForPath(item.href);
    return mod ? canRead(mod) : true;
  });

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col z-40 transition-colors duration-250">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-[var(--a)] flex items-center justify-center shadow-sm">
          <span className="text-white font-bold text-sm">U</span>
        </div>
        <div>
          <p className="text-[var(--tx1)] font-semibold text-sm leading-none">UFT CRM</p>
          <p className="text-[var(--tx5)] text-xs mt-0.5">RevOps Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          const isFollowUps = href === "/follow-ups";
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group",
                active
                  ? "bg-[var(--a-muted)] text-[var(--a-text)] font-medium"
                  : "text-[var(--tx4)] hover:bg-[var(--surface2)] hover:text-[var(--tx2)]"
              )}
            >
              <Icon
                size={16}
                className={cn(active ? "text-[var(--a-text)]" : "text-[var(--tx5)] group-hover:text-[var(--tx3)]")}
              />
              <span className="flex-1">{label}</span>
              {/* Pending badge on Follow-ups */}
              {isFollowUps && pendingCount > 0 && !active && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--a)] text-white min-w-[18px] text-center leading-tight">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
              {active && <ChevronRight size={14} className="text-[var(--a-text)]" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--a-muted)] flex items-center justify-center">
            <Users size={14} className="text-[var(--a-text)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[var(--tx2)] text-xs font-medium truncate">{currentUser.first_name} {currentUser.last_name}</p>
            <p className="text-[var(--tx5)] text-xs truncate">{currentUser.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
