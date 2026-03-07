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

## Phase 0 — Project Foundation

### 0.1 Repository & Tooling Setup
- [ ] Initialize Next.js project with App Router and TypeScript
- [ ] Configure ESLint, Prettier, and path aliases (`@/`)
- [ ] Set up environment variable structure (`.env.local`, `.env.example`)
- [ ] Initialize Supabase project (cloud or local CLI)
- [ ] Connect Supabase CLI to project (`supabase link`)

### 0.2 Database Schema
- [ ] Run the full schema migration SQL in Supabase (see `supabase/migrations/`)
- [ ] Verify all tables, enums, indexes, and RLS policies are created correctly
- [ ] Register the `custom_access_token_hook` in Supabase Dashboard
  (Authentication > Hooks > Custom Access Token Hook)
- [ ] Enable Realtime for `approval_requests`, `agent_runs`, `notifications`
  in Supabase Dashboard (Database > Replication)
- [ ] Run seed data SQL and verify demo state in Supabase Table Editor

### 0.3 Auth Setup
- [ ] Enable Email/Password auth in Supabase Dashboard
- [ ] Enable Google OAuth provider in Supabase Dashboard
- [ ] Configure redirect URLs for local and production
- [ ] Verify JWT contains `user_role` claim after login (use jwt.io to inspect)

---

## Phase 1 — Core Infrastructure (Next.js + Supabase)

### 1.1 Supabase Client Setup
- [ ] Create `lib/supabase/client.ts` — browser client (anon key)
- [ ] Create `lib/supabase/server.ts` — server client (uses cookies, for API routes)
- [ ] Create `lib/supabase/admin.ts` — service role client (server-side only, never expose to client)
- [ ] Create TypeScript types from Supabase schema (`supabase gen types typescript`)
- [ ] Set up `middleware.ts` for session refresh on all routes

### 1.2 Auth Flow
- [ ] Login page (`/login`) — Email/Password + Google OAuth button
- [ ] Sign-up page (`/signup`) — Email/Password only, sets role = tenant by default
- [ ] Auth callback route (`/auth/callback`) — handles OAuth redirect
- [ ] Protected route middleware — redirect to `/login` if not authenticated
- [ ] Role-based redirect after login:
  - `admin` / `property_manager` → `/dashboard`
  - `tenant` → `/portal`

### 1.3 Layout & Navigation
- [ ] Root layout with Supabase session provider
- [ ] Dashboard layout for property managers (sidebar navigation)
- [ ] Portal layout for tenants (simple header navigation)
- [ ] Shared UI components: Button, Card, Badge, StatusBadge, LoadingSpinner

---

## Phase 2 — Tenant Portal (Web Form Intake Channel)

### 2.1 Damage Report Submission Form
- [ ] Page: `/portal/report/new`
- [ ] Form fields: title, description, location in property, optional image upload
- [ ] Image upload to Supabase Storage (`damage-report-images` bucket)
- [ ] On submit: POST to `/api/reports` → creates `damage_reports` row with
  `status = received`, `channel = web_form`
- [ ] After submission: redirect to `/portal/report/[id]` with confirmation

### 2.2 Tenant Report List
- [ ] Page: `/portal` — lists all damage reports for the logged-in tenant
- [ ] Show: title, status badge, created date, channel icon
- [ ] RLS ensures tenants only see their own reports

### 2.3 Tenant Report Detail
- [ ] Page: `/portal/report/[id]`
- [ ] Shows full report details, current status, timeline of updates
- [ ] Shows linked booking (craftsman name, scheduled date) if booked
- [ ] Supabase Realtime subscription on the report row → live status updates

---

## Phase 3 — LangGraph Agent (Core AI Logic)

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
- [ ] Page: `/dashboard` — table of all damage reports
- [ ] Filters: status, priority, property, date range
- [ ] Each row shows: tenant name, property, title, status, priority, created date
- [ ] Click to open report detail

### 4.2 Report Detail (Manager View)
- [ ] Page: `/dashboard/reports/[id]`
- [ ] Full report details + all agent run steps (expandable trace)
- [ ] Linked booking details
- [ ] Manual status override (for edge cases)

### 4.3 Human-in-the-Loop Approval UI
- [ ] Supabase Realtime subscription on `approval_requests WHERE status = pending`
- [ ] Toast/banner notification when new approval request arrives
- [ ] Modal or page: shows damage report context + estimated cost
- [ ] Approve / Reject buttons → calls `POST /api/approvals/[id]/decide`
- [ ] After decision: approval request disappears from pending list

### 4.4 Agent Run Observability
- [ ] Page: `/dashboard/agent-runs`
- [ ] Table of all agent runs with status, report link, duration, token usage
- [ ] Detail view: step-by-step trace of what the agent did (expandable JSONB steps)
- [ ] Supabase Realtime on `agent_runs` → live status updates

### 4.5 Property & Craftsman Management
- [ ] Page: `/dashboard/properties` — list + create/edit properties
- [ ] Page: `/dashboard/craftsmen` — list + create/edit craftsmen
- [ ] These are simple CRUD pages, no complex logic needed

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