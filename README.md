# Immopossible

**Autonomous Property Management powered by AI**

An agentic SaaS platform that automates damage report handling for property management companies. A LangGraph AI agent receives reports from tenants, classifies them, books craftsmen, and notifies all parties — with a human-in-the-loop step for high-cost approvals.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend & API | Next.js 15 (App Router, TypeScript) |
| Database, Auth & Realtime | Supabase (PostgreSQL + RLS) |
| AI Agent Orchestration | LangGraph / LangChain |
| LLM | Claude (Anthropic API) |
| Email Inbound & Outbound | SendGrid (Inbound Parse + Mail Send) |
| WhatsApp Inbound & Outbound | Twilio WhatsApp Business API |
| Auth Session | NextAuth.js v5 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Local Tunnel | ngrok |

---

## Prerequisites

- Node.js 20+
- npm
- [ngrok](https://ngrok.com) account + CLI installed
- Supabase project (cloud)
- SendGrid account
- Twilio account with WhatsApp-enabled number
- Anthropic API key

---

## Local Setup

### 1. Clone & install

```bash
git clone <repo-url>
cd immopossible
npm install
```

### 2. Environment variables

Copy the example and fill in all values:

```bash
cp .env.example .env.local
```

`.env.local` must contain:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# NextAuth
AUTH_SECRET=<random-secret>          # generate with: openssl rand -base64 32

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# SendGrid
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=info@yourdomain.com
SENDGRID_FROM_NAME=ImmoPossible
SENDGRID_INBOUND_EMAIL=info@schaden.yourdomain.com
SENDGRID_WEBHOOK_URL=https://<ngrok-subdomain>.ngrok-free.dev/api/webhooks/sendgrid

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=+1...
TWILIO_WEBHOOK_URL=https://<ngrok-subdomain>.ngrok-free.dev/api/webhooks/twilio
```

### 3. Supabase setup

#### 3a. Run migrations

In the Supabase SQL Editor, run the migrations in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_craftsmen_categories.sql
```

Or via CLI:

```bash
npx supabase db push
```

#### 3b. Enable the custom JWT hook

The project uses a custom Postgres function to inject `user_role` into the JWT.

1. Go to **Supabase Dashboard → Authentication → Hooks**
2. Enable **"Custom Access Token"** hook
3. Set the function to: `public.custom_access_token_hook`

#### 3c. Enable Realtime

Go to **Supabase Dashboard → Database → Replication** and enable Realtime for:
- `approval_requests`
- `agent_runs`
- `notifications`

#### 3d. Run seed data (optional)

Run `supabase/seed.sql` in the Supabase SQL Editor to populate demo properties, craftsmen, and test users.

**Demo accounts (after seeding):**

| Role | Email | Password |
|---|---|---|
| Admin | admin@gmail.com | (set manually in Supabase Auth) |
| Property Manager | manager@gmail.com | (set manually in Supabase Auth) |
| Tenant | tenant@test.ch | (set manually in Supabase Auth) |

### 4. ngrok setup

ngrok is required for local development to receive webhooks from SendGrid and Twilio.

```bash
# Start ngrok on the port Next.js runs on (usually 3000 or 3001)
ngrok http 3001
```

Copy the generated HTTPS URL (e.g. `https://xxxx-xxxx.ngrok-free.dev`) and update:
- `SENDGRID_WEBHOOK_URL` in `.env.local`
- `TWILIO_WEBHOOK_URL` in `.env.local`
- The Destination URL in **SendGrid Dashboard → Settings → Inbound Parse**
- The Webhook URL in **Twilio Console → WhatsApp Sandbox Settings**

> **Note:** The ngrok URL changes every time you restart ngrok (unless you have a paid plan with a fixed domain). You must update all three places each time.

### 5. SendGrid Inbound Parse setup

To receive damage reports via email:

1. **DNS (your domain registrar):** Add an MX record for your inbound subdomain:
   - Hostname: `schaden` (or any subdomain)
   - Type: `MX`
   - Priority: `10`
   - Value: `mx.sendgrid.net`

2. **SendGrid Dashboard → Settings → Inbound Parse → Add Host & URL:**
   - Receiving Domain: `schaden.yourdomain.com`
   - Destination URL: `https://<ngrok-url>/api/webhooks/sendgrid`

3. **Verify sender:** Go to **SendGrid → Settings → Sender Authentication → Single Sender** and verify your from-address (e.g. `info@yourdomain.com`).

Tenants send emails to `info@schaden.yourdomain.com` to submit a damage report.

### 6. Twilio WhatsApp setup

1. In the [Twilio Console](https://console.twilio.com), go to **Messaging → Senders → WhatsApp Senders**
2. Set the inbound webhook URL to: `https://<ngrok-url>/api/webhooks/twilio`
3. Tenants send WhatsApp messages to your Twilio number to submit a report

### 7. Run the development server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) (or whichever port Next.js uses).

---

## Project Structure

```
├── app/
│   ├── (auth)/                  # /login, /signup
│   ├── (dashboard)/             # Property manager dashboard
│   │   └── dashboard/
│   │       ├── page.tsx         # Reports overview
│   │       ├── reports/[id]/    # Report detail + agent trace
│   │       ├── agent-runs/      # Agent observability
│   │       ├── properties/      # Property management
│   │       └── craftsmen/       # Craftsman management
│   ├── (portal)/                # Tenant portal (removed, now via WhatsApp/Email)
│   └── api/
│       ├── approvals/[id]/decide/   # HITL approve/reject endpoint
│       ├── agent/trigger/           # Manually trigger agent run
│       └── webhooks/
│           ├── sendgrid/        # Email inbound webhook
│           └── twilio/          # WhatsApp inbound webhook
├── components/                  # Reusable UI components
├── lib/
│   ├── agents/                  # LangGraph agent + tools
│   │   ├── run.ts               # Agent entry point
│   │   └── tools/               # classify, book, notify, etc.
│   ├── auth/                    # NextAuth config + route guards
│   ├── sendgrid/                # SendGrid outbound email
│   ├── supabase/                # Supabase clients (anon, server, admin)
│   └── twilio/                  # Twilio WhatsApp client
├── supabase/
│   ├── migrations/              # SQL migrations (run in order)
│   └── seed.sql                 # Demo seed data
└── types/                       # TypeScript types (DB + NextAuth)
```

---

## User Roles & Access

| Role | Access | Login redirects to |
|---|---|---|
| `admin` | Full access | `/dashboard` |
| `property_manager` | Dashboard, reports, approvals | `/dashboard` |
| `tenant` | Submits reports via email/WhatsApp | — |

New property managers can sign up at `/signup`. Tenant accounts are created by an admin in the Supabase dashboard (or via the `handle_new_user` trigger when created via the Supabase Auth admin API).

---

## Intake Channels

Damage reports can be submitted through three channels:

| Channel | How | Webhook |
|---|---|---|
| **Web Form** | Dashboard "New Report" button | — |
| **Email** | Send to `info@schaden.yourdomain.com` | `POST /api/webhooks/sendgrid` |
| **WhatsApp** | Message Twilio WhatsApp number | `POST /api/webhooks/twilio` |

All channels create a row in the `damage_reports` table and trigger the LangGraph agent automatically.

---

## Agent Flow

```
Intake (Email / WhatsApp / Web Form)
    ↓
damage_reports row created (status: received)
    ↓
LangGraph Agent triggered
    ├── classify_damage_report   → priority + category
    ├── check_erp_mock           → property & tenant context
    ├── find_craftsman           → match by specialization
    ├── estimate_cost            → rough CHF estimate
    │
    ├── [IF cost > 500 CHF]
    │       ↓
    │   request_human_approval   → writes to approval_requests
    │   Agent pauses (status: waiting_for_human)
    │   Property manager approves/rejects in dashboard
    │   Agent resumes
    │
    ├── book_craftsman           → writes to bookings
    ├── send_notification        → notifies tenant
    └── Agent completed
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## License

BFH Master ARTI — All rights reserved.

## Authors

- Tobias Bielmann
- Basil Sinzig
- Marc Hösli
- Joel Künzli
- Robin Mühlemann
