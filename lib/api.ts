// Offline-first data client.
//
// Reads are served from the local copy (localStorage) for instant display;
// writes update the local copy AND mirror to the cloud bin. The actual logic
// lives in lib/sync-store; this module just preserves the original
// listCollection / createItem / … signatures the app already uses.

import {
  listLocal,
  createLocal,
  updateLocal,
  deleteLocal,
  replaceLocal,
  resetAll,
  type Row,
} from "@/lib/sync-store";

export async function listCollection<T>(collection: string): Promise<T[]> {
  return (await listLocal(collection)) as unknown as T[];
}

export async function createItem<T>(collection: string, data: Partial<T>): Promise<T> {
  return (await createLocal(collection, data as Record<string, unknown>)) as unknown as T;
}

export async function updateItem<T>(collection: string, id: string, patch: Partial<T>): Promise<T> {
  return (await updateLocal(collection, id, patch as Record<string, unknown>)) as unknown as T;
}

export async function deleteItem(collection: string, id: string): Promise<void> {
  await deleteLocal(collection, id);
}

export async function replaceCollection<T>(collection: string, rows: T[]): Promise<T[]> {
  return (await replaceLocal(collection, rows as unknown as Row[])) as unknown as T[];
}

// Reset the cloud database to the seed baseline, then pull it into the local copy.
export async function resetDatabase(): Promise<void> {
  await resetAll();
}
