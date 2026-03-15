# Autonomous Property Manager — Implementation Plan

## How to Use This File

This file is the single source of truth for what gets built, in what order, and
what "done" means for each step. Before starting any task, check this file.
Before adding anything new, check if it's in this plan.

**Do not implement features that are not listed here without updating this plan first.**

Update the status of each task as you work:
- `[ ]` = not started
- `[~]` = in progress
- `[x]` = done

---

## Agent Behaviour: Always Ask Before Implementing

Before starting **any** task or phase, the agent must ask clarifying questions
to gather the information needed to do the job well. Do not assume — ask.

**When to ask:**
- At the start of every new phase or task
- When a task has multiple valid approaches (e.g. library choice, folder structure)
- When requirements are ambiguous or could be interpreted in more than one way
- When a decision now would be hard to reverse later (e.g. data model, API design)
- When external configuration is needed (e.g. credentials, provider setup, env vars)

**How to ask:**
- Present questions as clear, discrete choices where possible (not open-ended walls of text)
- Group related questions together — ask everything you need upfront, not one at a time
- For each question, briefly explain *why* it matters for the implementation
- Maximum 3 questions per round to avoid overwhelming

**Examples of good clarifying questions:**

Before implementing the Auth Flow (Phase 1.2):
> "Before I implement the auth flow, I have two questions:
> 1. After login, should property managers land on the reports overview or a dedicated home/stats page?
> 2. Should the signup form allow tenants to self-register, or should tenants only be created by a property manager inviting them?"

Before implementing the Agent Tools (Phase 3.2):
> "Before I build the `find_craftsman` tool:
> 1. Should the agent pick the craftsman automatically based on specialization + availability, or propose a shortlist for the property manager to choose from?
> 2. Should craftsman availability be tracked in the DB (calendar), or is a simple 'is_active' flag sufficient for the PoC?"

**What not to do:**
- Do not start writing code and then ask halfway through
- Do not make assumptions about UI layout, business logic, or integrations without asking
- Do not ask about things already clearly defined in OVERVIEW.md or this file

---

## Agent Behaviour: Document As You Build

After completing any significant implementation, the agent must write a
corresponding `.md` documentation file and place it in the correct location
in the `docs/` directory. Documentation is part of the task — a task is not
done until its doc is written.

**Documentation structure:**

```
docs/
├── backend/
│   ├── database-schema.md        ← tables, enums, RLS overview, key decisions
│   ├── supabase-setup.md         ← how to set up the Supabase project from scratch
│   └── erp-adapter.md            ← ERP adapter interface + integration analysis
├── agent/
│   ├── architecture.md           ← LangGraph graph overview, state, flow diagram
│   ├── tools.md                  ← one section per tool: purpose, input, output, side effects
│   └── hitl.md                   ← human-in-the-loop flow, how resumption works
├── frontend/
│   ├── dashboard.md              ← property manager dashboard: pages, components, Realtime
│   └── portal.md                 ← tenant portal: pages, components, form flow
├── integrations/
│   ├── email.md                  ← Resend inbound/outbound setup + webhook format
│   └── whatsapp.md               ← Twilio setup + webhook format + media handling
└── auth.md                       ← auth flow, roles, JWT hook, RLS connection
```

**When to write a doc:**
- After completing a full phase or sub-phase
- After any non-obvious architectural decision (document *what* was decided and *why*)
- After setting up any external service or integration (document setup steps)
- After writing any complex piece of logic (document how it works for future reference)

**What a good doc contains:**
- **Purpose**: what this module/feature does and why it exists
- **How it works**: a brief explanation + code snippets or SQL where helpful
- **Key decisions**: any trade-offs or choices made during implementation
- **Setup / configuration**: anything another developer needs to know to run this locally
- **Known limitations**: what is mocked, simplified, or deferred for later

**Format rules:**
- Use clear headings (`##`, `###`)
- Keep it concise — docs are for orientation, not exhaustive API references
- Include short code blocks where they add clarity
- Update existing docs if implementation changes — never leave docs out of sync

**Example: after completing Phase 3.2 (Agent Tools), write `docs/agent/tools.md`:**

```markdown
## Tool: find_craftsman

**Purpose:** Queries the craftsmen table to find an active vendor matching
the damage category of the report.

**Input:** `{ damage_category: string, property_id: string }`
**Output:** `{ craftsman_id: string, company_name: string, phone: string }`

**How it works:** Uses a Postgres array overlap query on the specializations
column. Returns the first active match. If no match found, returns null and
the agent falls back to notifying the property manager manually.

**Known limitations:** No availability/calendar check in PoC — assumes all
active craftsmen are available.
```

---

## Phase 0 — Project Foundation

### 0.1 Repository & Tooling Setup
- [x] Initialize Next.js project with App Router and TypeScript
- [x] Configure ESLint, Prettier, and path aliases (`@/`)
- [x] Set up environment variable structure (`.env.local`, `.env.example`)
- [x] Initialize Supabase project (cloud or local CLI)
- [x] Connect Supabase CLI to project (`supabase link`)

### 0.2 Database Schema
- [x] Run the full schema migration SQL in Supabase (see `supabase/migrations/`)
- [x] Verify all tables, enums, indexes, and RLS policies are created correctly
- [x] Register the `custom_access_token_hook` in Supabase Dashboard
- [x] Enable Realtime for `approval_requests`, `agent_runs`, `notifications`
- [x] Create storage bucket `damage-report-images`
- [x] Run seed data SQL and verify demo state in Supabase Table Editor

### 0.3 Auth Setup
- [x] Enable Email/Password auth in Supabase Dashboard
- [ ] Enable Google OAuth provider in Supabase Dashboard (optional for PoC)
- [x] Configure redirect URLs for local
- [x] Verify JWT contains `user_role` claim after login (hook registered, code path verified)

---

## Phase 1 — Core Infrastructure (Next.js + Supabase)

### 1.1 Supabase Client Setup
- [x] Create `lib/supabase/client.ts` — browser client (anon key)
- [x] Create `lib/supabase/server.ts` — server client (uses cookies, for API routes)
- [x] Create `lib/supabase/admin.ts` — service role client (server-side only, never expose to client)
- [x] Create TypeScript types from Supabase schema (`supabase gen types typescript`)
- [x] Set up `middleware.ts` for session refresh on all routes

### 1.2 Auth Flow
- [x] Login page (`/login`) — Email/Password + Google OAuth button
- [x] Sign-up page (`/signup`) — Email/Password only, sets role = property_manager (invite-only for tenants)
- [x] Auth callback route (`/auth/callback`) — handles OAuth redirect
- [x] Protected route middleware — redirect to `/login` if not authenticated
- [x] Role-based redirect after login:
  - `admin` / `property_manager` → `/dashboard`
  - `tenant` → `/portal`

### 1.3 Layout & Navigation
- [x] Root layout with Toaster for notifications
- [x] Dashboard layout for property managers (sidebar navigation + header with user menu)
- [x] Portal layout for tenants (simple header navigation)
- [x] Shared UI components: Button, Card, Badge, StatusBadge, LoadingSpinner

---

## Phase 2 — Tenant Portal (Web Form Intake Channel)

### 2.1 Damage Report Submission Form
- [x] Page: `/portal/report/new`
- [x] Form fields: title, description, location in property, optional image upload (max 5)
- [x] Image upload to Supabase Storage (`damage-report-images` bucket)
- [x] On submit: Server action creates `damage_reports` row with
  `status = received`, `channel = web_form`
- [x] After submission: redirect to `/portal/report/[id]` with confirmation

### 2.2 Tenant Report List
- [x] Page: `/portal` — lists all damage reports for the logged-in tenant
- [x] Show: title, status badge, created date, channel icon
- [x] RLS ensures tenants only see their own reports

### 2.3 Tenant Report Detail
- [x] Page: `/portal/report/[id]`
- [x] Shows full report details, current status, visual timeline of updates
- [x] Shows linked booking (craftsman name, scheduled date) if booked
- [x] Supabase Realtime subscription on the report row → live status updates

---

## Phase 3 — LangGraph Agent (Core AI Logic)

> **⚠️ HINWEIS:** Phase 3 wird von einem Kollegen separat implementiert (LangGraph/LangChain Setup).
> Die restlichen Phasen (4, 5, 6, 7) werden parallel vorbereitet, ohne Agent-Integration.
> Der Aufruf `runDamageReportAgent(reportId)` wird später angehängt, sobald der Agent fertig ist.
> — Stand: März 2026

### 3.1 Agent Infrastructure
- [ ] Install dependencies: `langchain`, `@langchain/anthropic`, `@langchain/langgraph`
- [ ] Create `lib/agent/graph.ts` — LangGraph StateGraph definition
- [ ] Define agent state schema (TypeScript interface)
- [ ] Create `lib/agent/tools/` directory
- [ ] Create `lib/agent/run.ts` — entry point function `runDamageReportAgent(reportId)`

### 3.2 Agent Tools (implement one by one, test each)
- [ ] `classify_damage_report` — reads report, returns priority + damage category
- [ ] `check_erp_mock` — queries `erp_mock_data` and `properties` for context
- [ ] `find_craftsman` — queries `craftsmen` table by specialization array
- [ ] `estimate_cost` — LLM-based rough cost estimate based on damage description
- [ ] `request_human_approval` — writes to `approval_requests`, sets agent run to
  `waiting_for_human`
- [ ] `book_craftsman` — writes to `bookings` table
- [ ] `send_notification` — writes to `notifications` table (actual sending: Phase 5)
- [ ] `update_report_status` — updates `damage_reports.status`

### 3.3 Agent Run Logging
- [ ] On agent start: create `agent_runs` row with `status = running`
- [ ] After each tool call: append step to `agent_runs.steps_taken` (JSONB array)
- [ ] On completion: update `agent_runs` with status, output_summary, tokens_used, duration_ms
- [ ] On error: update `agent_runs` with `status = failed`, `error_message`

### 3.4 Human-in-the-Loop Resumption
- [ ] API route: `POST /api/approvals/[id]/decide` — accepts `{decision: 'approved'|'rejected', notes?: string}`
- [ ] Updates `approval_requests` row
- [ ] Resumes the paused LangGraph agent run
- [ ] Agent continues from the `waiting_for_human` checkpoint

---

## Phase 4 — Property Manager Dashboard

### 4.1 Reports Overview
- [x] Page: `/dashboard` — table of all damage reports
- [x] Filters: status, priority, property, date range
- [x] Each row shows: tenant name, property, title, status, priority, created date
- [x] Click to open report detail

### 4.2 Report Detail (Manager View)
- [x] Page: `/dashboard/reports/[id]`
- [x] Full report details + all agent run steps (expandable trace)
- [x] Linked booking details
- [x] Manual status override (for edge cases)

### 4.3 Human-in-the-Loop Approval UI
- [x] Supabase Realtime subscription on `approval_requests WHERE status = pending`
- [x] Toast/banner notification when new approval request arrives
- [x] Modal or page: shows damage report context + estimated cost
- [x] Approve / Reject buttons → calls `POST /api/approvals/[id]/decide`
- [x] After decision: approval request disappears from pending list

### 4.4 Agent Run Observability
- [x] Page: `/dashboard/agent-runs`
- [x] Table of all agent runs with status, report link, duration, token usage
- [x] Detail view: step-by-step trace of what the agent did (expandable JSONB steps)
- [x] Supabase Realtime on `agent_runs` → live status updates

### 4.5 Property & Craftsman Management
- [x] Page: `/dashboard/properties` — list + create/edit properties
- [x] Page: `/dashboard/craftsmen` — list + create/edit craftsmen
- [x] These are simple CRUD pages, no complex logic needed

### 4.6 Enhanced Craftsman Categorization (Post-PoC Enhancement)
- [x] Database: `craft_groups` table (profession groups with sort_order)
- [x] Database: `specializations` table (linked to craft_groups)
- [x] Database: `craftsman_reviews` table (ratings: punctuality, quality, communication)
- [x] Database: `property_preferred_craftsmen` table (per-property preferences)
- [x] Database: Extended `craftsmen` table with `specialization_ids[]`, `avg_rating`, `hourly_rate`
- [x] Database: Trigger for auto-updating rating averages
- [x] Database: Seed data with 9 craft groups + ~35 specializations
- [x] UI: Page `/dashboard/craftsmen/categories` — manage craft groups + specializations
- [x] UI: Enhanced craftsmen list with group filter, star ratings, specialization picker
- [x] **Done:** Migration `002_craftsmen_categories.sql` applied to Supabase

> See [docs/CRAFTSMEN.md](docs/CRAFTSMEN.md) for concept documentation.

---

## Phase 5 — Email Intake Channel

### 5.1 Resend Inbound Setup
- [ ] Configure Resend inbound webhook domain (e.g. `inbound.yourdomain.com`)
- [ ] Create API route: `POST /api/webhooks/email` — receives Resend inbound payload
- [ ] Verify webhook signature (Resend signing secret)
- [ ] Parse: sender email → match to tenant, extract subject + body + attachments
- [ ] Create `damage_reports` row with `channel = email`, `raw_input_payload = full JSON`
- [ ] Trigger agent run

### 5.2 Email Notifications Out
- [ ] Configure Resend for outbound sending
- [ ] Create `lib/notifications/email.ts` — sends email via Resend SDK
- [ ] Hook into `send_notification` agent tool: if channel = email, call this

---

## Phase 6 — WhatsApp Intake Channel

### 6.1 Twilio WhatsApp Setup
- [ ] Configure Twilio WhatsApp Business sandbox or production number
- [ ] Create API route: `POST /api/webhooks/whatsapp` — receives Twilio webhook
- [ ] Verify Twilio webhook signature
- [ ] Parse: sender phone → match to tenant, extract text + media URLs
- [ ] Download and store media to Supabase Storage if image attached
- [ ] Create `damage_reports` row with `channel = whatsapp`, full payload
- [ ] Trigger agent run

### 6.2 WhatsApp Notifications Out
- [ ] Create `lib/notifications/whatsapp.ts` — sends message via Twilio API
- [ ] Hook into `send_notification` agent tool: if channel = whatsapp, call this

---

## Phase 7 — Polish & Demo Preparation

### 7.1 Demo Seed Data
- [ ] Ensure seed SQL produces a realistic, visually rich demo state
- [ ] At least: 1 pending approval, 1 running agent, 1 completed flow, all 3 channels represented

### 7.2 Error Handling & Edge Cases
- [ ] Unknown sender email/phone → create report with tenant_id = null, notify admin
- [ ] Agent failure → `agent_runs.status = failed`, send error notification to admin
- [ ] Approval timeout (no decision after X hours) → escalation notification

### 7.3 ERP Adapter Analysis (deliverable)
- [ ] Document DACH ERP systems: Rimo R5, Abacus, Immoware, W&W
- [ ] For each: available integration methods (REST, SOAP, CSV, DB direct)
- [ ] Define the ERP Adapter Interface (TypeScript interface) that all adapters must implement
- [ ] Document what it would take to go from mock to real ERP for each system

---

## Implementation Order Summary

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 (tools one by one) →
Phase 4 → Phase 5 → Phase 6 → Phase 7
```

**Never skip ahead.** Each phase builds on the previous one. A working
end-to-end flow with Web Form only (Phases 0-4) is more valuable than
a broken multi-channel system.

---

## Key Files & Directories (Target Structure)

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                        ← reports overview
│   │   ├── reports/[id]/page.tsx
│   │   ├── agent-runs/page.tsx
│   │   ├── properties/page.tsx
│   │   └── craftsmen/page.tsx
│   ├── (portal)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                        ← tenant report list
│   │   └── report/
│   │       ├── new/page.tsx
│   │       └── [id]/page.tsx
│   └── api/
│       ├── reports/route.ts
│       ├── approvals/[id]/decide/route.ts
│       ├── webhooks/
│       │   ├── email/route.ts
│       │   └── whatsapp/route.ts
│       └── agent/trigger/route.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── admin.ts
│   ├── agent/
│   │   ├── graph.ts
│   │   ├── run.ts
│   │   ├── state.ts
│   │   └── tools/
│   │       ├── classify.ts
│   │       ├── check-erp.ts
│   │       ├── find-craftsman.ts
│   │       ├── estimate-cost.ts
│   │       ├── request-approval.ts
│   │       ├── book-craftsman.ts
│   │       ├── send-notification.ts
│   │       └── update-status.ts
│   ├── notifications/
│   │   ├── email.ts
│   │   └── whatsapp.ts
│   └── types/
│       └── database.types.ts               ← generated by Supabase CLI
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed.sql
├── OVERVIEW.md                             ← you are here
├── PLAN.md                                 ← this file
└── middleware.ts
```