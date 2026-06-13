// ─────────────────────────────────────────────────────────────────────────
// Core — application settings (Admin Panel).
//
// A single row in the `settings` collection (id "app") holds the admin-chosen
// data vendors and the active AI model. Read server-side by the enrichment and
// AI routes so the choices actually drive behavior. Transport-agnostic (uses a
// Repository).
// ─────────────────────────────────────────────────────────────────────────

import type { Repository } from "@/lib/data/repository";

export const SETTINGS_ID = "app";

export type EnrichmentVendor = "apollo" | "hunter" | "pdl" | "serpapi";
export type AiProvider = "gemini" | "openai" | "anthropic";

export type AiConfig = {
  provider: AiProvider;
  model: string;     // blank → provider default
  apiKey: string;    // blank → fall back to the provider's env var
  baseUrl?: string;  // openai-compatible endpoints only
};

// A named AI model the admin has defined in the panel. The active one is mirrored
// onto `ai` (above) so the AI provider layer keeps reading a single config.
export type AiModel = {
  id:       string;
  name:     string;     // display label, e.g. "Gemini Flash (prod)"
  provider: AiProvider;
  model:    string;
  apiKey?:  string;
  baseUrl?: string;
};

export type AppSettings = {
  enrichment: Record<EnrichmentVendor, boolean>;
  ai: AiConfig;           // active model, flattened (drives the AI layer)
  models: AiModel[];      // admin-defined model library
  activeModelId: string;  // which entry in `models` is active ("" → none)
};

export function defaultSettings(): AppSettings {
  return {
    enrichment: { apollo: true, hunter: true, pdl: true, serpapi: true },
    ai: { provider: "gemini", model: "", apiKey: "", baseUrl: "" },
    models: [],
    activeModelId: "",
  };
}

const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const str = (v: unknown) => (typeof v === "string" ? v : "");

// Load settings, merging stored values over defaults so a partial/absent row is
// always well-formed.
export async function loadSettings(repo: Repository): Promise<AppSettings> {
  const d = defaultSettings();
  let row: Record<string, unknown> | undefined;
  try { row = (await repo.get("settings", SETTINGS_ID)) as Record<string, unknown> | undefined; } catch { row = undefined; }
  if (!row) return d;

  const e = (row.enrichment && typeof row.enrichment === "object" ? row.enrichment : {}) as Record<string, unknown>;
  const a = (row.ai && typeof row.ai === "object" ? row.ai : {}) as Record<string, unknown>;
  const provider = (["gemini", "openai", "anthropic"] as const).includes(a.provider as AiProvider) ? (a.provider as AiProvider) : d.ai.provider;

  const models = Array.isArray(row.models) ? (row.models as unknown[]).map(parseModel).filter((m): m is AiModel => m !== null) : [];

  return {
    enrichment: {
      apollo:  bool(e.apollo,  d.enrichment.apollo),
      hunter:  bool(e.hunter,  d.enrichment.hunter),
      pdl:     bool(e.pdl,     d.enrichment.pdl),
      serpapi: bool(e.serpapi, d.enrichment.serpapi),
    },
    ai: { provider, model: str(a.model), apiKey: str(a.apiKey), baseUrl: str(a.baseUrl) },
    models,
    activeModelId: str(row.activeModelId),
  };
}

function parseModel(v: unknown): AiModel | null {
  if (!v || typeof v !== "object") return null;
  const m = v as Record<string, unknown>;
  const provider = (["gemini", "openai", "anthropic"] as const).includes(m.provider as AiProvider) ? (m.provider as AiProvider) : "gemini";
  const id = str(m.id);
  if (!id) return null;
  return { id, name: str(m.name) || str(m.model) || "Model", provider, model: str(m.model), apiKey: str(m.apiKey), baseUrl: str(m.baseUrl) };
}

// The enrichment provider names (lib/enrichment) the admin has enabled.
export function enabledEnrichmentProviders(s: AppSettings): string[] {
  return (["apollo", "hunter", "pdl"] as const).filter(p => s.enrichment[p]);
}
