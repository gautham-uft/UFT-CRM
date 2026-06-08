// Single source of truth for the app's permission model.
//
// A role grants Read and/or Write on each module. "Read" controls visibility
// (the module shows in the sidebar / dashboard / its page); "Write" controls
// whether mutating actions (add, edit, delete, approve, log, …) are available.
// Write always implies Read (enforced in the Settings role editor).

export const MODULES = [
  "Dashboard",
  "Leads",
  "Contacts",
  "Accounts",
  "Deals",
  "Activities",
  "Follow-ups",
  "Business Card",
  "Products",
  "User Management",
  "Roles & Permissions",
] as const;

export type Module = (typeof MODULES)[number];

// Roles named this are treated as superusers with full access regardless of the
// stored grants. This prevents an admin from being locked out (e.g. after a
// database reset clears the roles collection).
export const SUPERUSER_ROLE = "System Admin";

// Maps a route's first path segment to the module that governs it.
export const ROUTE_MODULE: Record<string, Module> = {
  "/":              "Dashboard",
  "/leads":         "Leads",
  "/contacts":      "Contacts",
  "/accounts":      "Accounts",
  "/deals":         "Deals",
  "/activities":    "Activities",
  "/follow-ups":    "Follow-ups",
  "/business-card": "Business Card",
  "/products":      "Products",
};

export function moduleForPath(pathname: string): Module | undefined {
  const base = "/" + pathname.split("/")[1];
  return ROUTE_MODULE[base];
}
