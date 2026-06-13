// ─────────────────────────────────────────────────────────────────────────
// Core — AI provider dispatch (Gemini / OpenAI-compatible / Anthropic).
//
// One generate(prompt) entry point per resolved config. Server-only; keys never
// reach the browser. Raw fetch (no SDK) to match the rest of the app and to
// accept arbitrary admin-supplied keys at runtime.
// ─────────────────────────────────────────────────────────────────────────

import type { AiConfig, AiProvider } from "@/lib/core/settings";
import type { Summarizer, LeadSummaryInput, SummaryKind, ActivityInput } from "./index";
import { dumpToPromptLines } from "@/lib/core/dump";

type Resolved = { provider: AiProvider; model: string; apiKey: string; baseUrl: string };

function envKey(p: AiProvider): string | undefined {
  if (p === "gemini") return process.env.GEMINI_API_KEY;
  if (p === "openai") return process.env.OPENAI_API_KEY;
  return process.env.ANTHROPIC_API_KEY;
}
function defaultModel(p: AiProvider): string {
  if (p === "gemini") return process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
  if (p === "openai") return "gpt-4o-mini";
  return "claude-opus-4-8";
}

// Resolve the active config: admin key wins, else the provider's env key. Null
// when no key is available anywhere (→ caller uses the stub).
export function resolveAi(cfg?: AiConfig): Resolved | null {
  const provider: AiProvider = cfg?.provider || "gemini";
  const apiKey = (cfg?.apiKey?.trim()) || envKey(provider) || "";
  if (!apiKey) return null;
  return {
    provider,
    model: (cfg?.model?.trim()) || defaultModel(provider),
    apiKey,
    baseUrl: (cfg?.baseUrl?.trim()) || "",
  };
}

const MAX_OUTPUT = 320;

async function generate(prompt: string, r: Resolved): Promise<string> {
  if (r.provider === "gemini") return generateGemini(prompt, r);
  if (r.provider === "openai") return generateOpenAI(prompt, r);
  return generateAnthropic(prompt, r);
}

async function generateGemini(prompt: string, r: Resolved): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${r.model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": r.apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: MAX_OUTPUT } }),
    });
  } catch { throw new Error("Could not reach the Gemini API."); }
  const data = (await res.json().catch(() => ({}))) as { candidates?: { content?: { parts?: { text?: string }[] } }[]; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message || `Gemini error (${res.status})`);
  const text = (data.candidates?.[0]?.content?.parts ?? []).map(p => p.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

async function generateOpenAI(prompt: string, r: Resolved): Promise<string> {
  const base = (r.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${r.apiKey}` },
      body: JSON.stringify({ model: r.model, max_tokens: MAX_OUTPUT, temperature: 0.4, messages: [{ role: "user", content: prompt }] }),
    });
  } catch { throw new Error("Could not reach the OpenAI-compatible API."); }
  const data = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message || `AI provider error (${res.status})`);
  const text = (data.choices?.[0]?.message?.content ?? "").trim();
  if (!text) throw new Error("The model returned an empty response.");
  return text;
}

async function generateAnthropic(prompt: string, r: Resolved): Promise<string> {
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": r.apiKey, "anthropic-version": "2023-06-01" },
      // No temperature/top_p — removed on current Claude models (would 400).
      body: JSON.stringify({ model: r.model, max_tokens: MAX_OUTPUT, messages: [{ role: "user", content: prompt }] }),
    });
  } catch { throw new Error("Could not reach the Anthropic API."); }
  const data = (await res.json().catch(() => ({}))) as { content?: { type?: string; text?: string }[]; stop_reason?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message || `Anthropic error (${res.status})`);
  if (data.stop_reason === "refusal") throw new Error("The model declined to generate this summary.");
  const text = (data.content ?? []).filter(b => b.type === "text").map(b => b.text ?? "").join("").trim();
  if (!text) throw new Error("Anthropic returned an empty response.");
  return text;
}

// ── Prompts ──

// Appended when the entity has dump (extra/personal) data: ask the model to weave
// it in and suggest a conversation starter. Empty string when there's none.
function personalSection(extra?: Record<string, unknown>): string {
  if (!extra) return "";
  const lines = dumpToPromptLines(extra);
  if (!lines) return "";
  return (
    "\n\nPersonal / extra details (from internal notes — use these to add a personal touch and " +
    "suggest a specific conversation starter or rapport-building angle, e.g. shared interests or hobbies):\n" +
    lines +
    "\n\nAdd one short extra sentence highlighting a personal detail and a way to break the ice."
  );
}

function leadPrompt(l: LeadSummaryInput): string {
  const p = l.profile ?? {};
  const facts = [
    `Name: ${[l.first_name, l.last_name].filter(Boolean).join(" ") || "Unknown"}`,
    l.company_name && `Company: ${l.company_name}`,
    l.email && `Email: ${l.email}`,
    l.phone && `Phone: ${l.phone}`,
    l.address && `Location: ${l.address}`,
    l.source && `Lead source: ${l.source}`,
    l.status && `Pipeline status: ${l.status}`,
    p.industry && `Industry: ${p.industry}`,
    p.company_size && `Company size: ${p.company_size}`,
    p.open_roles && `Open roles being hired: ${p.open_roles}`,
    p.poc_name && `Point of contact: ${p.poc_name}${p.poc_title ? `, ${p.poc_title}` : ""}`,
  ].filter(Boolean).join("\n");
  return (
    "You are a sales assistant for Unitforce Technologies (UFT), which provides manpower/recruitment, " +
    "AI, engineering, and software services to businesses. Write a concise professional summary " +
    "(2-3 sentences, plain prose, no bullet points, no preamble or sign-off) of the following sales " +
    "lead for an account manager. Cover who they are, their company and likely hiring/service need, " +
    "and a suggested next step. If information is sparse, keep it short and do NOT invent specifics.\n\n" +
    `Lead data:\n${facts}` + personalSection(l.extra)
  );
}

function entityPrompt(kind: SummaryKind, facts: Record<string, string>, extra?: Record<string, unknown>): string {
  const role = kind === "account" ? "company account" : "business contact";
  const lines = Object.entries(facts).filter(([, v]) => v && v.trim()).map(([k, v]) => `${k}: ${v}`).join("\n");
  return (
    `You are a sales assistant for Unitforce Technologies (UFT), which provides manpower/recruitment, ` +
    `AI, engineering, and software services to businesses. Write a concise professional summary ` +
    `(2-3 sentences, plain prose, no bullet points, no preamble or sign-off) of the following ${role} ` +
    `for an account manager. Cover who/what they are and a likely engagement angle or next step. ` +
    `If information is sparse, keep it short and do NOT invent specifics.\n\nDetails:\n${lines}` + personalSection(extra)
  );
}

// Digest of every interaction logged for an account / contact / lead (for an
// account, this aggregates the contacts, deals, and leads under it too). Produces
// a short engagement narrative + a suggested next step.
function activityPrompt(input: ActivityInput): string {
  const scope = input.kind === "account"
    ? "this account and the contacts, deals, and leads under it"
    : input.kind === "contact"
    ? "this contact and the deals they're on"
    : "this lead";
  const subjectLabel = input.kind === "account" ? "Account" : input.kind === "contact" ? "Contact" : "Lead";
  const contextLabel = input.kind === "account" ? "Industry" : "Company";

  const header = [
    `${subjectLabel}: ${input.subject}`,
    input.context && `${contextLabel}: ${input.context}`,
    `Total interactions: ${input.touches.length}`,
  ].filter(Boolean).join("\n");

  const log = input.touches.map(t => {
    const when = t.date ? t.date.slice(0, 10) : "";
    const kind = (t.type || "note").replace("call_log", "call");
    const parts = [when, kind, t.on && `on ${t.on}`, t.by && `by ${t.by}`].filter(Boolean).join(" · ");
    return `- ${parts}: ${t.description ?? ""}`.trim();
  }).join("\n");

  return (
    "You are a sales assistant for Unitforce Technologies (UFT), which provides manpower/recruitment, " +
    `AI, engineering, and software services to businesses. Below is the recent activity log for ${scope}, ` +
    "aggregating every call, email, note, and meeting logged. Write a concise digest (3-5 sentences, " +
    "plain prose, no bullet points, no preamble or sign-off) for an account manager. Cover: the overall " +
    "engagement level and momentum, the main themes or topics discussed, who is most active, and one " +
    "concrete suggested next step. Do NOT list the interactions one by one and do NOT invent details not present.\n\n" +
    `${header}\n\nActivity log (most recent first):\n${log}`
  );
}

export function buildSummarizer(r: Resolved): Summarizer {
  return {
    summarizeLead: (lead) => generate(leadPrompt(lead), r),
    summarizeEntity: (kind, facts, extra) => generate(entityPrompt(kind, facts, extra), r),
    summarizeActivity: (input) => generate(activityPrompt(input), r),
    // Documents store only a filename today — keep the placeholder.
    summarizeDocument: async () => "This content will be given by AI.",
  };
}
