// ─────────────────────────────────────────────────────────────────────────
// Data layer: HTTP implementation of Repository (Seam B client).
//
// Talks to the Data API (app/api/internal/v1/data/**) over HTTP. This is what
// the core layer uses by default, so the data service is a genuine network
// boundary that can later live in a separate deployable — point DATA_API_URL at
// the remote host and nothing else changes.
//
//   DATA_API_URL    base origin of the Data API (default http://localhost:3000)
//   INTERNAL_API_KEY shared secret sent as the x-internal-key header
// ─────────────────────────────────────────────────────────────────────────

import type { CollectionName, Row, DB } from "@/lib/contracts/collections";
import type { Repository } from "@/lib/data/repository";

const BASE = (process.env.DATA_API_URL || "http://localhost:3000").replace(/\/$/, "");
const ROOT = `${BASE}/api/internal/v1/data`;

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.INTERNAL_API_KEY) h["x-internal-key"] = process.env.INTERNAL_API_KEY;
  return h;
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${ROOT}${path}`, {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Data API ${method} ${path} failed (${res.status}): ${detail}`);
  }
  // 204 / empty bodies → undefined.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export class HttpDataClient implements Repository {
  list(collection: CollectionName): Promise<Row[]> {
    return req<Row[]>("GET", `/${collection}`);
  }
  async get(collection: CollectionName, id: string): Promise<Row | undefined> {
    try {
      return await req<Row>("GET", `/${collection}/${encodeURIComponent(id)}`);
    } catch {
      return undefined;
    }
  }
  create(collection: CollectionName, data: Record<string, unknown>): Promise<Row> {
    return req<Row>("POST", `/${collection}`, data);
  }
  async update(collection: CollectionName, id: string, patch: Record<string, unknown>): Promise<Row | undefined> {
    try {
      return await req<Row>("PATCH", `/${collection}/${encodeURIComponent(id)}`, patch);
    } catch {
      return undefined;
    }
  }
  async remove(collection: CollectionName, id: string): Promise<boolean> {
    await req<{ ok: boolean }>("DELETE", `/${collection}/${encodeURIComponent(id)}`);
    return true;
  }
  replace(collection: CollectionName, rows: Row[]): Promise<Row[]> {
    return req<Row[]>("PUT", `/${collection}`, rows);
  }
  snapshot(): Promise<DB> {
    return req<DB>("GET", `/db`);
  }
  load(input: Record<string, unknown>): Promise<DB> {
    return req<DB>("PUT", `/db`, input);
  }
  async persistentConfigured(): Promise<boolean> {
    const { persistent } = await req<{ persistent: boolean }>("GET", `/admin`);
    return persistent;
  }
  async resetFromPersistent(): Promise<void> {
    await req("POST", `/admin`, { action: "reset" });
  }
  async saveToPersistent(): Promise<void> {
    await req("POST", `/admin`, { action: "save" });
  }
}
