// One-time migration: pull the legacy JSONBin record and load every collection
// into PostgreSQL. Safe to re-run — each collection is truncated then refilled
// from the bin (the bin is read-only here; it is never written).
//
//   node scripts/migrate-jsonbin-to-pg.mjs
//
// Reads DATABASE_URL, JSONBIN_BIN_ID and JSONBIN_ACCESS_KEY from .env.local.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pkg from "pg";

const { Pool } = pkg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal .env.local parser: strips quotes and un-escapes "\$" (the JSONBin key
// is escaped that way so Next's loader keeps it literal).
function loadEnv() {
  const env = {};
  let raw = "";
  try {
    raw = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
  } catch {
    return env;
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[m[1]] = val.replace(/\\\$/g, "$");
  }
  return env;
}

const COLLECTIONS = [
  "leads", "contacts", "accounts", "deals", "products", "users", "roles",
  "activities", "followUps", "calendarEvents", "pipelineStages", "leadRequests",
  "notes", "meetingInvites", "scoutRequests", "documents",
];

const env = { ...loadEnv(), ...process.env };
const { DATABASE_URL, JSONBIN_BIN_ID, JSONBIN_ACCESS_KEY } = env;

if (!DATABASE_URL) { console.error("✗ DATABASE_URL not set"); process.exit(1); }
if (!JSONBIN_BIN_ID || !JSONBIN_ACCESS_KEY) { console.error("✗ JSONBIN_BIN_ID / JSONBIN_ACCESS_KEY not set"); process.exit(1); }

async function fetchBin() {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
    headers: { "X-Access-Key": JSONBIN_ACCESS_KEY },
  });
  if (!res.ok) throw new Error(`JSONBin read failed (${res.status}): ${await res.text().catch(() => "")}`);
  const json = await res.json();
  return json.record && typeof json.record === "object" ? json.record : {};
}

async function main() {
  console.log("→ Fetching JSONBin record…");
  const record = await fetchBin();

  const pool = new Pool({ connectionString: DATABASE_URL, max: 5 });
  const client = await pool.connect();
  try {
    console.log("→ Ensuring tables exist…");
    for (const name of COLLECTIONS) {
      await client.query(`CREATE TABLE IF NOT EXISTS "${name}" (id TEXT PRIMARY KEY, data JSONB NOT NULL, seq BIGSERIAL);`);
    }

    await client.query("BEGIN");
    let grand = 0;
    for (const name of COLLECTIONS) {
      const rows = Array.isArray(record[name]) ? record[name] : [];
      await client.query(`TRUNCATE "${name}" RESTART IDENTITY;`);
      let n = 0;
      for (const r of rows) {
        const id = (r && typeof r.id === "string" && r.id) ? r.id : crypto.randomUUID();
        const row = { ...r, id };
        await client.query(`INSERT INTO "${name}" (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;`, [id, row]);
        n++;
      }
      grand += n;
      console.log(`   ${name.padEnd(16)} ${n} rows`);
    }
    await client.query("COMMIT");
    console.log(`✓ Migrated ${grand} rows across ${COLLECTIONS.length} collections into Postgres.`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => { console.error("✗ Migration failed:", err.message); process.exit(1); });
