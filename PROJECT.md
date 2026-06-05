# UFT CRM — RevOps Platform: Project Documentation

> **Version:** 1.0  
> **Date:** 2026-05-28  
> **Owner:** UFT Engineering  
> **Status:** Phase 1 Complete · Phase 2–5 Planned

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Phases Summary](#2-phases-summary)
3. [Phase 1 — Core CRM Frontend (Implemented)](#3-phase-1--core-crm-frontend-implemented)
   - [PRD — Product Requirements Document](#31-prd--product-requirements-document)
   - [TRD — Technical Requirements Document](#32-trd--technical-requirements-document)
4. [Phase 2 — Backend API & Database](#4-phase-2--backend-api--database)
   - [PRD](#41-prd)
   - [TRD](#42-trd)
5. [Phase 3 — Automation with n8n](#5-phase-3--automation-with-n8n)
   - [PRD](#51-prd)
   - [TRD](#52-trd)
6. [Phase 4 — AI & LLM Features](#6-phase-4--ai--llm-features)
   - [PRD](#61-prd)
   - [TRD](#62-trd)
7. [Phase 5 — Analytics, Reporting & Enterprise](#7-phase-5--analytics-reporting--enterprise)
   - [PRD](#71-prd)
   - [TRD](#72-trd)
8. [Full System Architecture (All Phases)](#8-full-system-architecture-all-phases)
9. [Data Models (Canonical)](#9-data-models-canonical)
10. [Role-Based Access Control Matrix](#10-role-based-access-control-matrix)

---

## 1. Project Overview

**UFT CRM** is an internal RevOps platform for UFT (UFTech) designed to manage the full B2B sales lifecycle: from AI-powered lead capture and enrichment to deal tracking, activity logging, and revenue reporting.

The platform is built as a **Next.js full-stack application** with an AI-first philosophy — leads are captured from multiple automated sources (LinkedIn scraping via Apify, business card scanning via OCR + LLM, and inbound web forms), enriched automatically via n8n workflows, and surfaced to sales reps in a clean Kanban-style pipeline.

**Core Users:**
- **SDR (Sales Development Rep):** Processes incoming leads, logs calls, creates contacts.
- **Account Executive (AE):** Owns deals, manages accounts, drives pipeline to close.
- **RevOps Manager:** Monitors pipeline health, enforces process, configures workflows.
- **System Admin:** Manages users, roles, permissions, integrations.

**Business Goals:**
1. Reduce lead-to-contact conversion time by centralizing all lead sources into one reviewed queue.
2. Increase pipeline visibility with a real-time Kanban board and deal analytics.
3. Eliminate manual data entry via AI business card scanning and LinkedIn enrichment.
4. Create a single source of truth for all customer interactions via unified activity logging.

---

## 2. Phases Summary

| Phase | Name | Status | Key Deliverable |
|-------|------|--------|-----------------|
| 1 | Core CRM Frontend | **Complete** | Fully functional UI with mock data — all 9 modules |
| 2 | Backend API & Database | **Planned** | REST API + PostgreSQL + Auth + real CRUD |
| 3 | n8n Automation | **Planned** | Lead ingestion pipelines, webhook triggers, enrichment |
| 4 | AI & LLM Features | **Planned** | Business card OCR, lead scoring, call transcription |
| 5 | Analytics & Enterprise | **Planned** | Forecasting, email sequences, reporting, multi-org |

---

## 3. Phase 1 — Core CRM Frontend (Implemented)

### 3.1 PRD — Product Requirements Document

#### Product Vision

A unified, visually polished RevOps interface that allows the entire sales team to manage leads, contacts, accounts, deals, and activities from a single app — without relying on spreadsheets or disconnected tools.

#### In Scope (Phase 1)

All features below are implemented as high-fidelity, interactive UI components using mock data. The UI is feature-complete and production-ready in terms of design; only the data layer requires backend integration.

---

#### Feature 1: Navigation & Global Shell

**Description:** Persistent left sidebar and top header frame every page. Navigation shows active state. Header shows page title, theme switcher, search bar, and notifications.

**Requirements:**
- FR-1.1: Sidebar must display logo, 9 navigation links, and logged-in user profile (name + role).
- FR-1.2: Active navigation item is highlighted with an accent-color indicator.
- FR-1.3: Top bar must dynamically show the page name for each route.
- FR-1.4: Theme switcher must support Dark1 (emerald), Dark2 (blue), and Light (navy) themes.
- FR-1.5: Theme selection must persist across browser sessions via `localStorage`.
- FR-1.6: Global search bar is present and receives focus on click (functional search: Phase 2).
- FR-1.7: Notification bell icon is visible; badge shown for unread count (functional notifications: Phase 2).

**User Stories:**
- As a sales rep, I want the sidebar to always show me where I am so I can navigate quickly.
- As any user, I want to switch between dark and light themes to suit my working environment.

---

#### Feature 2: Dashboard

**Description:** Command center showing pipeline health, revenue trends, and recent activity at a glance.

**Requirements:**
- FR-2.1: Display 6 KPI cards: Total Leads, Qualified Contacts, Open Deals, Active Accounts, Pipeline Value, and Conversion Rate — each with a trend indicator (up/down %).
- FR-2.2: Bar chart showing pipeline value aggregated per deal stage (Discovery, Demo, Proposal, Negotiation, Closed Won).
- FR-2.3: Line chart showing monthly revenue over the trailing 12 months.
- FR-2.4: "Recent Activity" feed showing the 5 most recent CRM activities with timestamps and entity links.
- FR-2.5: "Deal Count by Stage" section showing per-stage count with a visual progress bar.
- FR-2.6: Charts must respond to theme changes (colors update without page reload).
- FR-2.7: Dashboard layout must be responsive and adapt gracefully at various viewport widths.

**User Stories:**
- As a RevOps Manager, I want to see pipeline health at a glance so I can identify bottlenecks immediately.
- As an Account Executive, I want to see my recent activity feed so I can pick up where I left off.

---

#### Feature 3: Lead Management

**Description:** A reviewable queue of incoming leads from all sources, with bulk approval workflows.

**Requirements:**
- FR-3.1: Display all leads in a sortable table with columns: Name, Company, Email, Phone, Source, Status, Created Date.
- FR-3.2: Source attribution badge must clearly distinguish: `n8n / Apify (LinkedIn)`, `Business Card (OCR)`, `Inbound Web Form`.
- FR-3.3: Status filter tabs: All, New, Reviewing, Approved, Rejected.
- FR-3.4: Row-level checkbox selection for bulk operations.
- FR-3.5: Bulk approve and bulk reject actions, enabled only when ≥1 lead is selected.
- FR-3.6: "Sync Leads" button to trigger external pipeline (functional: Phase 3, n8n webhook).
- FR-3.7: Individual lead actions: Approve, Reject, View Detail.
- FR-3.8: Approved leads are automatically promoted to Contacts (functional: Phase 2 API).
- FR-3.9: Lead row status change must reflect in the UI immediately (optimistic update).

**User Stories:**
- As an SDR, I want to see all unreviewed leads in one queue so I can process them efficiently.
- As a RevOps Manager, I want to see which source each lead came from so I can evaluate channel ROI.

---

#### Feature 4: Contact Management

**Description:** Full directory of all CRM contacts with a detail panel showing contact info and linked activity history.

**Requirements:**
- FR-4.1: Contact table with columns: Name, Job Title, Account, Email, Phone.
- FR-4.2: Clicking a row opens a right-side detail panel without navigating away.
- FR-4.3: Detail panel shows: full name, job title, account name, email (clickable `mailto:`), phone (clickable `tel:`), avatar initials.
- FR-4.4: Detail panel shows full activity timeline filtered to this contact.
- FR-4.5: Quick action buttons: "Log Call" and "Send Email" in detail panel.
- FR-4.6: "Add Contact" button (functional: Phase 2).
- FR-4.7: Table supports text-based filtering (functional: Phase 2).

**User Stories:**
- As an AE, I want to click a contact and instantly see their full interaction history.
- As an SDR, I want to log a call directly from the contact's detail panel.

---

#### Feature 5: Account Management

**Description:** Company-level view of accounts, showing aggregated contact, deal, and revenue data.

**Requirements:**
- FR-5.1: Account grid with cards showing: Company name, industry, domain, number of contacts, number of open deals, total revenue.
- FR-5.2: Clicking an account card opens a right-side detail panel.
- FR-5.3: Detail panel shows: company name, domain (linked), website, industry, employee count, annual revenue, founded year.
- FR-5.4: Detail panel lists all contacts associated with the account with their roles.
- FR-5.5: "Add Account" button (functional: Phase 2).
- FR-5.6: Accounts are linkable to deals and contacts (relationship exists in mock data).

**User Stories:**
- As an AE, I want to see every contact and deal at a target company in one view.

---

#### Feature 6: Deal Pipeline (Kanban)

**Description:** A drag-and-drop Kanban board representing the full B2B sales pipeline across all stages.

**Requirements:**
- FR-6.1: Six pipeline stages rendered as columns: Discovery, Demo, Proposal, Negotiation, Closed Won, Closed Lost.
- FR-6.2: Each stage column shows the stage name, deal count, and total value in its header.
- FR-6.3: Deal cards within columns show: deal name, account, owner (AE), and monetary value with currency.
- FR-6.4: Deals can be dragged and dropped between stages using `@dnd-kit` — stage updates immediately on drop.
- FR-6.5: Clicking a deal card opens a detail panel with full deal information.
- FR-6.6: Moving a deal to "Closed Won" triggers a confirmation modal with line-item summary before committing.
- FR-6.7: Moving a deal to "Closed Lost" stage is immediate without confirmation.
- FR-6.8: "Add Deal" button available (functional: Phase 2).
- FR-6.9: Pipeline value displayed in the header area with currency formatting.

**User Stories:**
- As an AE, I want to drag deals between stages to reflect where they are in the sales process.
- As a RevOps Manager, I want to see total pipeline value per stage to identify where deals are stuck.

---

#### Feature 7: Activity Logging

**Description:** A complete audit trail of all CRM interactions across all entity types.

**Requirements:**
- FR-7.1: Vertical timeline view of activities, most recent at top.
- FR-7.2: Each activity shows: type icon + label, user who performed it, related entity (with entity type badge), description text, and relative timestamp.
- FR-7.3: Activity types: Call Log, Email, Note, Meeting — each with distinct visual icon.
- FR-7.4: Filter activities by type via tabs (All, Call Logs, Emails, Notes, Meetings).
- FR-7.5: "Log Activity" button opens a modal with fields: Type, Related Entity (searchable), Description.
- FR-7.6: Activities are linked to any entity type: Lead, Contact, Account, Deal.
- FR-7.7: Entity badges on activity cards are color-coded by entity type.

**User Stories:**
- As any sales user, I want to see a unified feed of all activity so nothing falls through the cracks.
- As an SDR, I want to log a call outcome in under 30 seconds from the activity modal.

---

#### Feature 8: Business Card Scanner

**Description:** An AI-powered tool that extracts contact details from a business card photo and pre-fills a contact creation form.

**Requirements:**
- FR-8.1: Upload interface accepting JPG/PNG/HEIC image files via drag-and-drop or file picker.
- FR-8.2: Multi-step workflow with clear state transitions: `Idle → Processing → Review → Saved`.
- FR-8.3: Processing step shows animated progress steps: Image Preprocessing → OCR Extraction → LLM Field Mapping → Confidence Scoring.
- FR-8.4: Review step shows all extracted fields pre-filled in an editable form: First Name, Last Name, Email, Phone, Job Title, Company, Website.
- FR-8.5: AI confidence score displayed (e.g., 97%) so the user can decide whether to trust the extraction.
- FR-8.6: All extracted fields are fully editable before saving.
- FR-8.7: "Save Contact" creates a contact record (functional: Phase 2 API, Phase 4 LLM).
- FR-8.8: "Scan Another" resets the workflow to Idle state.

**User Stories:**
- As an SDR at a conference, I want to scan a business card and have a contact auto-created.

---

#### Feature 9: Product Catalog

**Description:** A catalog of products/services that can be attached to deals as line items.

**Requirements:**
- FR-9.1: Grid view of product cards showing: SKU, name, description, base price, billing type.
- FR-9.2: Filter by status (Active / All).
- FR-9.3: Filter by billing type (Recurring / One-Time).
- FR-9.4: Billing type badge color distinction: Recurring (emerald), One-Time (violet).
- FR-9.5: Quick actions on each card: Edit Product, Add to Deal.
- FR-9.6: "New Product" button (functional: Phase 2).

**User Stories:**
- As an AE, I want to browse the product catalog and add products to a deal as line items.

---

#### Feature 10: Settings & Admin

**Description:** Administration panel for managing users, roles, and permissions.

**Requirements:**
- FR-10.1: Tab-based layout with sections: Users, Roles & Permissions.
- FR-10.2: Users tab shows table: Name, Email, Role, Status (Active/Inactive), Last Login, Actions.
- FR-10.3: "Invite User" button with modal (functional: Phase 2).
- FR-10.4: "Deactivate" action per user.
- FR-10.5: Roles tab shows 4 predefined roles: System Admin, RevOps Manager, Account Executive, SDR.
- FR-10.6: Each role card shows name, description, and a list of permission badges.
- FR-10.7: Role permissions reflect the RBAC matrix (see Section 10).
- FR-10.8: Only System Admins can access Settings (enforcement: Phase 2 middleware).

**User Stories:**
- As a System Admin, I want to invite new users and assign them roles before they can log in.
- As a RevOps Manager, I want to view what each role can access without asking IT.

---

#### Feature 11: Theming System

**Description:** A tri-variant design system implemented entirely in CSS custom properties.

**Requirements:**
- FR-11.1: Three themes: `dark1` (navy-black + emerald #22c55e), `dark2` (navy-black + blue #3b82f6), `light` (off-white + navy #1e3a8a).
- FR-11.2: Theme applied via `data-theme` attribute on `<html>` element.
- FR-11.3: 60+ CSS variables cover all UI surfaces: backgrounds (--bg, --surface, --surface2, --surface3), text weights (--tx1 through --tx6), accent scale (--a, --a-hover, --a-muted, --a-subtle, --a-text, --a-border, --a-ring).
- FR-11.4: Chart colors update in real time when theme changes via `useChartColors()` hook.
- FR-11.5: Selection persists in `localStorage` key `crm-theme`.

---

### 3.2 TRD — Technical Requirements Document

#### Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js | 16.2.6 | App Router, RSC-capable |
| Runtime | React | 19.2.4 | With concurrent features |
| Language | TypeScript | 5.x | Strict mode enabled |
| Styling | Tailwind CSS | 4.x | CSS variables + utility classes |
| Charts | Recharts | 3.8.1 | SVG-based, theme-aware |
| Icons | Lucide React | 1.17.0 | Tree-shakeable SVG icons |
| Drag & Drop | @dnd-kit | 6.x | Core + Sortable + Utilities |
| CSS Utils | clsx + tailwind-merge | latest | Via `cn()` utility |
| Linting | ESLint | 9.x | Next.js config |

#### Directory Structure

```
uft-crm/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout: Sidebar + TopBar shell
│   ├── globals.css               # Theme CSS variables + base styles
│   ├── page.tsx                  # /  — Dashboard
│   ├── leads/page.tsx            # /leads
│   ├── contacts/page.tsx         # /contacts
│   ├── accounts/page.tsx         # /accounts
│   ├── deals/page.tsx            # /deals
│   ├── activities/page.tsx       # /activities
│   ├── business-card/page.tsx    # /business-card
│   ├── products/page.tsx         # /products
│   └── settings/page.tsx         # /settings
├── components/
│   ├── ClientLayout.tsx          # Theme provider wrapper (client boundary)
│   ├── Sidebar.tsx               # Left nav (usePathname active state)
│   └── TopBar.tsx                # Header (theme switcher, search, notifs)
├── contexts/
│   └── ThemeContext.tsx          # Theme state + localStorage persistence
├── hooks/
│   └── useChartColors.ts         # Returns theme-aware Recharts color palette
├── lib/
│   ├── mock-data.ts              # All mock data (leads, contacts, accounts, deals, activities, products, users)
│   └── utils.ts                  # cn() — clsx + twMerge helper
├── CLAUDE.md                     # Agent instructions
├── AGENTS.md                     # Next.js version guidance
├── next.config.ts                # Minimal Next.js config
├── tsconfig.json                 # ES2017 target, @/* alias, strict
└── postcss.config.mjs            # @tailwindcss/postcss only
```

#### Routing Architecture

All routes use **Next.js App Router** with the file-based `app/` directory. Every page is a client component (`"use client"`) because all pages contain interactive state (hooks, event handlers, drag-and-drop). The root layout (`app/layout.tsx`) wraps all pages in `<ClientLayout>` which provides the `ThemeProvider` context, and renders the `<Sidebar>` and `<TopBar>`.

#### State Management

- **Global State:** `ThemeContext` (React Context + `useContext`) — only the theme is global.
- **Page-Local State:** Each page uses `useState` for: selected items, active filters, modal open/close, drag state, form inputs.
- **No external state library** (Redux, Zustand, Jotai) — deliberate choice to keep dependency surface minimal until API integration requires cross-page cache synchronization (planned for Phase 2 with React Query or SWR).

#### Component Patterns

- All components are **function components** with TypeScript prop interfaces.
- The `cn()` utility (`lib/utils.ts`) is used universally for conditional Tailwind class composition to avoid style conflicts from `tailwind-merge`.
- Charts consume `useChartColors()` hook to receive theme-responsive color tokens at render time; the hook reads `theme` from `ThemeContext` and returns a plain object of hex strings mapped to semantic chart roles (`grid`, `tick`, `bar`, `line`, `dot`, `tooltip.*`).

#### CSS Architecture

```
globals.css
├── :root (dark1 default)
│   ├── Background layers: --bg, --surface, --surface2, --surface3
│   ├── Text scale: --tx1 (brightest) → --tx6 (faintest)
│   └── Accent scale: --a, --a-hover, --a-muted, --a-subtle,
│                     --a-text, --a-border, --a-ring
├── [data-theme="dark2"]
│   └── (same vars, blue accent)
└── [data-theme="light"]
    └── (same vars, off-white bg, navy accent)
```

Tailwind's `@apply` and arbitrary CSS variables (`var(--a)`, `var(--surface)`) are used throughout component JSX via `style` props and Tailwind's arbitrary value syntax (`bg-[var(--surface)]`).

#### Drag-and-Drop Implementation (Deals)

The Deals page uses `@dnd-kit/core` and `@dnd-kit/sortable`:
- `<DndContext>` wraps the Kanban board with an `onDragEnd` handler.
- Each stage column is a `<SortableContext>` with `strategy: verticalListSortingStrategy`.
- Deal cards are `<DraggableItem>` wrappers using `useSortable()`.
- On `dragEnd`, the deal's `stage_id` is updated in local React state (`useState`).
- A custom `DragOverlay` renders a translucent clone of the card while dragging.

#### TypeScript Patterns

- No explicit `interface` or `type` definitions in separate files yet — all types are inferred from `lib/mock-data.ts` using TypeScript's structural inference.
- Phase 2 will introduce a `/types/` directory with canonical interfaces for all entities (see Section 9).

#### Performance Characteristics (Phase 1)

- All data is in-memory mock data — no network latency.
- Charts re-render on theme change (cheap: `useChartColors` returns a new object reference).
- Kanban drag is smooth using `@dnd-kit`'s pointer sensor.
- No code-splitting configured beyond Next.js defaults (route-level splitting is automatic).

#### Key Files by Feature

| Feature | Primary File | State | Notable Library |
|---------|-------------|-------|-----------------|
| Dashboard | `app/page.tsx` | KPI data, chart data | Recharts |
| Lead Queue | `app/leads/page.tsx` | `selected: Set<string>`, `filter: string` | — |
| Contacts | `app/contacts/page.tsx` | `selected: Contact \| null` | — |
| Accounts | `app/accounts/page.tsx` | `selected: Account \| null` | — |
| Deals Kanban | `app/deals/page.tsx` | `deals[]`, `dragging`, `closedWonModal` | @dnd-kit |
| Activities | `app/activities/page.tsx` | `filter`, `showModal` | — |
| Business Card | `app/business-card/page.tsx` | `step`, `form`, `fileName` | — |
| Products | `app/products/page.tsx` | `filter`, `billingFilter` | — |
| Settings | `app/settings/page.tsx` | `activeTab` | — |
| Theme | `contexts/ThemeContext.tsx` | `theme: "dark1"\|"dark2"\|"light"` | localStorage |

---

## 4. Phase 2 — Backend API & Database

### 4.1 PRD

#### Goals

- Replace all mock data with a live PostgreSQL database.
- Implement secure, role-aware REST API endpoints for all CRM entities.
- Add authentication and session management so users must log in.
- Enable real CRUD operations: create/read/update/delete for all entities.
- Enforce the RBAC permission matrix in API middleware.

#### Features

**Authentication & Authorization**
- Login page with email + password (or SSO via Google Workspace).
- JWT-based sessions with refresh tokens.
- Protected route middleware: redirect unauthenticated users to `/login`.
- Role-based API middleware: each endpoint checks the user's role before allowing writes.

**CRUD APIs for All Entities**
- `GET/POST/PATCH/DELETE /api/leads`
- `GET/POST/PATCH/DELETE /api/contacts`
- `GET/POST/PATCH/DELETE /api/accounts`
- `GET/POST/PATCH/DELETE /api/deals` (with stage-change endpoint)
- `GET/POST/PATCH/DELETE /api/activities`
- `GET/POST/PATCH/DELETE /api/products`
- `GET/POST/PATCH/DELETE /api/users` (admin only)

**Real-Time Search**
- Global search (`/api/search?q=`) with full-text search across Leads, Contacts, Accounts, and Deals.
- Per-entity filtering: status, owner, date range, source, stage.

**Audit Log**
- Every write operation is recorded to an `audit_log` table with: user_id, entity_type, entity_id, action, changed_fields, timestamp.

**File Storage**
- Business card image uploads stored in S3 (or equivalent).
- Pre-signed URLs for direct browser-to-S3 upload.

### 4.2 TRD

#### Database: PostgreSQL

**ORM:** Prisma 5.x

**Schema (key tables):**

```sql
-- Users & Auth
users (id UUID PK, first_name, last_name, email UNIQUE, password_hash, role_id FK, is_active, last_login, created_at)
roles (id UUID PK, name, description)
permissions (id UUID PK, role_id FK, resource, action)
sessions (id UUID PK, user_id FK, token_hash, expires_at, created_at)

-- CRM Entities
leads (id UUID PK, first_name, last_name, email, phone, company_name, source, status, owner_id FK, created_at, updated_at)
contacts (id UUID PK, account_id FK, first_name, last_name, email, phone, job_title, created_by FK, created_at, updated_at)
accounts (id UUID PK, name, domain, industry, website, employee_count, annual_revenue, founded_year, owner_id FK, created_at, updated_at)
pipeline_stages (id UUID PK, name, sort_order, win_probability)
deals (id UUID PK, name, stage_id FK, owner_id FK, account_id FK, contact_id FK, total_amount, currency, created_at, updated_at, closed_at)
deal_line_items (id UUID PK, deal_id FK, product_id FK, quantity, unit_price, total_price)
products (id UUID PK, sku UNIQUE, name, description, base_price, billing_type, is_active, created_at)
activities (id UUID PK, user_id FK, entity_type, entity_id UUID, activity_type, description, created_at)
audit_log (id UUID PK, user_id FK, entity_type, entity_id UUID, action, payload JSONB, created_at)
```

#### API Layer: Next.js Route Handlers

All API routes live under `app/api/` using Next.js App Router Route Handlers:

```
app/api/
├── auth/
│   ├── login/route.ts         POST — credential check, issue JWT
│   ├── logout/route.ts        POST — invalidate session
│   └── me/route.ts            GET  — current user profile
├── leads/
│   ├── route.ts               GET (list + filters), POST (create)
│   └── [id]/route.ts          GET, PATCH, DELETE
├── contacts/route.ts + [id]/
├── accounts/route.ts + [id]/
├── deals/
│   ├── route.ts
│   ├── [id]/route.ts
│   └── [id]/stage/route.ts    PATCH — stage change with audit
├── activities/route.ts + [id]/
├── products/route.ts + [id]/
├── users/route.ts + [id]/     (admin only)
└── search/route.ts            GET ?q= — full-text across entities
```

#### Authentication Flow

1. User POSTs `{ email, password }` to `/api/auth/login`.
2. Server verifies password against bcrypt hash.
3. Server issues signed JWT (15-min access token) + HttpOnly cookie refresh token (7 days).
4. Next.js middleware (`middleware.ts`) at root validates JWT on every non-`/api/auth/*` request.
5. Expired access tokens are refreshed transparently via `/api/auth/refresh`.

#### RBAC Enforcement

```ts
// middleware pattern (pseudocode)
const PERMISSIONS = {
  "System Admin":     ["*"],
  "RevOps Manager":   ["leads:*", "contacts:*", "accounts:*", "deals:*", "activities:*", "users:read", "settings:read"],
  "Account Executive":["leads:read", "contacts:*", "accounts:read", "deals:*", "activities:*"],
  "SDR":              ["leads:*", "contacts:create", "contacts:read", "activities:create", "activities:read"],
}
```

#### Data Fetching Strategy (Frontend)

- Replace `lib/mock-data.ts` imports with **SWR** or **React Query** hooks.
- Cache keys follow entity paths: `["leads", { status: "new" }]`, `["deals", { stage: "Demo" }]`.
- Optimistic updates for stage drag (Kanban), lead approve/reject.
- Stale-while-revalidate for list views; cache-busted on mutations.

#### Error Handling

- All API responses follow `{ data?, error?, message? }` envelope.
- HTTP status codes: 200/201 success, 400 validation, 401 unauthorized, 403 forbidden, 404 not found, 500 internal.
- Frontend: global error boundary + toast notifications for API errors.

---

## 5. Phase 3 — Automation with n8n

### 5.1 PRD

#### Goals

- Automate lead ingestion from LinkedIn (via Apify) into the CRM lead queue.
- Trigger enrichment workflows when leads are created or approved.
- Send Slack/email notifications to SDRs when high-quality leads arrive.
- Automate deal lifecycle actions (e.g., notify Slack on Closed Won).
- Expose webhook endpoints so n8n can push data into the CRM API.

#### Automation Workflows

**Workflow 1: LinkedIn Lead Scraping (Apify → CRM)**
- n8n schedule trigger: runs every 4 hours.
- Calls Apify Actor (LinkedIn Company Search / People Search) with configured search parameters.
- Deduplicates against existing leads/contacts by email.
- POSTs new unique leads to `POST /api/leads` with `source: "n8n_apify"`.
- Sends Slack summary: "X new LinkedIn leads imported."

**Workflow 2: Lead Enrichment on Creation**
- Trigger: webhook from CRM when new lead is created.
- Steps: look up email domain in Clearbit/Apollo.io → enrich with company data → update lead record via `PATCH /api/leads/:id`.
- If enrichment finds the company has >100 employees and fits ICP, auto-set lead `status: "reviewing"` and ping assigned SDR.

**Workflow 3: Business Card OCR Pipeline**
- Trigger: `POST /api/business-card/upload` with image S3 URL.
- Steps: call OCR service (Google Cloud Vision or Tesseract) → pass extracted text to LLM for field mapping → return structured JSON to frontend.
- On save, creates contact via `POST /api/contacts`.

**Workflow 4: Deal Closed Won Notification**
- Trigger: webhook from CRM when deal `stage_id` changes to "Closed Won".
- Creates activity log: type "note", description "Deal closed won".
- Sends Slack message to `#revenue-wins`: "🎉 [AE Name] closed [Deal Name] for $[Amount]!"
- Optionally: creates follow-up task in Asana/Linear for onboarding team.

**Workflow 5: Lead → Contact Promotion**
- Trigger: webhook from CRM when lead `status` changes to "approved".
- n8n creates `Contact` and optionally `Account` if company doesn't exist.
- Links new contact back to the lead record.
- Sends welcome email via SendGrid to the new contact.

**Workflow 6: Inbound Web Form Leads**
- External web forms (e.g., Webflow, Typeform) POST to an n8n webhook URL.
- n8n normalizes payload → creates lead via `POST /api/leads` with `source: "inbound_web"`.

### 5.2 TRD

#### n8n Deployment

- n8n self-hosted on a VPS (or n8n Cloud).
- All credentials (Apify API key, Slack bot token, SendGrid key, CRM service token) stored in n8n Credentials vault.
- n8n connects to CRM via a dedicated **service account** with role "RevOps Manager".

#### CRM Webhook Endpoints

New endpoints to support n8n triggers:

```
POST /api/webhooks/lead-created          n8n subscribes to this via webhook trigger
POST /api/webhooks/lead-status-changed
POST /api/webhooks/deal-stage-changed
POST /api/webhooks/business-card-ocr     Accepts { imageUrl: string }, returns extracted fields
```

Webhooks are secured with HMAC-SHA256 signature headers (`X-CRM-Signature`), verified in each endpoint.

#### n8n Workflow Specs

**Apify Scraper Workflow:**
```
Schedule (cron: */4h)
  → HTTP Request (Apify: run actor, wait for finish)
  → Code node (deduplicate by email against CRM /api/leads?email=X)
  → Loop node (for each new lead)
      → HTTP Request (POST /api/leads)
  → Slack (summary message)
```

**Enrichment Workflow:**
```
Webhook (POST from CRM on lead create)
  → HTTP Request (Clearbit /v2/companies/find?domain=)
  → IF (employees > 100 AND industry in ICP list)
      → HTTP Request (PATCH /api/leads/:id with enriched data)
      → Slack (notify SDR)
  → ELSE → no-op
```

**Closed Won Workflow:**
```
Webhook (POST from CRM on deal stage change)
  → IF (new_stage == "Closed Won")
      → HTTP Request (POST /api/activities — log note)
      → Slack (#revenue-wins message)
      → HTTP Request (Asana — create onboarding task)
```

#### Environment Variables Added (Phase 3)

```
N8N_WEBHOOK_SECRET=<hmac secret>
APIFY_API_TOKEN=<token>
CLEARBIT_API_KEY=<key>
SENDGRID_API_KEY=<key>
SLACK_BOT_TOKEN=<token>
SLACK_CHANNEL_WINS=#revenue-wins
SLACK_CHANNEL_LEADS=#new-leads
```

---

## 6. Phase 4 — AI & LLM Features

### 6.1 PRD

#### Goals

- Make business card scanning fully functional with real OCR + Claude/GPT field extraction.
- Add AI-powered lead scoring to prioritize the review queue.
- Transcribe and summarize sales calls automatically.
- Generate AI-written email drafts for SDRs.
- Surface "next best action" recommendations on deal cards.

#### Features

**Feature A: Business Card OCR + LLM Extraction (Live)**

Current state: Multi-step UI is implemented with mock processing. This phase makes it real.

- Image uploaded → stored to S3.
- n8n workflow calls **Google Cloud Vision API** (or Tesseract.js) for raw text extraction.
- Raw text passed to **Claude 3.5 Sonnet** (via Anthropic API) with a structured extraction prompt.
- Claude returns: `{ first_name, last_name, email, phone, job_title, company, website }` as JSON.
- Confidence score calculated from Claude's response or by checking field completeness.
- Extracted fields returned to frontend review step.

**Feature B: Lead Scoring**

- On lead creation (or enrichment), an LLM assesses the lead against the Ideal Customer Profile (ICP).
- Inputs: company size, industry, job title, lead source, email domain.
- Outputs: `score: 0–100`, `tier: "Hot" | "Warm" | "Cold"`, `reasoning: string`.
- Score and tier displayed as badges on the Lead Queue table row.
- SDRs can filter by tier (Hot leads reviewed first).

**Feature C: Call Transcription & Summary**

- AE or SDR uploads a call recording (MP3/WAV) from the "Log Activity" modal.
- Audio sent to **Whisper API** (OpenAI) or **AssemblyAI** for transcription.
- Transcript passed to Claude for: 3-sentence summary, next steps extraction, sentiment tagging.
- Result stored as an activity with type "call_log", with `transcript` and `summary` fields.
- Summary shown in Activity Timeline; full transcript expandable.

**Feature D: AI Email Draft**

- From Contact detail panel, "Send Email" button → opens email composer.
- "Draft with AI" button sends context to Claude: contact name, company, recent activities, deal stage.
- Claude returns a personalized email draft (subject + body).
- User edits and sends via integrated email (Phase 5) or copies to clipboard.

**Feature E: Next Best Action on Deals**

- On the Deals Kanban, each card shows a subtle AI suggestion badge.
- Background job (runs daily via n8n cron) sends deal context to Claude:
  - Deal name, stage, days in stage, account info, recent activities, comparable closed deals.
- Claude returns: `action: string`, `urgency: "high"|"medium"|"low"`.
- Suggestions shown inline: e.g., "📞 Follow up — no activity in 7 days" or "📄 Send proposal — demo held 3 days ago."

### 6.2 TRD

#### AI Services Used

| Feature | Service | Model | Cost Notes |
|---------|---------|-------|-----------|
| Business Card OCR | Google Cloud Vision API | Vision v1 | Per-image |
| Business Card Extraction | Anthropic Claude | claude-sonnet-4-6 | Per-token |
| Lead Scoring | Anthropic Claude | claude-haiku-4-5 | Batch, cheap |
| Call Transcription | OpenAI Whisper / AssemblyAI | whisper-1 | Per-minute audio |
| Call Summarization | Anthropic Claude | claude-sonnet-4-6 | Per transcript |
| Email Draft | Anthropic Claude | claude-sonnet-4-6 | On-demand |
| Next Best Action | Anthropic Claude | claude-haiku-4-5 | Daily batch |

#### Business Card API Design

```
POST /api/business-card/extract
  Body: { imageUrl: string }  (S3 pre-signed URL)
  Response: {
    fields: { first_name, last_name, email, phone, job_title, company, website },
    confidence: number,          // 0-1
    raw_ocr_text: string,
    processing_steps: Step[]
  }
```

**LLM Prompt (Business Card):**
```
You are extracting contact information from business card OCR text.
Return a JSON object with exactly these keys:
{ first_name, last_name, email, phone, job_title, company, website }
Use null for any field not found. Clean and normalize the data (proper case names, E.164 phone format, lowercase email).

OCR Text:
<raw_text>
```

#### Lead Scoring API Design

```
POST /api/leads/:id/score
  Body: {} (lead data fetched server-side)
  Response: {
    score: number,          // 0-100
    tier: "Hot"|"Warm"|"Cold",
    reasoning: string,      // 1-2 sentences
    icp_signals: string[]   // matched ICP criteria
  }
```

**LLM Prompt (Lead Scoring):**
```
You are a B2B sales qualification expert for UFTech, a technology company.
Our ICP: SaaS companies, 50-500 employees, VP or C-suite title, technology industry.

Score this lead 0-100 and classify as Hot/Warm/Cold.

Lead: {{ JSON.stringify(lead) }}

Return JSON: { score: number, tier: string, reasoning: string, icp_signals: string[] }
```

#### Whisper + Claude Call Summarization

```
POST /api/activities/transcribe
  Body: { audioUrl: string, entityType: string, entityId: string }
  Response: {
    transcript: string,
    summary: string,       // 3 sentences
    next_steps: string[],
    sentiment: "positive"|"neutral"|"negative"
  }
```

Flow:
1. Upload audio to S3, get URL.
2. POST to `/api/activities/transcribe`.
3. Server downloads audio → sends to Whisper → gets transcript.
4. Server sends transcript + deal context to Claude → gets summary + next steps.
5. Activity record created: `{ activity_type: "call_log", description: summary, metadata: { transcript, next_steps, sentiment } }`.

#### Next Best Action Background Job (n8n)

```
n8n Schedule (daily 6am)
  → HTTP Request (GET /api/deals?stage=not_closed)
  → For each deal:
      → Code node (build context object)
      → HTTP Request (POST /api/deals/:id/suggest-action)
          → Server calls Claude haiku with deal context
          → Returns { action, urgency }
      → PATCH /api/deals/:id (store suggestion)
  → Done
```

#### Anthropic SDK Integration

```ts
// lib/ai/claude.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function extractBusinessCard(ocrText: string) {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{ role: "user", content: BUSINESS_CARD_PROMPT + ocrText }],
  });
  return JSON.parse((message.content[0] as { text: string }).text);
}

export async function scoreLeadWithLLM(lead: Lead) {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [{ role: "user", content: buildLeadScoringPrompt(lead) }],
  });
  return JSON.parse((message.content[0] as { text: string }).text);
}
```

#### New Environment Variables (Phase 4)

```
ANTHROPIC_API_KEY=<key>
OPENAI_API_KEY=<key>          # Whisper transcription
GOOGLE_VISION_API_KEY=<key>   # Business card OCR
AWS_S3_BUCKET=uft-crm-uploads
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<key>
AWS_REGION=ap-south-1
```

---

## 7. Phase 5 — Analytics, Reporting & Enterprise

### 7.1 PRD

#### Goals

- Advanced pipeline analytics: win rates, deal velocity, stage conversion funnels.
- Revenue forecasting with probability-weighted pipeline.
- Email sequence automation for SDR outreach.
- CSV/PDF export for all entities and reports.
- Multi-org support for managing multiple business units.
- Mobile-responsive design and PWA support.

#### Features

**Revenue Forecasting**
- Dashboard widget: weighted pipeline forecast = Σ(deal amount × win probability %).
- Monthly forecast vs. actuals line chart (trailing 6 months + 3-month forecast).
- "Commit" vs "Best Case" vs "Pipeline" forecast bands.

**Deal Velocity Analytics**
- Average days per stage across all historical deals.
- Identify bottleneck stages (longest average time before moving).
- Cohort analysis: deals closed this quarter vs. last quarter.

**Stage Conversion Funnel**
- Funnel chart: % of deals making it from each stage to the next.
- Drill-down by owner, industry, deal size bucket.

**Email Sequences**
- SDRs define outreach sequences: Day 1 (intro email), Day 3 (follow-up), Day 7 (breakup email).
- Sequences automatically enroll approved leads.
- SendGrid integration for actual email delivery.
- Open/click tracking linked to activity log.

**CSV/PDF Export**
- Any table view (Leads, Contacts, Accounts, Deals, Activities) has an "Export" button.
- Exports current filtered view as CSV.
- Deal summary report as PDF (using `jsPDF` or server-side Puppeteer).

**Saved Views / Filters**
- Users can save filter combinations as named views (e.g., "My Open Deals", "Hot Leads This Week").
- Views persist per-user in the database.

### 7.2 TRD

#### Analytics Queries

All analytics computed server-side via PostgreSQL aggregation queries. Exposed via dedicated analytics endpoints:

```
GET /api/analytics/pipeline-by-stage    (bar chart data)
GET /api/analytics/revenue-over-time    (line chart data)
GET /api/analytics/deal-velocity        (avg days per stage)
GET /api/analytics/conversion-funnel    (funnel percentages)
GET /api/analytics/forecast             (weighted pipeline)
```

**Weighted Forecast Query (PostgreSQL):**
```sql
SELECT
  DATE_TRUNC('month', expected_close_date) AS month,
  SUM(total_amount * (ps.win_probability / 100.0)) AS weighted_revenue
FROM deals d
JOIN pipeline_stages ps ON d.stage_id = ps.id
WHERE d.stage_id NOT IN (SELECT id FROM pipeline_stages WHERE name IN ('Closed Won', 'Closed Lost'))
GROUP BY 1
ORDER BY 1;
```

#### Email Sequences (SendGrid)

```
sequences (id, name, description, created_by)
sequence_steps (id, sequence_id, step_number, delay_days, subject, body_template)
sequence_enrollments (id, sequence_id, contact_id, current_step, status, enrolled_at)
```

n8n cron (daily):
1. Find enrollments where `(current_step.delay_days + enrolled_at) <= today`.
2. Send email via SendGrid dynamic templates.
3. Log activity: `{ activity_type: "email", entity_type: "contact", entity_id }`.
4. Increment `current_step`; if last step, set `status: "completed"`.

#### PDF Export

Server-side: Next.js API route runs Puppeteer to render a print-optimized page and returns PDF:

```
GET /api/export/deals?format=pdf&filter=open
  → Puppeteer renders /print/deals?filter=open
  → Returns application/pdf
```

#### Multi-Org Architecture

- Add `organizations` table; every entity gets `org_id FK`.
- Users belong to an organization via `org_memberships`.
- All API queries filter by `req.user.org_id`.
- Subdomain routing: `[org].crm.uft.com` maps to org via middleware lookup.

#### PWA & Mobile

- `app/manifest.ts` for Next.js PWA manifest.
- `next-pwa` (or native Service Worker via `app/sw.ts`) for offline caching of static assets.
- Responsive breakpoints: Sidebar collapses to icon-only on < 768px; Kanban board scrolls horizontally on mobile.

---

## 8. Full System Architecture (All Phases)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Next.js Client)                       │
│  React 19 · TypeScript · Tailwind CSS · Recharts · @dnd-kit            │
│  SWR / React Query data layer  ·  ThemeContext  ·  Auth session         │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────────────────┐
│                     Next.js App Server (Edge/Node)                       │
│  App Router · Route Handlers (/api/*) · Middleware (auth + RBAC)        │
│  Prisma ORM · JWT verification · Webhook HMAC validation                │
└──────┬────────────────┬────────────────┬────────────────────────────────┘
       │                │                │
       ▼                ▼                ▼
┌──────────┐   ┌────────────────┐  ┌────────────────────────────────────┐
│PostgreSQL│   │  S3 / Storage  │  │         External Services          │
│          │   │  (images,      │  │  ┌────────────────────────────────┐│
│ Prisma   │   │   audio files) │  │  │ n8n (self-hosted)              ││
│ schema   │   └────────────────┘  │  │  ├── Apify (LinkedIn scraper)  ││
│          │                       │  │  ├── Clearbit (enrichment)     ││
└──────────┘                       │  │  ├── Slack (notifications)     ││
                                   │  │  ├── SendGrid (email)          ││
                                   │  │  └── Asana (tasks)             ││
                                   │  ├────────────────────────────────┤│
                                   │  │ Anthropic Claude API           ││
                                   │  │  ├── claude-sonnet-4-6 (OCR)  ││
                                   │  │  ├── claude-sonnet-4-6 (email)││
                                   │  │  └── claude-haiku-4-5 (score) ││
                                   │  ├────────────────────────────────┤│
                                   │  │ OpenAI Whisper (transcription) ││
                                   │  ├────────────────────────────────┤│
                                   │  │ Google Cloud Vision (OCR)      ││
                                   │  └────────────────────────────────┘│
                                   └────────────────────────────────────┘
```

---

## 9. Data Models (Canonical)

Final TypeScript interfaces for all entities (Phase 2+):

```ts
// types/index.ts

export type LeadSource = "n8n_apify" | "manual_ocr" | "inbound_web";
export type LeadStatus = "new" | "reviewing" | "approved" | "rejected";
export type DealCurrency = "USD" | "INR" | "EUR";
export type ActivityType = "call_log" | "email" | "note" | "meeting";
export type EntityType = "lead" | "contact" | "account" | "deal";
export type BillingType = "recurring" | "one_time";
export type UserRole = "System Admin" | "RevOps Manager" | "Account Executive" | "SDR";
export type LeadTier = "Hot" | "Warm" | "Cold";

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company_name: string;
  source: LeadSource;
  status: LeadStatus;
  owner_id: string | null;
  score: number | null;         // Phase 4
  tier: LeadTier | null;        // Phase 4
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  account_id: string | null;
  account_name: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  job_title: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  name: string;
  domain: string;
  industry: string;
  website: string;
  employee_count: number;
  annual_revenue: number;
  founded_year: number;
  owner_id: string | null;
  contacts: Contact[];
  deals: Deal[];
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  sort_order: number;
  win_probability: number;
}

export interface Deal {
  id: string;
  name: string;
  stage_id: string;
  owner: string;
  account_name: string;
  contact: string;
  total_amount: number;
  currency: DealCurrency;
  line_items: DealLineItem[];
  next_action: string | null;       // Phase 4 AI suggestion
  next_action_urgency: "high" | "medium" | "low" | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface DealLineItem {
  id: string;
  deal_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Activity {
  id: string;
  user: string;
  entity_type: EntityType;
  entity_name: string;
  entity_id: string;
  activity_type: ActivityType;
  description: string;
  transcript: string | null;        // Phase 4
  summary: string | null;           // Phase 4
  sentiment: "positive" | "neutral" | "negative" | null;
  created_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  base_price: number;
  billing_type: BillingType;
  is_active: boolean;
  created_at: string;
}
```

---

## 10. Role-Based Access Control Matrix

| Permission | System Admin | RevOps Manager | Account Executive | SDR |
|-----------|:---:|:---:|:---:|:---:|
| **Leads** | | | | |
| View leads | ✓ | ✓ | ✓ (own) | ✓ |
| Create leads | ✓ | ✓ | — | ✓ |
| Edit leads | ✓ | ✓ | — | ✓ (own) |
| Approve/Reject leads | ✓ | ✓ | — | ✓ |
| Delete leads | ✓ | ✓ | — | — |
| **Contacts** | | | | |
| View contacts | ✓ | ✓ | ✓ | ✓ (created) |
| Create contacts | ✓ | ✓ | ✓ | ✓ |
| Edit contacts | ✓ | ✓ | ✓ | — |
| Delete contacts | ✓ | ✓ | — | — |
| **Accounts** | | | | |
| View accounts | ✓ | ✓ | ✓ | ✓ (read) |
| Create accounts | ✓ | ✓ | ✓ | — |
| Edit accounts | ✓ | ✓ | ✓ (own) | — |
| Delete accounts | ✓ | ✓ | — | — |
| **Deals** | | | | |
| View deals | ✓ | ✓ | ✓ (own) | — |
| Create deals | ✓ | ✓ | ✓ | — |
| Edit / Move stages | ✓ | ✓ | ✓ (own) | — |
| Close Won / Close Lost | ✓ | ✓ | ✓ (own) | — |
| Delete deals | ✓ | ✓ | — | — |
| **Activities** | | | | |
| View activities | ✓ | ✓ | ✓ | ✓ (own) |
| Log activities | ✓ | ✓ | ✓ | ✓ |
| Delete activities | ✓ | ✓ | — | — |
| **Products** | | | | |
| View products | ✓ | ✓ | ✓ | ✓ |
| Create/Edit/Delete | ✓ | ✓ | — | — |
| **Settings** | | | | |
| View users | ✓ | ✓ | — | — |
| Invite / Deactivate users | ✓ | — | — | — |
| Manage roles | ✓ | — | — | — |
| Configure integrations | ✓ | ✓ | — | — |
| **Analytics** | | | | |
| Dashboard | ✓ | ✓ | ✓ | ✓ (limited) |
| Full pipeline reports | ✓ | ✓ | ✓ (own) | — |
| Forecast reports | ✓ | ✓ | — | — |
| Export CSV/PDF | ✓ | ✓ | ✓ (own) | — |
