// Shared types for the job-postings layer (mirrors lib/enrichment). Pure types,
// safe to import from client components.

export type JobsInput = {
  company_name: string;
  location?:    string;
};

export type JobPosting = {
  title:          string;
  company?:       string;
  location?:      string;
  posted_at?:     string;
  schedule_type?: string; // Full-time / Contract / …
  via?:           string; // source site (e.g. "via LinkedIn")
  url?:           string;
  description?:   string;
  source:         string; // which provider surfaced it
};

export interface JobsProvider {
  name:          string;
  isConfigured(): boolean;
  fetchJobs(input: JobsInput): Promise<JobPosting[]>;
}

export type JobsResult = {
  jobs:                JobPosting[];
  providers_used:      string[];
  providers_available: string[];
  provider_errors?:    Record<string, string>;
};
