// Data client — the UI's gateway to Seam A (the Application API, /api/v1/*).
// Server-authoritative: every read/write hits PostgreSQL through the v1 route
// handlers → core → Seam B. No browser cache or offline mirror.

import { API_BASE } from "@/lib/api-base";

const API = `${API_BASE}/api/v1`;

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${detail}`);
  }
  return res.json() as Promise<T>;
}

export async function listCollection<T>(collection: string): Promise<T[]> {
  return handle<T[]>(await fetch(`${API}/${collection}`, { cache: "no-store" }));
}

export async function createItem<T>(collection: string, data: Partial<T>): Promise<T> {
  return handle<T>(await fetch(`${API}/${collection}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  }));
}

export async function updateItem<T>(collection: string, id: string, patch: Partial<T>): Promise<T> {
  return handle<T>(await fetch(`${API}/${collection}/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
  }));
}

export async function deleteItem(collection: string, id: string): Promise<void> {
  await handle<{ ok: boolean }>(await fetch(`${API}/${collection}/${id}`, { method: "DELETE" }));
}

export async function replaceCollection<T>(collection: string, rows: T[]): Promise<T[]> {
  return handle<T[]>(await fetch(`${API}/${collection}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rows),
  }));
}

// ── Reset / sync between the working and persistent databases ────────────────
export type SyncDirection = "persistent-to-working" | "working-to-persistent";

// Whether a persistent baseline DB is configured (controls are hidden if not).
export async function persistentAvailable(): Promise<boolean> {
  try {
    const { persistent } = await handle<{ persistent: boolean }>(await fetch(`${API}/admin/db-sync`, { cache: "no-store" }));
    return persistent;
  } catch {
    return false;
  }
}

// Run a reset (persistent → working) or save (working → persistent).
export async function syncDatabases(direction: SyncDirection): Promise<void> {
  await handle<{ ok: boolean }>(await fetch(`${API}/admin/db-sync`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ direction }),
  }));
}
