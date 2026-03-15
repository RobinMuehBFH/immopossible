# Immopossible

**Autonomous Property Management powered by AI**

An intelligent SaaS platform that automates damage report handling for property management companies. Built with Next.js, Supabase, and LangGraph.

---

## Overview

Immopossible replaces manual property management workflows with an AI-powered agent that:

- **Receives** damage reports via web form, email, or WhatsApp
- **Classifies** issues by priority and category automatically
- **Books** craftsmen based on specialization and availability
- **Notifies** tenants and managers at every step
- **Escalates** high-cost repairs (>500 CHF) for human approval

Traditional property management is manual, fragmented, and unscalable. Immopossible automates routine workflows so property managers can focus on what matters.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend & API | Next.js 16 (App Router, TypeScript) |
| Database & Auth | Supabase (PostgreSQL, RLS, Realtime) |
| AI Orchestration | LangGraph / LangChain |
| LLM | Claude (Anthropic API) |
| Email | Resend (inbound webhooks) |
| WhatsApp | Twilio WhatsApp Business API |
| Styling | Tailwind CSS 4 |

---

## Features

### Tenant Portal
- Submit damage reports with photos
- Track repair status in real-time
- Receive notifications via preferred channel

### Property Manager Dashboard
- Overview of all damage reports with filtering
- Agent activity trace and observability
- Human-in-the-loop approval for costly repairs
- Manage properties and craftsmen

### AI Agent
- Automatic damage classification and prioritization
- ERP integration (mocked for PoC)
- Craftsman matching by specialization
- Cost estimation and approval workflows

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/immopossible.git
cd immopossible

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run database migrations
npx supabase db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Login, signup routes
│   ├── (dashboard)/       # Property manager dashboard
│   ├── (portal)/          # Tenant portal
│   └── api/               # API routes & webhooks
├── components/            # Reusable UI components
├── lib/                   # Utilities, Supabase clients, types
├── supabase/              # Migrations and seed data
└── docs/                  # Technical documentation
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key
```

See `.env.example` for the full list.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run start` | Start production server |

---

## Documentation

- [OVERVIEW.md](OVERVIEW.md) — Project vision and architecture
- [PLAN.md](PLAN.md) — Implementation roadmap and progress
- [DESIGN.md](DESIGN.md) — UI/UX design system

---

## License

This project is part of a BFH Master's thesis. All rights reserved.

---

## Authors

- Robin Mühlemann — [BFH Master ARTI](https://www.bfh.ch)
