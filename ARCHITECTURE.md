# Architecture

The CRM runs as a single Next.js app today, but is structured as four layers
with **two real HTTP seams** so the core and the data service can be extracted
into independent, API-driven deployables for a commercial product — without
changing application code.

```
┌─────────────────────────────────────────────────────────────┐
│ UI            React pages + components, contexts, hooks       │
│               (app/**/page.tsx, components/**, contexts/**)   │
└───────────────┬───────────────────────────────────────────────┘
                │  Seam A — HTTP (UI-facing, public-capable)
                ▼  fetch → /api/v1/*           (lib/api.ts, *-client.ts)
┌─────────────────────────────────────────────────────────────┐
│ Application   app/api/v1/**  — thin controllers               │
│ API           validate → call core → respond                  │
└───────────────┬───────────────────────────────────────────────┘
                │  in-process call, injecting a Repository
                ▼
┌─────────────────────────────────────────────────────────────┐
│ Core          lib/core/**  — domain services + AI modules     │
│               transport-agnostic; depends ONLY on the         │
│               Repository interface + contracts. No pg/Next.    │
└───────────────┬───────────────────────────────────────────────┘
                │  Seam B — HTTP (internal, public-capable)
                ▼  Repository → HttpDataClient → /api/internal/v1/data/*
┌─────────────────────────────────────────────────────────────┐
│ Data API      app/api/internal/v1/data/**  — guarded by       │
│               INTERNAL_API_KEY; backed by PgRepository         │
└───────────────┬───────────────────────────────────────────────┘
                ▼
            PostgreSQL  (working: uft_crm, persistent: uft_crm_persistent)
```

Dependency rule (one direction only):
`UI → contracts`, `UI → (HTTP) → Seam A → core → (Repository) → Seam B → pg`.
Enforced by ESLint `no-restricted-imports` (see `eslint.config.mjs`).

## Layers & key files

| Layer | Location | Notes |
|------|----------|-------|
| Contracts | `lib/contracts/` | Pure shared types/DTOs (`collections.ts`). No I/O. → future `@uft/contracts`. |
| Data service | `lib/data/` | `repository.ts` (interface), `pg.ts` (`PgRepository` — the only SQL), `pool.ts`, `http-client.ts` (`HttpDataClient`), `index.ts` (`getRepository()`). → future `@uft/data`. |
| Seam B (Data API) | `app/api/internal/v1/data/**` | `[collection]`, `[collection]/[id]`, `db`, `admin`. Guarded by `INTERNAL_API_KEY`. Uses `getPgRepository()` directly (it *is* the data service). |
| Core | `lib/core/` | `enrichment`, `jobs`, `email` (`templates` + `send`), `calendar`, `scout`, `meetings`, `ai/` (stub). Services take a `Repository`. → future `@uft/core`. |
| Seam A (App API) | `app/api/v1/**` | `[collection]`(+`[id]`), `enrich`, `quick-search`, `email/send`, `scout/request`, `admin/db-sync`. Thin controllers; inject `getRepository()`. |
| Public endpoints | `app/api/meeting-response`, `app/api/naukri-callback` | Stable, unversioned (email links / external TA webhook). Thin → core. |
| UI clients | `lib/api.ts`, `lib/email.ts`, `lib/enrichment-client.ts`, `lib/quick-search-client.ts`, `lib/scout-client.ts` | The only things that call Seam A. `useCollection` + `AppDataContext` go through `lib/api.ts`. |

## The injector (composition root)

`lib/data/index.ts → getRepository()`:
- default → `HttpDataClient` (talks to Seam B over HTTP — the seam is a *real*
  network boundary).
- `DATA_TRANSPORT=inprocess` → `PgRepository` (skip HTTP; faster single-process).

Core never picks a transport — route handlers inject the Repository, so the
same core code works whether the data service is in-process or remote.

## Environment

```
DATABASE_URL              working DB (uft_crm)
PERSISTENT_DATABASE_URL   baseline DB (uft_crm_persistent) — optional
DATA_API_URL              Seam B base origin (default http://localhost:3000)
INTERNAL_API_KEY          Seam B shared secret (x-internal-key). Blank = open (local dev)
DATA_TRANSPORT            http (default) | inprocess
APP_BASE_URL              absolute base for email/meeting links (optional)
RESEND_API_KEY / RESEND_FROM_EMAIL    email (Resend)
APOLLO/HUNTER/PDL_API_KEY, SERPAPI_KEY  enrichment + jobs providers
SCOUT_WEBHOOK_URL         optional outbound bridge to uftech.in TA module
```

## AI modules

`lib/core/ai/` is a structural slot: `index.ts` declares the interfaces
(`Summarizer`, `AiModules`); `stub.ts` returns the placeholder copy. Swap in a
real provider (e.g. the Claude API) by implementing the same interfaces and
returning it from `getAi()` — callers don't change.

## Extracting into separate services (commercial mode)

The seams are already HTTP, so promotion to separate deployables is configuration,
not code:

1. **Data service** → host `lib/data` + `app/api/internal/v1/data/**` separately.
   Point the app's `DATA_API_URL` at it and set a shared `INTERNAL_API_KEY`.
   Core/Seam A keep calling `getRepository()` (HTTP) unchanged.
2. **Core/App API** → host `lib/core` + `app/api/v1/**` separately; the UI's
   `lib/api.ts` base (`/api/v1`) becomes that host. Add auth at Seam A as needed.
3. Promote `lib/contracts`, `lib/core`, `lib/data` to workspace packages
   (`@uft/{contracts,core,data}`) — boundaries are already enforced by ESLint,
   so this is a mechanical move.

## Verify

- `npx tsc --noEmit`, `npx eslint`, `npx next build` — all clean.
- Seam B auth: `curl /api/internal/v1/data/leads` → 401 without `x-internal-key`,
  rows with it.
- Seam A: `curl /api/v1/leads` (and a POST/DELETE round-trip); `/api/v1/admin/db-sync`.
- Boundary proof: `grep -rE "from \"pg\"|next/server" lib/core` → nothing.
- Extraction proof: set `DATA_API_URL` to the running origin explicitly → the app
  still works (the data seam is a genuine network call).
