// ─────────────────────────────────────────────────────────────────────────
// Core — Dump store.
//
// The "dump" is a catch-all for EXTRA, non-standard information about an entity
// (a lead/contact/account/…) — favourites, hobbies, personal notes, unmapped
// CSV columns, anything that doesn't fit a first-class field. It is never shown
// in the normal UI (hidden), is only surfaced in the Admin Panel, and is fed to
// the AI summarizer so summaries can mention personal details and suggest a
// conversation starter.
//
// One row per (entity_type, entity_id). Writes MERGE — existing keys are never
// dropped, so no information is ever lost. Transport-agnostic (uses a Repository).
// ─────────────────────────────────────────────────────────────────────────

import type { Repository } from "@/lib/data/repository";

export type DumpEntityType = "lead" | "contact" | "account" | "deal" | string;

export type DumpRecord = {
  id:          string;
  entity_type: DumpEntityType;
  entity_id:   string;
  entity_name: string;
  data:        Record<string, unknown>; // the extra info (the "json file")
  created_at:  string;
  updated_at:  string;
};

const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

function asDump(row: Record<string, unknown>): DumpRecord {
  return {
    id:          str(row.id),
    entity_type: str(row.entity_type),
    entity_id:   str(row.entity_id),
    entity_name: str(row.entity_name),
    data:        (row.data && typeof row.data === "object" ? row.data : {}) as Record<string, unknown>,
    created_at:  str(row.created_at),
    updated_at:  str(row.updated_at),
  };
}

// Find the dump row for an entity (or undefined).
export async function getDump(repo: Repository, entityType: string, entityId: string): Promise<DumpRecord | undefined> {
  const rows = (await repo.list("dump")) as unknown as Record<string, unknown>[];
  const found = rows.find(r => str(r.entity_type) === entityType && str(r.entity_id) === entityId);
  return found ? asDump(found) : undefined;
}

// Create or MERGE a dump for an entity. Existing keys are preserved; incoming
// keys are added/updated. Empty values in `extra` are skipped so we never wipe
// real data with blanks.
export async function upsertDump(
  repo: Repository,
  input: { entity_type: string; entity_id: string; entity_name: string; data: Record<string, unknown> },
  nowISO: string,
): Promise<DumpRecord | undefined> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input.data ?? {})) {
    if (v == null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    clean[k] = v;
  }
  if (Object.keys(clean).length === 0) return undefined;

  const existing = await getDump(repo, input.entity_type, input.entity_id);
  if (existing) {
    const merged = { ...existing.data, ...clean };
    const row = await repo.update("dump", existing.id, {
      entity_name: input.entity_name || existing.entity_name,
      data: merged,
      updated_at: nowISO,
    });
    return row ? asDump(row as Record<string, unknown>) : undefined;
  }
  const row = await repo.create("dump", {
    entity_type: input.entity_type,
    entity_id:   input.entity_id,
    entity_name: input.entity_name,
    data:        clean,
    created_at:  nowISO,
    updated_at:  nowISO,
  });
  return asDump(row as Record<string, unknown>);
}

// Render a dump's extra data as readable lines for an AI prompt.
export function dumpToPromptLines(data: Record<string, unknown>): string {
  return Object.entries(data)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => {
      const label = k.replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      const val = typeof v === "object" ? JSON.stringify(v) : String(v);
      return `${label}: ${val}`;
    })
    .join("\n");
}
