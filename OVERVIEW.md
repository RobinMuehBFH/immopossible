# Autonomous Property Manager — Project Overview

## What We Are Building

An agentic AI SaaS application for small-to-medium property management companies
(KMUs). The core idea: a LangGraph-powered AI agent receives damage reports from
tenants, autonomously triages them, interacts with a mocked ERP, books craftsmen,
and keeps everyone informed — without manual intervention from the property manager.

For high-cost orders (> 500 CHF), the agent pauses and triggers a human approval
step before proceeding.

This is a **PoC with real product potential**. The goal is a polished,
end-to-end demo that proves the concept and can evolve into a production product.

---

## The Problem We Solve

Traditional property management is:
- **Manual and fragmented**: managers read emails, call craftsmen, email tenants back
- **Bottlenecked by staff**: skilled property managers are scarce and expensive
- **Unscalable**: growth requires hiring, not automation

The AI agent replaces the "man in the middle" for routine damage report workflows.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend + API | Next.js (App Router) |
| Database + Auth + Realtime | Supabase (PostgreSQL) |
| AI Agent Orchestration | LangChain / LangGraph |
| LLM | Claude Opus 4.6 (via Anthropic API) |
| Email Inbound | Resend (inbound webhooks) |
| WhatsApp Inbound | Twilio WhatsApp Business API |
| Observability | LangSmith + Supabase agent_runs table |

---

## User Roles

| Role | Description | Access Level |
|---|---|---|
| `admin` | Superuser | Full access to everything |
| `property_manager` | Internal staff | Manages properties, approves high-cost orders |
| `tenant` | External user | Submits and tracks their own damage reports |
| `ai_agent` | Server-side service role | Bypasses RLS, reads/writes all tables |

Auth is handled via **Supabase Auth** (Email/Password + Google OAuth). The user
role is injected into the JWT via a custom Postgres hook so RLS policies can
evaluate it without extra DB round-trips.

---

## Intake Channels

Three ways a tenant can submit a damage report:

1. **Web Form** — built into the tenant-facing dashboard (simplest, built first)
2. **Email** — inbound webhook via Resend, parsed by the agent
3. **WhatsApp** — Twilio webhook, supports text + image attachments (built last)

All channels funnel into the same `damage_reports` table and trigger the same
LangGraph agent flow.

---

## The Agent Flow (Core Logic)

```
Intake (Email / WhatsApp / Web Form)
    ↓
Next.js API Route (webhook handler)
    ↓
LangGraph Agent starts a new run
    ├── Tool: classify_damage_report     → determines priority + category
    ├── Tool: check_erp_mock             → looks up property, tenant, contracts
    ├── Tool: find_craftsman             → queries craftsmen table by specialization
    ├── Tool: estimate_cost              → rough cost estimate
    │
    ├── [IF cost > 500 CHF]
    │       ↓
    │   Tool: request_human_approval     → writes to approval_requests table
    │   Agent status → waiting_for_human (pauses)
    │   Supabase Realtime → notifies property manager dashboard
    │   Property Manager approves/rejects in UI
    │   Agent resumes
    │
    ├── Tool: book_craftsman             → writes to bookings table
    ├── Tool: send_notification          → sends reply to tenant (email/WhatsApp/in-app)
    └── Agent run → completed
```

---

## Database Overview

Key tables and their purpose:

| Table | Purpose |
|---|---|
| `profiles` | Extends Supabase auth.users, stores role + contact info |
| `properties` | Real estate objects (Liegenschaften) |
| `tenants_properties` | Junction: which tenant lives in which property/unit |
| `damage_reports` | Core table — one row per incoming report |
| `craftsmen` | Mocked vendor/craftsman registry |
| `bookings` | Craftsman appointments linked to damage reports |
| `approval_requests` | Human-in-the-loop trigger table (Realtime enabled) |
| `agent_runs` | Observability — full trace of every agent execution |
| `notifications` | Outbound message log (email, WhatsApp, in-app) |
| `erp_mock_data` | Simulated ERP data for PoC (replaces real ERP integration) |

All tables have RLS enabled. The AI agent operates via `service_role` server-side
and bypasses RLS. Client-side access is always role-scoped.

---

## ERP Strategy

For the PoC, ERP data is fully mocked in the `erp_mock_data` table. The agent
tools use an **ERP Adapter Interface** pattern — the same function signatures
regardless of what backend is used. This means real ERP systems (Rimo R5, Abacus,
Immoware) can be connected later by swapping the adapter implementation, not the
agent logic.

A separate analysis of DACH-region ERP systems and their integration options
(REST API, SOAP, CSV export) is planned as part of the project deliverables.

---

## Human-in-the-Loop (HITL)

The HITL mechanism is one of the most important demo features:

1. Agent writes a row to `approval_requests` with `status = 'pending'`
2. Supabase Realtime pushes this to the property manager's dashboard instantly
3. The dashboard shows the request with full context (damage report, estimated cost)
4. Property manager clicks **Approve** or **Reject**
5. The API route updates `approval_requests.status` and resumes the agent run

**Rule**: Any action with `estimated_cost_chf > 500` triggers this flow.

---

## What Is Out of Scope (for now)

- Real ERP integration (mocked for PoC)
- Full CRM / tenant management (basic data only, to be analysed)
- Mobile app
- Multi-language support (English only for now)
- Billing / subscription management
- SLA tracking / reporting dashboards

---

## Guiding Principles

1. **Build end-to-end first, polish later** — a working full flow beats a perfect partial flow
2. **Web Form → Email → WhatsApp** — implement channels in this order
3. **Mock aggressively, abstract cleanly** — ERP mock must be swappable without touching agent logic
4. **HITL is a feature, not a workaround** — it should look polished in the demo
5. **Do not over-engineer** — no abstractions that aren't needed yet, no features not in the plan
6. **Security is non-negotiable** — RLS on all tables, service_role server-side only, never in client code