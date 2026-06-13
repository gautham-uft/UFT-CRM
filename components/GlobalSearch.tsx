"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X, Loader2, CornerDownLeft } from "lucide-react";
import { listCollection } from "@/lib/api";
import { cn } from "@/lib/utils";

type Row = { id: string; [k: string]: unknown };

// Searchable modules. `primary`/`secondary` build the result labels; matching
// scans every string field so it works regardless of exact schema.
type ModuleCfg = {
  key: string;
  collection: string;
  label: string;
  path: string;
  primary: (r: Row) => string;
  secondary: (r: Row) => string;
  color: string;
};

const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const name = (r: Row) => `${s(r.first_name)} ${s(r.last_name)}`.trim();

const MODULES: ModuleCfg[] = [
  { key: "leads",    collection: "leads",    label: "Leads",    path: "/leads",    primary: r => name(r) || s(r.company_name) || s(r.email), secondary: r => s(r.company_name) || s(r.email), color: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  { key: "contacts", collection: "contacts", label: "Contacts", path: "/contacts", primary: r => name(r) || s(r.email), secondary: r => s(r.account_name) || s(r.job_title) || s(r.email), color: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  { key: "accounts", collection: "accounts", label: "Accounts", path: "/accounts", primary: r => s(r.name), secondary: r => s(r.industry) || s(r.domain), color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { key: "deals",    collection: "deals",    label: "Deals",    path: "/deals",    primary: r => s(r.name), secondary: r => s(r.account_name) || s(r.owner), color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { key: "products", collection: "products", label: "Products", path: "/products", primary: r => s(r.name), secondary: r => s(r.category) || s(r.sku), color: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
];

function matches(r: Row, q: string): boolean {
  for (const v of Object.values(r)) {
    if (typeof v === "string" && v.toLowerCase().includes(q)) return true;
    if (typeof v === "number" && String(v).includes(q)) return true;
  }
  return false;
}

export default function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const currentModule = MODULES.find(m => pathname === m.path || pathname.startsWith(m.path + "/"));

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"page" | "all">(currentModule ? "page" : "all");
  const [scopePath, setScopePath] = useState(pathname);
  const [data, setData] = useState<Record<string, Row[]> | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // When the route changes, default the scope to "this page" on a searchable
  // page (adjust-state-during-render — no effect needed).
  if (pathname !== scopePath) {
    setScopePath(pathname);
    setScope(currentModule ? "page" : "all");
  }

  // Lazy-load all collections the first time the search is used.
  async function ensureData() {
    if (data || loading) return;
    setLoading(true);
    try {
      const entries = await Promise.all(
        MODULES.map(async m => [m.collection, await listCollection<Row>(m.collection).catch(() => [])] as const),
      );
      setData(Object.fromEntries(entries));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = query.trim().toLowerCase();
  const scopedModules = scope === "page" && currentModule ? [currentModule] : MODULES;
  const groups = q && data
    ? scopedModules
        .map(m => ({ m, rows: (data[m.collection] ?? []).filter(r => matches(r, q)).slice(0, 6) }))
        .filter(g => g.rows.length > 0)
    : [];
  const totalHits = groups.reduce((n, g) => n + g.rows.length, 0);

  function go(m: ModuleCfg, r: Row) {
    setOpen(false);
    setQuery("");
    router.push(`${m.path}?focus=${encodeURIComponent(r.id)}`);
  }

  return (
    <div className="relative" ref={ref}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tx5)] pointer-events-none" />
      <input
        type="text"
        value={query}
        placeholder="Search…"
        onFocus={() => { setOpen(true); ensureData(); }}
        onChange={e => { setQuery(e.target.value); setOpen(true); ensureData(); }}
        onKeyDown={e => { if (e.key === "Escape") { setOpen(false); (e.target as HTMLInputElement).blur(); } }}
        className="bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx3)] placeholder-[var(--tx6)] text-sm rounded-lg pl-8 pr-8 py-1.5 w-56 focus:outline-none focus:border-[var(--a-border)] focus:ring-1 focus:ring-[var(--a-ring)] transition-colors"
      />
      {query && (
        <button onClick={() => { setQuery(""); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={13} /></button>
      )}

      {open && (
        <div className="absolute top-full right-0 mt-2 w-[26rem] max-w-[80vw] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Scope toggle */}
          <div className="flex items-center gap-1 p-2 border-b border-[var(--border)]">
            <div className="flex items-center gap-0.5 p-0.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg">
              <button
                onClick={() => setScope("page")}
                disabled={!currentModule}
                className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors disabled:opacity-40",
                  scope === "page" ? "bg-[var(--a)] text-white" : "text-[var(--tx4)] hover:text-[var(--tx2)]")}
              >
                This page{currentModule ? ` · ${currentModule.label}` : ""}
              </button>
              <button
                onClick={() => setScope("all")}
                className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                  scope === "all" ? "bg-[var(--a)] text-white" : "text-[var(--tx4)] hover:text-[var(--tx2)]")}
              >
                Whole CRM
              </button>
            </div>
            {totalHits > 0 && <span className="ml-auto text-[10px] text-[var(--tx5)] pr-1">{totalHits} result{totalHits !== 1 ? "s" : ""}</span>}
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-1.5">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-[var(--tx5)] text-xs"><Loader2 size={14} className="animate-spin" /> Loading…</div>
            ) : !q ? (
              <p className="px-3 py-8 text-center text-[var(--tx5)] text-xs">Type to search {scope === "page" && currentModule ? currentModule.label.toLowerCase() : "leads, contacts, accounts, deals & products"}.</p>
            ) : groups.length === 0 ? (
              <p className="px-3 py-8 text-center text-[var(--tx5)] text-xs">No matches for &ldquo;{query}&rdquo;.</p>
            ) : (
              groups.map(({ m, rows }) => (
                <div key={m.key} className="mb-1.5 last:mb-0">
                  <p className="px-2 py-1 text-[10px] font-semibold text-[var(--tx5)] uppercase tracking-wide">{m.label}</p>
                  {rows.map(r => (
                    <button
                      key={r.id}
                      onClick={() => go(m, r)}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left hover:bg-[var(--surface2)] transition-colors group"
                    >
                      <span className={cn("px-1.5 py-0.5 rounded-md text-[9px] font-medium border shrink-0", m.color)}>{m.label}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[var(--tx2)] text-xs font-medium truncate">{m.primary(r) || "—"}</span>
                        {m.secondary(r) && <span className="block text-[var(--tx5)] text-[10px] truncate">{m.secondary(r)}</span>}
                      </span>
                      <CornerDownLeft size={12} className="text-[var(--tx6)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
