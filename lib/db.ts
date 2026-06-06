// ─────────────────────────────────────────────────────────────────────────
// Local JSON "database" for the demo.
//
// This is a server-only module. It persists all CRM data to a single JSON
// file on disk (data/crm-db.json) so that anything stakeholders create / edit
// / delete in the UI survives reloads, navigation, and server restarts.
//
// On first run the file is seeded from lib/mock-data.ts. Delete the file (or
// POST /api/reset) to start fresh.
// ─────────────────────────────────────────────────────────────────────────

import { promises as fs } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

import { mockPipelineStages } from "./mock-data";
// The committed snapshot doubles as the seed that ships to production.
import seedSnapshot from "../data/crm-db.json";

// ── Where the data lives ──────────────────────────────────────────────────

// Most serverless hosts (Vercel included) make the project filesystem read-only
// at runtime — only the OS temp dir is writable. So locally we persist to ./data
// (survives restarts), and on Vercel we fall back to a writable temp location.
//
// IMPORTANT: that temp dir is per-instance and ephemeral on Vercel. Data created
// at runtime resets on cold starts and is NOT shared across instances. That's
// fine for checking functionality; use a hosted DB for durable, shared data.
const WRITABLE_FS = !process.env.VERCEL;
const DATA_DIR = WRITABLE_FS ? path.join(process.cwd(), "data") : path.join(os.tmpdir(), "uft-crm");
const DB_FILE = path.join(DATA_DIR, "crm-db.json");

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
  { id: "2",  first_name: "Priya",   last_name: "Nair",      email: "priya.nair@cloudbase.com",    phone: "+1 555-0102",      company_name: "CloudBase Ltd.",     source: "manual_ocr",  status: "reviewing", created_at: "2026-05-21" },
  { id: "3",  first_name: "Marcus",  last_name: "Webb",      email: "marcus.webb@finsolve.net",    phone: "+1 555-0103",      company_name: "FinSolve",           source: "inbound_web", status: "new",       created_at: "2026-05-22" },
  { id: "4",  first_name: "Sofia",   last_name: "Reyes",     email: "sofia.reyes@nexgen.io",       phone: "+1 555-0104",      company_name: "NexGen AI",          source: "n8n_apify",   status: "new",       created_at: "2026-05-22" },
  { id: "5",  first_name: "Daniel",  last_name: "Kim",       email: "daniel.kim@vertexdata.co",    phone: "+1 555-0105",      company_name: "Vertex Data",        source: "n8n_apify",   status: "new",       created_at: "2026-05-23" },
  { id: "6",  first_name: "Ananya",  last_name: "Gupta",     email: "ananya.gupta@innosoft.in",    phone: "+91 98000-12345",  company_name: "InnoSoft India",     source: "inbound_web", status: "new",       created_at: "2026-05-23" },
  { id: "7",  first_name: "Liam",    last_name: "O'Brien",   email: "liam.obrien@saasly.com",      phone: "+1 555-0107",      company_name: "SaaSly Corp",        source: "manual_ocr",  status: "new",       created_at: "2026-05-24" },
  { id: "8",  first_name: "Yuki",    last_name: "Tanaka",    email: "yuki.tanaka@jptech.jp",       phone: "+81 90-0011-2233", company_name: "JPTech",             source: "n8n_apify",   status: "reviewing", created_at: "2026-05-25" },
  { id: "9",  first_name: "Emma",    last_name: "Johnson",   email: "emma.johnson@brightpath.io",  phone: "+1 555-0109",      company_name: "BrightPath Systems", source: "inbound_web", status: "new",       created_at: "2026-05-25" },
  { id: "10", first_name: "Carlos",  last_name: "Mendez",    email: "carlos.mendez@novasoft.io",   phone: "+34 600-112233",   company_name: "NovaSoft Labs",      source: "n8n_apify",   status: "new",       created_at: "2026-05-26" },
  { id: "11", first_name: "Fatima",  last_name: "Al-Sayed",  email: "fatima.alsayed@desertcloud.ae", phone: "+971 50-1234567", company_name: "DesertCloud",      source: "manual_ocr",  status: "new",       created_at: "2026-05-27" },
  { id: "12", first_name: "Wei",     last_name: "Chen",      email: "wei.chen@sinoanalytics.cn",   phone: "+86 138-0011-2233", company_name: "Sino Analytics",    source: "n8n_apify",   status: "reviewing", created_at: "2026-05-28" },
  { id: "13", first_name: "Olivia",  last_name: "Brown",     email: "olivia.brown@northwind.com",  phone: "+1 555-0113",      company_name: "Northwind Retail",   source: "inbound_web", status: "new",       created_at: "2026-05-29" },
  { id: "14", first_name: "Raj",     last_name: "Patel",     email: "raj.patel@quantumlog.in",     phone: "+91 99887-76655",  company_name: "Quantum Logistics",  source: "n8n_apify",   status: "new",       created_at: "2026-05-30" },
  { id: "15", first_name: "Hannah",  last_name: "Müller",    email: "hannah.mueller@berlinbyte.de", phone: "+49 30-1234567",  company_name: "BerlinByte GmbH",    source: "manual_ocr",  status: "new",       created_at: "2026-05-31" },
  { id: "16", first_name: "Lucas",   last_name: "Silva",     email: "lucas.silva@amazoniatech.br", phone: "+55 11-91234-5678", company_name: "Amazonia Tech",     source: "inbound_web", status: "new",       created_at: "2026-06-01" },
  { id: "17", first_name: "Grace",   last_name: "Okafor",    email: "grace.okafor@lagosfintech.ng", phone: "+234 80-1234-5678", company_name: "Lagos FinTech",    source: "n8n_apify",   status: "new",       created_at: "2026-06-02" },
  { id: "18", first_name: "Noah",    last_name: "Williams",  email: "noah.williams@summithealth.com", phone: "+1 555-0118",   company_name: "Summit Health",      source: "inbound_web", status: "reviewing", created_at: "2026-06-03" },
  { id: "19", first_name: "Aisha",   last_name: "Khan",      email: "aisha.khan@meridiansol.pk",   phone: "+92 300-1234567",  company_name: "Meridian Solutions", source: "manual_ocr",  status: "new",       created_at: "2026-06-03" },
  { id: "20", first_name: "Tom",     last_name: "Anderson",  email: "tom.anderson@peakscale.com",  phone: "+1 555-0120",      company_name: "PeakScale",          source: "n8n_apify",   status: "new",       created_at: "2026-06-04" },
];

function buildSeed(): DB {
  // Prefer the committed snapshot (data/crm-db.json) so whatever you commit is
  // what ships and what /api/reset restores. Fall back to the inline defaults
  // for any collection the snapshot is missing.
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

// ── File access (serialized) ────────────────────────────────────────────--

// All writes go through this promise chain so concurrent requests can't
// clobber each other's read-modify-write cycle.
let writeQueue: Promise<unknown> = Promise.resolve();

async function ensureFile(): Promise<void> {
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(buildSeed(), null, 2), "utf8");
  }
}

async function readDB(): Promise<DB> {
  await ensureFile();
  const raw = await fs.readFile(DB_FILE, "utf8");
  const parsed = JSON.parse(raw) as Partial<DB>;
  // Backfill any collection missing from an older file so the app never
  // crashes on a stale db.json.
  const seed = buildSeed();
  for (const name of COLLECTIONS) {
    if (!Array.isArray(parsed[name])) parsed[name] = seed[name];
  }
  return parsed as DB;
}

async function writeDB(db: DB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

// Run a read-modify-write transaction with exclusive access.
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

// Wipe the file and re-seed from mock data.
export async function resetDB(): Promise<void> {
  await transaction((db) => {
    const seed = buildSeed();
    for (const name of COLLECTIONS) db[name] = seed[name];
  });
}

// Reset everything created during a session but keep the Leads queue exactly as
// it is. Every other data collection is emptied; the structural pipelineStages
// config is preserved. (If leads were somehow wiped, fall back to the seed.)
export async function resetKeepLeads(): Promise<void> {
  await transaction((db) => {
    if (!Array.isArray(db.leads) || db.leads.length === 0) {
      db.leads = structuredClone(SEED_LEADS);
    }
    db.contacts = [];
    db.accounts = [];
    db.deals = [];
    db.products = [];
    db.users = [];
    db.roles = [];
    db.activities = [];
    db.followUps = [];
    db.calendarEvents = [];
    db.pipelineStages = structuredClone(mockPipelineStages as unknown as Row[]);
  });
}
