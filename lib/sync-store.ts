// Offline-first data store (client-only).
//
// The browser keeps a full copy of the database in localStorage. All READS are
// served from this local copy (instant — no network), so fetching/displaying is
// fast. All WRITES update the local copy immediately AND mirror the whole
// database to the cloud bin (via /api/db) in the background.
//
// On each fetch we also compare the local copy against the cloud (throttled,
// in the background). If they differ, `diverged` flips true so the UI can show
// a red glow on Dev Tools and offer a manual Local↔Cloud sync.

export type Row = { id: string; [k: string]: unknown };
export type DB = Record<string, Row[]>;

const LS_KEY = "uft-offline-db";

// In-memory mirror of localStorage (so reads are synchronous after boot).
let cache: DB | null = null;
let bootPromise: Promise<DB> | null = null;
let pendingMirrors = 0; // cloud writes in flight — pause divergence checks while >0

// ── Status (observable via useSyncExternalStore) ───────────────────────────
export type SyncStatus = { booted: boolean; diverged: boolean; checking: boolean; syncing: boolean };
let status: SyncStatus = { booted: false, diverged: false, checking: false, syncing: false };
const listeners = new Set<() => void>();

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
// Stable reference between renders (only replaced when something changes).
export function getStatus(): SyncStatus {
  return status;
}
function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

// ── localStorage helpers ────────────────────────────────────────────────────
function loadLS(): DB | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as DB) : null;
  } catch {
    return null;
  }
}
function saveLS(db: DB) {
  cache = db;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  } catch {
    /* quota / unavailable — keep the in-memory copy */
  }
}
function localSync(): DB {
  return cache ?? loadLS() ?? {};
}
function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

// ── Cloud (via /api/db) ──────────────────────────────────────────────────────
async function fetchCloud(): Promise<DB> {
  const res = await fetch("/api/db", { cache: "no-store" });
  if (!res.ok) throw new Error(`cloud read failed (${res.status})`);
  return res.json() as Promise<DB>;
}
async function putCloud(db: DB): Promise<void> {
  const res = await fetch("/api/db", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(db),
  });
  if (!res.ok) throw new Error(`cloud write failed (${res.status})`);
}

// Fire-and-forget mirror of the current local copy to the cloud.
function mirror(db: DB) {
  pendingMirrors++;
  putCloud(db)
    .catch(() => {
      /* divergence check will surface the drift */
    })
    .finally(() => {
      pendingMirrors--;
    });
}

// ── Boot: load local copy, or pull it from the cloud on first ever run ──────
export function ensureBooted(): Promise<DB> {
  if (cache) return Promise.resolve(cache);
  if (!bootPromise) {
    bootPromise = (async () => {
      const local = loadLS();
      if (local) {
        cache = local;
        setStatus({ booted: true });
        scheduleDivergenceCheck();
        return local;
      }
      // First run on this browser — seed the local copy from the cloud.
      const cloud = await fetchCloud();
      saveLS(cloud);
      setStatus({ booted: true });
      return cloud;
    })();
  }
  return bootPromise;
}

// ── Divergence check (throttled, background) ────────────────────────────────
let lastCheckAt = 0;
let checkInFlight = false;

function scheduleDivergenceCheck() {
  if (checkInFlight || pendingMirrors > 0) return;
  if (Date.now() - lastCheckAt < 2000) return;
  void checkDivergence();
}

export async function checkDivergence(): Promise<void> {
  if (checkInFlight || pendingMirrors > 0) return;
  checkInFlight = true;
  lastCheckAt = Date.now();
  setStatus({ checking: true });
  try {
    const cloud = await fetchCloud();
    setStatus({ diverged: canonical(cloud) !== canonical(localSync()), checking: false });
  } catch {
    setStatus({ checking: false });
  } finally {
    checkInFlight = false;
  }
}

// Order-independent canonical form so cosmetic key/row ordering differences
// between client and server writes don't register as divergence.
function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const obj = v as Record<string, unknown>;
  return "{" + Object.keys(obj).sort().map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
}
function canonical(db: DB): string {
  const norm: Record<string, unknown> = {};
  for (const k of Object.keys(db).sort()) {
    const rows = Array.isArray(db[k])
      ? [...db[k]].sort((a, b) => String(a?.id).localeCompare(String(b?.id)))
      : db[k];
    norm[k] = rows;
  }
  return stableStringify(norm);
}

// ── Reads (local) ────────────────────────────────────────────────────────────
export async function listLocal(name: string): Promise<Row[]> {
  const db = await ensureBooted();
  scheduleDivergenceCheck();
  return Array.isArray(db[name]) ? db[name] : [];
}

// ── Writes (local immediately + cloud mirror) ────────────────────────────────
export async function createLocal(name: string, data: Record<string, unknown>): Promise<Row> {
  const db = await ensureBooted();
  const id = typeof data.id === "string" && data.id ? data.id : uid();
  const row: Row = { ...data, id };
  db[name] = [...(db[name] ?? []), row];
  saveLS(db);
  mirror(db);
  return row;
}

export async function updateLocal(name: string, id: string, patch: Record<string, unknown>): Promise<Row | undefined> {
  const db = await ensureBooted();
  const rows = db[name] ?? [];
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;
  const { id: _ignore, ...rest } = patch;
  void _ignore;
  const updated = { ...rows[idx], ...rest, id };
  db[name] = rows.map((r, i) => (i === idx ? updated : r));
  saveLS(db);
  mirror(db);
  return updated;
}

export async function deleteLocal(name: string, id: string): Promise<void> {
  const db = await ensureBooted();
  db[name] = (db[name] ?? []).filter((r) => r.id !== id);
  saveLS(db);
  mirror(db);
}

export async function replaceLocal(name: string, rows: Row[]): Promise<Row[]> {
  const db = await ensureBooted();
  const withIds = rows.map((r) => ({ ...r, id: typeof r.id === "string" && r.id ? r.id : uid() }));
  db[name] = withIds;
  saveLS(db);
  mirror(db);
  return withIds;
}

// ── Sync actions (manual, from Dev Tools) ────────────────────────────────────
export async function syncLocalToCloud(): Promise<void> {
  setStatus({ syncing: true });
  try {
    await ensureBooted();
    await putCloud(localSync());
    setStatus({ diverged: false });
  } finally {
    setStatus({ syncing: false });
  }
}

export async function syncCloudToLocal(): Promise<void> {
  setStatus({ syncing: true });
  try {
    const cloud = await fetchCloud();
    saveLS(cloud);
    setStatus({ diverged: false });
  } finally {
    setStatus({ syncing: false });
  }
}

// Reset the cloud to the seed baseline, then pull it down to local.
export async function resetAll(): Promise<void> {
  await fetch("/api/reset", { method: "POST" });
  const cloud = await fetchCloud();
  saveLS(cloud);
  setStatus({ diverged: false });
}
