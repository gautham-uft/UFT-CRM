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
// stored grants. This prevents the top role from being locked out (e.g. after a
// database reset clears the roles collection).
export const SUPERUSER_ROLE = "Director";

// "Restricted" roles (e.g. Executive) are scoped down by workflow rules beyond
// plain module read/write:
//   • they raise an approval REQUEST instead of approving leads directly,
//   • they only see activities they created (not everyone's),
//   • they receive assigned tasks but can't assign tasks to others.
// Everyone else with the relevant module access acts as an approver/manager.
export const RESTRICTED_ROLES = ["Executive"];
export function isRestrictedRole(role: string): boolean {
  return RESTRICTED_ROLES.includes(role);
}

// Role hierarchy (higher rank = more authority):
//   Director > Business Manager > Account Manager > Executive
// Used e.g. to decide whose activities a user may delete (their own, or those
// created by someone strictly below them). Unknown roles rank 0.
export const ROLE_RANK: Record<string, number> = {
  "Director":         4,
  "Business Manager": 3,
  "Account Manager":  2,
  "Executive":        1,
};
export function roleRank(role: string): number {
  return ROLE_RANK[role] ?? 0;
}

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
