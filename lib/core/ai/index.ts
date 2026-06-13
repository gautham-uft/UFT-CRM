// ─────────────────────────────────────────────────────────────────────────
// Core — AI modules.
//
// Provider-agnostic: getAi(config) builds a Summarizer backed by the configured
// provider (Gemini / OpenAI-compatible / Anthropic). The Admin Panel persists
// the provider/model/key; routes load it and pass it here. With no usable key,
// a stub is returned. The model itself is reached via raw fetch (no SDK),
// consistent with the rest of the app.
// ─────────────────────────────────────────────────────────────────────────

import type { AiConfig } from "@/lib/core/settings";

export type DocumentRef = { id: string; name: string; type: string; content?: string };

export type LeadSummaryInput = {
  first_name?: string; last_name?: string; email?: string; phone?: string;
  company_name?: string; source?: string; status?: string;
  date_of_birth?: string; address?: string; linkedin?: string;
  profile?: {
    industry?: string; company_size?: string; website?: string; open_roles?: string;
    poc_name?: string; poc_title?: string; naukri_status?: string;
    [k: string]: unknown;
  };
  // Extra/personal info pulled from the hidden dump (hobbies, favourites, etc.).
  extra?: Record<string, unknown>;
};

export type SummaryKind = "contact" | "account";

export interface Summarizer {
  summarizeDocument(doc: DocumentRef): Promise<string>;
  summarizeLead(lead: LeadSummaryInput): Promise<string>;
  summarizeEntity(kind: SummaryKind, facts: Record<string, string>, extra?: Record<string, unknown>): Promise<string>;
}

export interface AiModules {
  summarizer: Summarizer;
}

import { getStubAi } from "./stub";
import { resolveAi, buildSummarizer } from "./provider";

// Build the AI modules from the admin config (falling back to env keys). Returns
// the stub when no provider key is available.
export function getAi(config?: AiConfig): AiModules {
  const resolved = resolveAi(config);
  if (!resolved) return getStubAi();
  return { summarizer: buildSummarizer(resolved) };
}
