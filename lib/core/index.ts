// ─────────────────────────────────────────────────────────────────────────
// Core layer — CRM domain logic + AI modules.
//
// Transport-agnostic: services depend only on the Repository interface
// (@/lib/data/repository) and pure contracts (@/lib/contracts). MUST NOT import
// `pg` or `next/*` — that keeps the core extractable into its own service.
//
// Exposed as namespaces to avoid cross-domain name collisions.
// ─────────────────────────────────────────────────────────────────────────

export * as enrichment from "./enrichment";
export * as jobs from "./jobs";
export * as calendar from "./calendar";
export * as emailTemplates from "./email/templates";
export * as email from "./email/send";
export * as scout from "./scout";
export * as meetings from "./meetings";
export * as ai from "./ai";
