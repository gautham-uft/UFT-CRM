// ─────────────────────────────────────────────────────────────────────────
// Data layer: the Repository interface (Seam B contract).
//
// This is the single contract the core layer depends on. Two implementations
// satisfy it:
//   • PgRepository  (lib/data/pg.ts)          — talks to PostgreSQL directly.
//   • HttpDataClient(lib/data/http-client.ts) — talks to the Seam B HTTP API.
// Core never imports either implementation — only this interface — so the data
// service can later be extracted to a separate deployable with no core changes.
// ─────────────────────────────────────────────────────────────────────────

import type { CollectionName, Row, DB } from "@/lib/contracts/collections";

export interface Repository {
  // ── Per-collection CRUD ──
  list(collection: CollectionName): Promise<Row[]>;
  get(collection: CollectionName, id: string): Promise<Row | undefined>;
  create(collection: CollectionName, data: Record<string, unknown>): Promise<Row>;
  update(collection: CollectionName, id: string, patch: Record<string, unknown>): Promise<Row | undefined>;
  remove(collection: CollectionName, id: string): Promise<boolean>;
  replace(collection: CollectionName, rows: Row[]): Promise<Row[]>;

  // ── Whole-database ──
  snapshot(): Promise<DB>;
  load(input: Record<string, unknown>): Promise<DB>;

  // ── Persistent baseline (reset / sync) ──
  persistentConfigured(): Promise<boolean>;
  resetFromPersistent(): Promise<void>; // clear working, copy persistent → working
  saveToPersistent(): Promise<void>;    // overwrite persistent with working
}
