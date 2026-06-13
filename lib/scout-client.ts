// Client helpers + shared type for the Naukri scout-verification flow.

import { apiUrl } from "@/lib/api-base";

export type ScoutRequest = {
  id:            string;
  lead_id:       string;
  lead_name:     string;
  company_name:  string;
  poc_name?:     string;
  poc_title?:    string;
  poc_email?:    string;
  poc_linkedin?: string;
  requested_by:  string;
  assigned_to?:  string;
  status:        "pending" | "found" | "not_found";
  naukri_url?:   string;
  note?:         string;
  requested_at:  string;
  responded_at?: string;
  responded_by?: string;
};

export type RequestVerificationInput = {
  lead_id:       string;
  lead_name:     string;
  company_name:  string;
  poc_name?:     string;
  poc_title?:    string;
  poc_email?:    string;
  poc_linkedin?: string;
  requested_by:  string;
  assigned_to?:  string;
};

// Create a verification request (server stores it + fires the optional webhook).
export async function requestScoutVerification(input: RequestVerificationInput): Promise<ScoutRequest> {
  const res = await fetch(apiUrl("/api/v1/scout/request"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || `Request failed (${res.status})`);
  return (data as { request: ScoutRequest }).request;
}

// Record a scout's verdict (also used as the external TA-module callback shape).
export async function respondScoutRequest(input: {
  request_id: string; status: "found" | "not_found"; naukri_url?: string; note?: string; responded_by?: string;
}): Promise<void> {
  const res = await fetch(apiUrl("/api/naukri-callback"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || `Response failed (${res.status})`);
}
