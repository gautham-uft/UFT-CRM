// Where the browser sends its API calls (Seam A).
//
// Empty by default → same-origin "/api/..." (the all-in-one run). When the
// frontend runs as its own physical tier, set NEXT_PUBLIC_API_BASE to the
// middleware+backend server's origin (e.g. http://localhost:4000) and every
// client call is rewritten to that host. The server enables CORS for it.
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

// Prefix an absolute API path (e.g. "/api/v1/leads") with the configured base.
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
