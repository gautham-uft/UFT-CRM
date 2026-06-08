// ─────────────────────────────────────────────────────────────────────────
// JSON "database" for the demo — JSONBin.io backed.
//
// Server-only module. There are two stores:
//
//   1. data/crm-seed.json  — the PERSISTENT baseline. Committed to the repo and
//      imported at build time; NEVER written to at runtime. Holds the canonical
//      starting data (leads, users, roles, pipeline stages).
//
//   2. A JSONBin.io bin     — the RUNTIME working database. Every read/write
//      goes through it, so data is durable and shared across all clients/server
//      instances (works on Vercel, where the filesystem is read-only/ephemeral).
//      The bin is prefilled with the baseline. POST /api/reset clears it and
//      copies the seed back in as a fresh starting point.
//
// Credentials are read from environment variables (server-side only — never
// exposed to the browser):
//   JSONBIN_BIN_ID      — the bin's id
//   JSONBIN_ACCESS_KEY  — the bin's X-Access-Key
// Locally these live in .env.local; on Vercel set them in
// Project Settings → Environment Variables. See .env.example for the template.
// ─────────────────────────────────────────────────────────────────────────

import crypto from "crypto";

import { mockPipelineStages } from "./mock-data";
// File 1: the persistent baseline. Imported so it ships to production.
import seedSnapshot from "../data/crm-seed.json";

// ── Where the data lives (JSONBin.io) ──────────────────────────────────────

const BIN_ID     = process.env.JSONBIN_BIN_ID     ?? "";
const ACCESS_KEY = process.env.JSONBIN_ACCESS_KEY ?? "";
const BIN_URL    = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

const authHeaders = { "Content-Type": "application/json", "X-Access-Key": ACCESS_KEY };

function assertConfigured() {
  if (!BIN_ID || !ACCESS_KEY) {
    throw new Error(
      "JSONBin is not configured. Set JSONBIN_BIN_ID and JSONBIN_ACCESS_KEY in " +
      ".env.local (local) or the Vercel project environment variables. See .env.example.",
    );
  }
}

// ── Collections ───────────────────────────────────────────────────────────

export const COLLECTIONS = [
  "leads",
  "contacts",
  "accounts",
  "deals",
  "products",
  "users",
  "roles",
  "activities",
  "followUps",
  "calendarEvents",
  "pipelineStages",
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

export function isCollection(name: string): name is CollectionName {
  return (COLLECTIONS as readonly string[]).includes(name);
}

// A row is any object that carries a string `id`.
type Row = { id: string; [key: string]: unknown };
type DB = Record<CollectionName, Row[]>;

// ── Seed data ───────────────────────────────────────────────────────────--

// For now only the Leads queue ships with data. Every other collection starts
// EMPTY so the sales workflow (approve a lead, log a callback / response, watch
// follow-ups and activities appear, etc.) can be demoed from a clean slate.
//
// pipelineStages is structural config (the Kanban columns + dashboard stages),
// not "data", so it is kept — emptying it would break the Deals board.
const SEED_LEADS: Row[] = [
  { id: "1",  first_name: "James",   last_name: "Carter",    email: "james.carter@techwave.io",    phone: "+1 555-0101",      company_name: "TechWave Inc.",      source: "n8n_apify",   status: "new",       created_at: "2026-05-20" },
  { id: "2",  first_name: "Priya",   last_name: "Nair",      email: "priya.nair@cloudbase.com",    phone: "+1 555-0102",      company_name: "CloudBase Ltd.",     source: "manual_ocr",  status: "new",       created_at: "2026-05-21" },
  { id: "3",  first_name: "Marcus",  last_name: "Webb",      email: "marcus.webb@finsolve.net",    phone: "+1 555-0103",      company_name: "FinSolve",           source: "inbound_web", status: "new",       created_at: "2026-05-22" },
  { id: "4",  first_name: "Sofia",   last_name: "Reyes",     email: "sofia.reyes@nexgen.io",       phone: "+1 555-0104",      company_name: "NexGen AI",          source: "n8n_apify",   status: "new",       created_at: "2026-05-22" },
  { id: "5",  first_name: "Daniel",  last_name: "Kim",       email: "daniel.kim@vertexdata.co",    phone: "+1 555-0105",      company_name: "Vertex Data",        source: "n8n_apify",   status: "new",       created_at: "2026-05-23" },
  { id: "6",  first_name: "Ananya",  last_name: "Gupta",     email: "ananya.gupta@innosoft.in",    phone: "+91 98000-12345",  company_name: "InnoSoft India",     source: "inbound_web", status: "new",       created_at: "2026-05-23" },
  { id: "7",  first_name: "Liam",    last_name: "O'Brien",   email: "liam.obrien@saasly.com",      phone: "+1 555-0107",      company_name: "SaaSly Corp",        source: "manual_ocr",  status: "new",       created_at: "2026-05-24" },
  { id: "8",  first_name: "Yuki",    last_name: "Tanaka",    email: "yuki.tanaka@jptech.jp",       phone: "+81 90-0011-2233", company_name: "JPTech",             source: "n8n_apify",   status: "new",       created_at: "2026-05-25" },
  { id: "9",  first_name: "Emma",    last_name: "Johnson",   email: "emma.johnson@brightpath.io",  phone: "+1 555-0109",      company_name: "BrightPath Systems", source: "inbound_web", status: "new",       created_at: "2026-05-25" },
  { id: "10", first_name: "Carlos",  last_name: "Mendez",    email: "carlos.mendez@novasoft.io",   phone: "+34 600-112233",   company_name: "NovaSoft Labs",      source: "n8n_apify",   status: "new",       created_at: "2026-05-26" },
  { id: "11", first_name: "Fatima",  last_name: "Al-Sayed",  email: "fatima.alsayed@desertcloud.ae", phone: "+971 50-1234567", company_name: "DesertCloud",      source: "manual_ocr",  status: "new",       created_at: "2026-05-27" },
  { id: "12", first_name: "Wei",     last_name: "Chen",      email: "wei.chen@sinoanalytics.cn",   phone: "+86 138-0011-2233", company_name: "Sino Analytics",    source: "n8n_apify",   status: "new",       created_at: "2026-05-28" },
  { id: "13", first_name: "Olivia",  last_name: "Brown",     email: "olivia.brown@northwind.com",  phone: "+1 555-0113",      company_name: "Northwind Retail",   source: "inbound_web", status: "new",       created_at: "2026-05-29" },
  { id: "14", first_name: "Raj",     last_name: "Patel",     email: "raj.patel@quantumlog.in",     phone: "+91 99887-76655",  company_name: "Quantum Logistics",  source: "n8n_apify",   status: "new",       created_at: "2026-05-30" },
  { id: "15", first_name: "Hannah",  last_name: "Müller",    email: "hannah.mueller@berlinbyte.de", phone: "+49 30-1234567",  company_name: "BerlinByte GmbH",    source: "manual_ocr",  status: "new",       created_at: "2026-05-31" },
  { id: "16", first_name: "Lucas",   last_name: "Silva",     email: "lucas.silva@amazoniatech.br", phone: "+55 11-91234-5678", company_name: "Amazonia Tech",     source: "inbound_web", status: "new",       created_at: "2026-06-01" },
  { id: "17", first_name: "Grace",   last_name: "Okafor",    email: "grace.okafor@lagosfintech.ng", phone: "+234 80-1234-5678", company_name: "Lagos FinTech",    source: "n8n_apify",   status: "new",       created_at: "2026-06-02" },
  { id: "18", first_name: "Noah",    last_name: "Williams",  email: "noah.williams@summithealth.com", phone: "+1 555-0118",   company_name: "Summit Health",      source: "inbound_web", status: "new",       created_at: "2026-06-03" },
  { id: "19", first_name: "Aisha",   last_name: "Khan",      email: "aisha.khan@meridiansol.pk",   phone: "+92 300-1234567",  company_name: "Meridian Solutions", source: "manual_ocr",  status: "new",       created_at: "2026-06-03" },
  { id: "20", first_name: "Tom",     last_name: "Anderson",  email: "tom.anderson@peakscale.com",  phone: "+1 555-0120",      company_name: "PeakScale",          source: "n8n_apify",   status: "new",       created_at: "2026-06-04" },
];

function buildSeed(): DB {
  // Clone the persistent seed (data/crm-seed.json) — this is what every app
  // open and /api/reset copies into the runtime file. Fall back to the inline
  // defaults for any collection the seed is missing.
  const snap = seedSnapshot as unknown as Partial<Record<CollectionName, Row[]>>;
  const pick = (name: CollectionName, fallback: Row[]): Row[] =>
    structuredClone(Array.isArray(snap[name]) ? (snap[name] as Row[]) : fallback);
  return {
    leads: pick("leads", SEED_LEADS),
    contacts: pick("contacts", []),
    accounts: pick("accounts", []),
    deals: pick("deals", []),
    products: pick("products", []),
    users: pick("users", []),
    roles: pick("roles", []),
    activities: pick("activities", []),
    followUps: pick("followUps", []),
    calendarEvents: pick("calendarEvents", []),
    pipelineStages: pick("pipelineStages", mockPipelineStages as unknown as Row[]),
  };
}

// ── Bin access (serialized) ─────────────────────────────────────────────--

// All writes go through this promise chain so concurrent requests in the same
// instance can't clobber each other's read-modify-write cycle. (Across separate
// serverless instances there is no global lock — fine for a demo.)
let writeQueue: Promise<unknown> = Promise.resolve();

// True once we've initialized an empty bin with the seed (per server instance).
let binBootstrapped = false;

// Read the latest bin contents, backfilling any missing collection from the
// seed so the app never crashes on a partial bin.
async function readDB(): Promise<DB> {
  assertConfigured();
  const res = await fetch(`${BIN_URL}/latest`, { headers: authHeaders, cache: "no-store" });
  if (!res.ok) throw new Error(`JSONBin read failed (${res.status}): ${await res.text().catch(() => "")}`);
  const json = (await res.json()) as { record?: unknown };
  const record = (json.record && typeof json.record === "object" ? json.record : {}) as Partial<DB>;
  // "Empty" = the bin holds none of our collections at all (fresh / uninitialized).
  // A bin that already has data — even if it differs from the local copy — is
  // NOT re-seeded; that mismatch surfaces as the indicator for a manual sync.
  const wasEmpty = !COLLECTIONS.some((name) => Array.isArray(record[name]));
  const parsed: Partial<DB> = { ...record };
  const seed = buildSeed();
  for (const name of COLLECTIONS) {
    if (!Array.isArray(parsed[name])) parsed[name] = seed[name];
  }
  // Only a brand-new / empty bin (e.g. a fresh Vercel bin) gets seeded once, so
  // the cloud becomes the live persistent store. Fire-and-forget; retry on fail.
  if (wasEmpty && !binBootstrapped) {
    binBootstrapped = true;
    writeDB(parsed as DB).catch(() => {
      binBootstrapped = false;
    });
  }
  return parsed as DB;
}

// Overwrite the entire bin. X-Bin-Versioning:false keeps a single live version
// rather than accumulating one per write.
async function writeDB(db: DB): Promise<void> {
  assertConfigured();
  const res = await fetch(BIN_URL, {
    method: "PUT",
    headers: { ...authHeaders, "X-Bin-Versioning": "false" },
    body: JSON.stringify(db),
  });
  if (!res.ok) throw new Error(`JSONBin write failed (${res.status}): ${await res.text().catch(() => "")}`);
}

// Run a read-modify-write transaction with exclusive access (per instance).
function transaction<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const db = await readDB();
    const result = await fn(db);
    await writeDB(db);
    return result;
  };
  const next = writeQueue.then(run, run);
  // Keep the queue alive even if this transaction rejects.
  writeQueue = next.catch(() => undefined);
  return next;
}

// ── Public API ────────────────────────────────────────────────────────────

// Whole-database read — used by the offline-first client to pull the entire
// cloud snapshot in one round trip (and to compare against its local copy).
export async function getDB(): Promise<DB> {
  return readDB();
}

// Whole-database overwrite — used by the "Local → Cloud" sync to push the
// client's offline copy back to the bin. Missing collections fall back to the
// seed so the document always stays well-formed.
export async function putDB(input: Record<string, unknown>): Promise<DB> {
  const seed = buildSeed();
  const next = {} as DB;
  for (const name of COLLECTIONS) {
    const v = input[name];
    next[name] = Array.isArray(v) ? (v as Row[]) : seed[name];
  }
  const run = () => writeDB(next).then(() => next);
  const queued = writeQueue.then(run, run);
  writeQueue = queued.catch(() => undefined);
  return queued;
}

export async function getAll(collection: CollectionName): Promise<Row[]> {
  const db = await readDB();
  return db[collection];
}

export async function getOne(collection: CollectionName, id: string): Promise<Row | undefined> {
  const db = await readDB();
  return db[collection].find((row) => row.id === id);
}

export async function createOne(
  collection: CollectionName,
  data: Record<string, unknown>,
): Promise<Row> {
  return transaction((db) => {
    const id = typeof data.id === "string" && data.id ? data.id : crypto.randomUUID();
    const row: Row = { ...data, id };
    db[collection].push(row);
    return row;
  });
}

export async function updateOne(
  collection: CollectionName,
  id: string,
  patch: Record<string, unknown>,
): Promise<Row | undefined> {
  return transaction((db) => {
    const idx = db[collection].findIndex((row) => row.id === id);
    if (idx === -1) return undefined;
    // Never let the id be overwritten by the patch body.
    const { id: _ignored, ...rest } = patch;
    void _ignored;
    db[collection][idx] = { ...db[collection][idx], ...rest, id };
    return db[collection][idx];
  });
}

export async function deleteOne(collection: CollectionName, id: string): Promise<boolean> {
  return transaction((db) => {
    const before = db[collection].length;
    db[collection] = db[collection].filter((row) => row.id !== id);
    return db[collection].length < before;
  });
}

// Replace an entire collection (used for bulk reorders / saves).
export async function replaceAll(collection: CollectionName, rows: Row[]): Promise<Row[]> {
  return transaction((db) => {
    db[collection] = rows.map((r) => ({
      ...r,
      id: typeof r.id === "string" && r.id ? r.id : crypto.randomUUID(),
    }));
    return db[collection];
  });
}

// Reset: clear the online bin and copy the persistent seed back in as a fresh
// starting point. Overwrites unconditionally (no read), so it recovers even if
// the bin is empty or malformed. Restores the canonical baseline (leads, users,
// roles, pipeline stages) and drops everything created during the session.
export async function resetDB(): Promise<void> {
  const run = () => writeDB(buildSeed());
  const next = writeQueue.then(run, run);
  writeQueue = next.catch(() => undefined);
  return next;
}
