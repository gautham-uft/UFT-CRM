// Jobs orchestrator. Runs every configured jobs provider, merges + de-dupes the
// postings. Mirrors lib/enrichment so adding another provider (e.g. an Apify
// LinkedIn-jobs actor) is just a new file + one line in PROVIDERS.
import type { JobsInput, JobsResult, JobPosting, JobsProvider } from "./types";
import { serpapi } from "./providers/serpapi";

const PROVIDERS: JobsProvider[] = [serpapi];

export function configuredJobsProviders(enabled?: boolean): string[] {
  if (enabled === false) return [];
  return PROVIDERS.filter(p => p.isConfigured()).map(p => p.name);
}

function dedupe(jobs: JobPosting[]): JobPosting[] {
  const seen = new Set<string>();
  const out: JobPosting[] = [];
  for (const j of jobs) {
    const key = `${j.title}|${j.company ?? ""}|${j.location ?? ""}`.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(j);
  }
  return out;
}

export async function fetchJobs(input: JobsInput, opts?: { enabled?: boolean }): Promise<JobsResult> {
  const active = opts?.enabled === false ? [] : PROVIDERS.filter(p => p.isConfigured());
  const available = active.map(p => p.name);

  const settled = await Promise.allSettled(active.map(p => p.fetchJobs(input)));

  let jobs: JobPosting[] = [];
  const used: string[] = [];
  const errors: Record<string, string> = {};

  settled.forEach((r, i) => {
    const name = active[i].name;
    if (r.status === "rejected") {
      errors[name] = r.reason instanceof Error ? r.reason.message : String(r.reason);
      return;
    }
    if (r.value.length) used.push(name);
    jobs = jobs.concat(r.value);
  });

  return {
    jobs: dedupe(jobs),
    providers_used: used,
    providers_available: available,
    ...(Object.keys(errors).length ? { provider_errors: errors } : {}),
  };
}
