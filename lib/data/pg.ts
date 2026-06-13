// ─────────────────────────────────────────────────────────────────────────
// Data layer: PostgreSQL implementation of Repository (server-only).
//
// This is the data service's core — the ONLY place that issues SQL. Storage
// model: one table per collection, each row stored as
//   id TEXT PRIMARY KEY, data JSONB NOT NULL, seq BIGSERIAL
// `data` holds the full row object (including id); `seq` preserves insertion
// order so list reads come back in a stable order.
// ─────────────────────────────────────────────────────────────────────────

import crypto from "crypto";
import { type Pool, type PoolClient } from "pg";
import { COLLECTIONS, emptyDB, type CollectionName, type Row, type DB } from "@/lib/contracts/collections";
import { type Repository } from "@/lib/data/repository";
import { getPool, getPersistentPool, persistentConfigured, table, ensureSchema } from "@/lib/data/pool";

async function query<T extends Record<string, unknown>>(
  text: string,
  params: unknown[],
  pool: Pool,
): Promise<T[]> {
  await ensureSchema(pool);
  const res = await pool.query(text, params);
  return res.rows as T[];
}

async function transaction<T>(fn: (client: PoolClient) => Promise<T>, pool: Pool): Promise<T> {
  await ensureSchema(pool);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

// Read every collection from a pool into a plain DB object.
async function snapshotPool(pool: Pool): Promise<DB> {
  const entries = await Promise.all(
    COLLECTIONS.map(async (name) => {
      const rows = await query<{ data: Row }>(`SELECT data FROM ${table(name)} ORDER BY seq ASC;`, [], pool);
      return [name, rows.map((r) => r.data)] as const;
    }),
  );
  const db = emptyDB();
  for (const [name, rows] of entries) db[name] = rows;
  return db;
}

// Overwrite every collection in a pool from a plain DB object, in one
// transaction. Missing collections are emptied so the DB stays well-formed.
async function loadIntoPool(pool: Pool, input: Record<string, unknown>): Promise<void> {
  await transaction(async (client) => {
    for (const name of COLLECTIONS) {
      await client.query(`TRUNCATE ${table(name)} RESTART IDENTITY;`);
      const rows = Array.isArray(input[name]) ? (input[name] as Row[]) : [];
      for (const r of rows) {
        const id = typeof r.id === "string" && r.id ? r.id : crypto.randomUUID();
        const row = { ...r, id };
        await client.query(`INSERT INTO ${table(name)} (id, data) VALUES ($1, $2);`, [id, row]);
      }
    }
  }, pool);
}

function requirePersistent(): Pool {
  const pool = getPersistentPool();
  if (!pool) {
    throw new Error(
      "Persistent database is not configured. Set PERSISTENT_DATABASE_URL in .env.local " +
      "(e.g. postgresql://postgres:PASSWORD@localhost:5432/uft_crm_persistent).",
    );
  }
  return pool;
}

export class PgRepository implements Repository {
  async list(collection: CollectionName): Promise<Row[]> {
    const rows = await query<{ data: Row }>(`SELECT data FROM ${table(collection)} ORDER BY seq ASC;`, [], getPool());
    return rows.map((r) => r.data);
  }

  async get(collection: CollectionName, id: string): Promise<Row | undefined> {
    const rows = await query<{ data: Row }>(`SELECT data FROM ${table(collection)} WHERE id = $1;`, [id], getPool());
    return rows[0]?.data;
  }

  async create(collection: CollectionName, data: Record<string, unknown>): Promise<Row> {
    const id = typeof data.id === "string" && data.id ? data.id : crypto.randomUUID();
    const row: Row = { ...data, id };
    await query(`INSERT INTO ${table(collection)} (id, data) VALUES ($1, $2);`, [id, row], getPool());
    return row;
  }

  async update(collection: CollectionName, id: string, patch: Record<string, unknown>): Promise<Row | undefined> {
    // Never let the patch overwrite the id: shallow-merge the patch, then force
    // id back on. Mirrors `{ ...existing, ...patch, id }`.
    const { id: _ignored, ...rest } = patch;
    void _ignored;
    const rows = await query<{ data: Row }>(
      `UPDATE ${table(collection)} ` +
        `SET data = (data || $2::jsonb) || jsonb_build_object('id', $1::text) ` +
        `WHERE id = $1 RETURNING data;`,
      [id, JSON.stringify(rest)],
      getPool(),
    );
    return rows[0]?.data;
  }

  async remove(collection: CollectionName, id: string): Promise<boolean> {
    const rows = await query<{ id: string }>(`DELETE FROM ${table(collection)} WHERE id = $1 RETURNING id;`, [id], getPool());
    return rows.length > 0;
  }

  async replace(collection: CollectionName, rows: Row[]): Promise<Row[]> {
    const out = rows.map((r) => ({
      ...r,
      id: typeof r.id === "string" && r.id ? r.id : crypto.randomUUID(),
    }));
    await transaction(async (client) => {
      await client.query(`TRUNCATE ${table(collection)} RESTART IDENTITY;`);
      for (const row of out) {
        await client.query(`INSERT INTO ${table(collection)} (id, data) VALUES ($1, $2);`, [row.id, row]);
      }
    }, getPool());
    return out;
  }

  async snapshot(): Promise<DB> {
    return snapshotPool(getPool());
  }

  async load(input: Record<string, unknown>): Promise<DB> {
    await loadIntoPool(getPool(), input);
    return snapshotPool(getPool());
  }

  async persistentConfigured(): Promise<boolean> {
    return persistentConfigured();
  }

  async resetFromPersistent(): Promise<void> {
    const baseline = await snapshotPool(requirePersistent());
    await loadIntoPool(getPool(), baseline);
  }

  async saveToPersistent(): Promise<void> {
    const current = await snapshotPool(getPool());
    await loadIntoPool(requirePersistent(), current);
  }
}

// Singleton PgRepository (stateless, but avoids re-allocation).
const globalForRepo = globalThis as unknown as { __uftPgRepo?: PgRepository };
export function getPgRepository(): PgRepository {
  if (!globalForRepo.__uftPgRepo) globalForRepo.__uftPgRepo = new PgRepository();
  return globalForRepo.__uftPgRepo;
}
