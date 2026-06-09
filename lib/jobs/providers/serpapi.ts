// SerpAPI adapter — Google Jobs engine. One REST call returns structured job
// postings for a company. Docs: https://serpapi.com/google-jobs-api
import type { JobsInput, JobsProvider, JobPosting } from "../types";

const KEY = process.env.SERPAPI_KEY;

type SerpJob = {
  title?: string; company_name?: string; location?: string; via?: string;
  description?: string;
  detected_extensions?: { posted_at?: string; schedule_type?: string };
  apply_options?: { link?: string }[];
  related_links?: { link?: string }[];
};

export const serpapi: JobsProvider = {
  name: "serpapi",
  isConfigured: () => !!KEY,

  async fetchJobs({ company_name, location }: JobsInput): Promise<JobPosting[]> {
    if (!KEY) return [];

    const p = new URLSearchParams({
      engine:  "google_jobs",
      q:       `${company_name} jobs`,
      api_key: KEY,
    });
    if (location) p.set("location", location);

    const res = await fetch(`https://serpapi.com/search.json?${p.toString()}`);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`SerpAPI ${res.status}: ${txt.slice(0, 150)}`);
    }
    const json = await res.json().catch(() => null);
    if (json?.error) throw new Error(`SerpAPI: ${json.error}`);

    const rows: SerpJob[] = json?.jobs_results ?? [];
    return rows.map((r) => ({
      title:         r.title ?? "Untitled role",
      company:       r.company_name || undefined,
      location:      r.location || undefined,
      posted_at:     r.detected_extensions?.posted_at || undefined,
      schedule_type: r.detected_extensions?.schedule_type || undefined,
      via:           r.via || undefined,
      url:           r.apply_options?.[0]?.link || r.related_links?.[0]?.link || undefined,
      description:   typeof r.description === "string" ? r.description.slice(0, 400) : undefined,
      source:        "serpapi",
    }));
  },
};
