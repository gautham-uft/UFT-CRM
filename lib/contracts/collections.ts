// ─────────────────────────────────────────────────────────────────────────
// Contracts: collections.
//
// PURE module — shared by the UI, the core layer, and the data layer. No I/O,
// no framework, no database driver. This is part of the public type surface
// (maps to a future @uft/contracts package).
// ─────────────────────────────────────────────────────────────────────────

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
  "leadRequests",
  "notes",
  "meetingInvites",
  "scoutRequests",
  "documents",
  "settings",
  "dump",
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

export function isCollection(name: string): name is CollectionName {
  return (COLLECTIONS as readonly string[]).includes(name);
}

// A row is any object that carries a string `id`.
export type Row = { id: string; [key: string]: unknown };

// A whole-database snapshot: every collection present as an array.
export type DB = Record<CollectionName, Row[]>;

// A well-formed, empty DB (every known collection present but empty).
export function emptyDB(): DB {
  const db = {} as DB;
  for (const name of COLLECTIONS) db[name] = [];
  return db;
}
