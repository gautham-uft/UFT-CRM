// Data client. Two modes (see lib/data-mode):
//   • DIRECT_DB: read/write the cloud bin directly via /api/* (Vercel).
//   • offline-first: serve reads from localStorage, mirror writes to cloud (local).
// Both expose the same listCollection / createItem / … signatures.

import { isDirect } from "@/lib/data-mode";
import {
  listLocal,
  createLocal,
  updateLocal,
  deleteLocal,
  replaceLocal,
  resetAll,
  type Row,
} from "@/lib/sync-store";

// ── Direct cloud helpers ────────────────────────────────────────────────────
async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${detail}`);
  }
  return res.json() as Promise<T>;
}

async function directList<T>(collection: string): Promise<T[]> {
  return handle<T[]>(await fetch(`/api/${collection}`, { cache: "no-store" }));
}
async function directCreate<T>(collection: string, data: Partial<T>): Promise<T> {
  return handle<T>(await fetch(`/api/${collection}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  }));
}
async function directUpdate<T>(collection: string, id: string, patch: Partial<T>): Promise<T> {
  return handle<T>(await fetch(`/api/${collection}/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
  }));
}
async function directDelete(collection: string, id: string): Promise<void> {
  await handle<{ ok: boolean }>(await fetch(`/api/${collection}/${id}`, { method: "DELETE" }));
}
async function directReplace<T>(collection: string, rows: T[]): Promise<T[]> {
  return handle<T[]>(await fetch(`/api/${collection}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rows),
  }));
}

// ── Public API ───────────────────────────────────────────────────────────────
export async function listCollection<T>(collection: string): Promise<T[]> {
  return isDirect() ? directList<T>(collection) : ((await listLocal(collection)) as unknown as T[]);
}

export async function createItem<T>(collection: string, data: Partial<T>): Promise<T> {
  return isDirect() ? directCreate<T>(collection, data) : ((await createLocal(collection, data as Record<string, unknown>)) as unknown as T);
}

export async function updateItem<T>(collection: string, id: string, patch: Partial<T>): Promise<T> {
  return isDirect() ? directUpdate<T>(collection, id, patch) : ((await updateLocal(collection, id, patch as Record<string, unknown>)) as unknown as T);
}

export async function deleteItem(collection: string, id: string): Promise<void> {
  if (isDirect()) await directDelete(collection, id);
  else await deleteLocal(collection, id);
}

export async function replaceCollection<T>(collection: string, rows: T[]): Promise<T[]> {
  return isDirect() ? directReplace<T>(collection, rows) : ((await replaceLocal(collection, rows as unknown as Row[])) as unknown as T[]);
}

// Reset the cloud database to the seed baseline. In offline mode also pull the
// fresh copy into the local cache.
export async function resetDatabase(): Promise<void> {
  if (isDirect()) await handle<{ ok: boolean }>(await fetch(`/api/reset`, { method: "POST" }));
  else await resetAll();
}
