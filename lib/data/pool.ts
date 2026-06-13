// ─────────────────────────────────────────────────────────────────────────
// Data layer: PostgreSQL connection pools (server-only).
//
// Two databases:
//   • WORKING    (DATABASE_URL, uft_crm)            — the live data.
//   • PERSISTENT (PERSISTENT_DATABASE_URL,
//     uft_crm_persistent)                            — a saved baseline.
// Pools are singletons across dev hot-reloads via globalThis.
// ─────────────────────────────────────────────────────────────────────────

import { Pool } from "pg";
import { COLLECTIONS, type CollectionName } from "@/lib/contracts/collections";

const globalForPg = globalThis as unknown as {
  __uftPgWorking?: Pool;
  __uftPgPersistent?: Pool;
  __uftSchemaReady?: WeakMap<Pool, Promise<void>>;
};

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "Database is not configured. Set DATABASE_URL in .env.local " +
      "(e.g. postgresql://postgres:PASSWORD@localhost:5432/uft_crm). See .env.example.",
    );
  }
  if (!globalForPg.__uftPgWorking) {
    globalForPg.__uftPgWorking = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
  }
  return globalForPg.__uftPgWorking;
}

// The persistent baseline pool. Returns null when PERSISTENT_DATABASE_URL is
// unset — callers treat that as "reset/sync unavailable".
export function getPersistentPool(): Pool | null {
  if (!process.env.PERSISTENT_DATABASE_URL) return null;
  if (!globalForPg.__uftPgPersistent) {
    globalForPg.__uftPgPersistent = new Pool({ connectionString: process.env.PERSISTENT_DATABASE_URL, max: 5 });
  }
  return globalForPg.__uftPgPersistent;
}

export function persistentConfigured(): boolean {
  return !!process.env.PERSISTENT_DATABASE_URL;
}

// Whitelisted, quoted table identifier. Names come from the fixed COLLECTIONS
// list (alphanumeric camelCase) and callers validate via isCollection() first,
// so interpolating is safe; quoting preserves the camelCase.
export function table(name: CollectionName): string {
  if (!(COLLECTIONS as readonly string[]).includes(name)) throw new Error(`Unknown collection: ${name}`);
  return `"${name}"`;
}

// Schema init (lazy, memoized per pool). Creates any missing tables on first
// use. No DDL at import time, so `next build` never needs a live database.
export function ensureSchema(pool: Pool): Promise<void> {
  if (!globalForPg.__uftSchemaReady) globalForPg.__uftSchemaReady = new WeakMap();
  const memo = globalForPg.__uftSchemaReady;
  let ready = memo.get(pool);
  if (!ready) {
    ready = (async () => {
      const stmts = COLLECTIONS.map(
        (name) =>
          `CREATE TABLE IF NOT EXISTS ${table(name)} (` +
          `id TEXT PRIMARY KEY, data JSONB NOT NULL, seq BIGSERIAL);`,
      );
      await pool.query(stmts.join("\n"));
    })().catch((err) => {
      memo.delete(pool); // allow a later request to retry
      throw err;
    });
    memo.set(pool, ready);
  }
  return ready;
}
