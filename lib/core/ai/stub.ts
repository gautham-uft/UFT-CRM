// Stub AI implementation — no live model. Used when GEMINI_API_KEY is unset.

import type { AiModules, Summarizer } from "./index";

const stubSummarizer: Summarizer = {
  // The Database page shows this placeholder copy verbatim.
  async summarizeDocument(): Promise<string> {
    return "This content will be given by AI.";
  },
  // Lead summaries need a configured model — make that explicit to the caller.
  async summarizeLead(): Promise<string> {
    throw new Error("AI summaries are not configured. Add GEMINI_API_KEY to .env.local.");
  },
  async summarizeEntity(): Promise<string> {
    throw new Error("AI summaries are not configured. Add GEMINI_API_KEY to .env.local.");
  },
};

export function getStubAi(): AiModules {
  return { summarizer: stubSummarizer };
}
