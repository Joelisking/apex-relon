# Apex CRM

A single-tenant, AI-enhanced CRM & Business Performance Dashboard built for **Apex Consulting & Surveying, Inc.** — a DBE/MBE/EBE land surveying firm in Fort Wayne, IN. Manages leads, clients, projects, quotes, cost breakdowns, proposals, tasks, time tracking, PTO, and sales pipelines with multi-provider AI (Anthropic Claude, OpenAI GPT-4o, Google Gemini), QuickBooks Online integration, and bottleneck analytics.

Built with **Next.js 16** (App Router) and a **NestJS** backend.

---

## Table of Contents

- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [System Flow](#system-flow)
- [Features](#features)
  - [Authentication & Authorization](#authentication--authorization)
  - [Executive Dashboard](#executive-dashboard)
  - [Leads (Prospective Projects)](#leads-prospective-projects)
  - [Client Management](#client-management)
  - [Contacts](#contacts)
  - [Project Management](#project-management)
  - [Addenda & Change Orders](#addenda--change-orders)
  - [Project Comments](#project-comments)
  - [Quotes](#quotes)
  - [Cost Breakdown & Estimating](#cost-breakdown--estimating)
  - [Proposals](#proposals)
  - [Products & Services Catalog](#products--services-catalog)
  - [Service Items](#service-items)
  - [Tasks](#tasks)
  - [Calendar](#calendar)
  - [Time Tracking](#time-tracking)
  - [Work Codes & Pay Grades](#work-codes--pay-grades)
  - [PTO Management](#pto-management)
  - [Workflows & Automation](#workflows--automation)
  - [Forecast & Targets](#forecast--targets)
  - [Lead Capture Forms](#lead-capture-forms)
  - [Notifications](#notifications)
  - [Custom Fields](#custom-fields)
  - [Reports & Analytics](#reports--analytics)
  - [Bottleneck Analytics](#bottleneck-analytics)
  - [AI Integration](#ai-integration)
  - [QuickBooks Online Integration](#quickbooks-online-integration)
  - [Administration](#administration)
  - [File Management](#file-management)
  - [Activity Tracking](#activity-tracking)
  - [Command Palette](#command-palette)
- [RBAC & Permissions](#rbac--permissions)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [AI Provider Configuration](#ai-provider-configuration)
- [Environment Variables](#environment-variables)
- [Development Commands](#development-commands)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 16)                    │
│                        http://localhost:3000                    │
│  ┌───────────┐  ┌────────────┐  ┌──────────┐  ┌────────────┐  │
│  │ App Router │  │ React Query│  │ Auth Ctx  │  │  Shadcn UI │  │
│  │  (SSR/CSR) │  │ (caching)  │  │ (JWT/RBAC)│  │  + Radix   │  │
│  └─────┬──────┘  └─────┬──────┘  └─────┬─────┘  └────────────┘  │
│        │               │               │                        │
│        └───────────────┴───────┬───────┘                        │
│                                │  REST (fetch) + SSE            │
└────────────────────────────────┼────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Backend (NestJS)                          │
│                       http://localhost:4000/api                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Auth      │  │ Leads    │  │ Clients  │  │ Projects      │  │
│  │ (JWT +    │  │ (Pipeline│  │ (Health  │  │ (Cost Logs    │  │
│  │ Passport) │  │  + AI)   │  │  + AI)   │  │  + Crews)     │  │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├───────────────┤  │
│  │ Quotes    │  │ Tasks    │  │ Workflows│  │ Forecast      │  │
│  │ (PDF +    │  │ (Assign/ │  │ (Rules + │  │ (Monthly +    │  │
│  │  Products)│  │  Notify) │  │  Cron)   │  │  Targets)     │  │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├───────────────┤  │
│  │ Forms     │  │ Contacts │  │Notific.  │  │ CustomFields  │  │
│  │ (Public   │  │ (Client/ │  │ (SSE +   │  │ (Def + Values │  │
│  │  Capture) │  │  Lead)   │  │  Prefs)  │  │  per entity)  │  │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├───────────────┤  │
│  │ Dashboard │  │ Reports  │  │ AI Svc   │  │ Admin         │  │
│  │(Custom    │  │ (4 cats) │  │ (3 provs)│  │ (Users/Roles) │  │
│  │ Widgets)  │  │          │  │          │  │               │  │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├───────────────┤  │
│  │ Pipeline  │  │ Teams    │  │ Files    │  │ Activities    │  │
│  │ (Stages)  │  │ (Org)    │  │ (GCP)    │  │ (Polymorphic) │  │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├───────────────┤  │
│  │QuickBooks │  │ Time     │  │Bottleneck│  │ Service Items │  │
│  │ (OAuth +  │  │ Tracking │  │(Analytics│  │ (Catalog +    │  │
│  │  Sync)    │  │ +WorkCode│  │  + AI)   │  │  Subtasks)    │  │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├───────────────┤  │
│  │ Cost      │  │ Proposals│  │ Addenda  │  │ PTO           │  │
│  │ Breakdown │  │ (DOCX    │  │ (Change  │  │ (Policies +   │  │
│  │ (Estimate)│  │  + PDF)  │  │  Orders) │  │  Approvals)   │  │
│  └─────┬─────┘  └──────────┘  └──────────┘  └───────────────┘  │
│        │                                                        │
│        ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Prisma ORM  →  PostgreSQL (Docker / hosted) │ GCP Storage │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

| Layer        | Technology                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| Frontend     | Next.js 16 (App Router), React 19, Tailwind CSS, Shadcn/Radix, React Query, Recharts, dnd-kit, react-big-calendar |
| Backend      | NestJS, Passport.js (JWT), Prisma ORM, Resend (email), @nestjs/schedule (cron), pdfmake (PDF)                     |
| Database     | PostgreSQL (Docker Compose or hosted)                                                                              |
| Storage      | Google Cloud Storage (private buckets, signed-URL streaming)                                                       |
| AI           | Anthropic Claude, OpenAI GPT-4o, Google Gemini (runtime switch)                                                   |
| Integrations | QuickBooks Online (OAuth 2.0, bidirectional sync, webhooks)                                                        |

---

## Project Structure

```
Relon-Apex/
├── README.md
├── CLAUDE.md
├── apex-relon-strategy.md          # Full product strategy & roadmap
├── PROGRESS.md                     # Implementation progress tracker
├── backend/                        # NestJS API server
│   ├── prisma/
│   │   ├── schema.prisma           # Full data schema (70+ models)
│   │   ├── seed.ts                 # Base data seeder
│   │   ├── seed.demo.ts            # Extended demo data seeder
│   │   └── migrations/             # PostgreSQL migrations (versioned)
│   ├── src/
│   │   ├── main.ts                 # Entry: port 4000, /api prefix, CORS, validation
│   │   ├── app.module.ts           # Root module — global guards (JWT + Permissions)
│   │   ├── auth/                   # Login, register, password reset, JWT strategy
│   │   ├── leads/                  # Prospective projects pipeline + AI risk analysis
│   │   ├── clients/                # Client portfolio + AI health + upsell
│   │   ├── contacts/               # Contact records scoped to clients/leads
│   │   ├── projects/               # Active projects + cost tracking + crew assignments
│   │   ├── addenda/                # Project change orders (addendum lines + approvals)
│   │   ├── comments/               # Project team comments + @mentions
│   │   ├── quotes/                 # Quote builder + PDF generation + lifecycle
│   │   ├── cost-breakdown/         # Estimation tool (role hours + direct expenses + PDF)
│   │   ├── proposal-templates/     # DOCX proposal template management
│   │   ├── products/               # Product/service catalog for quoting
│   │   ├── service-items/          # Service items + subtasks + role hour estimates
│   │   ├── tasks/                  # Task management linked to any entity
│   │   ├── time-tracking/          # Time entries + work codes + user rates + pay grades
│   │   ├── pto/                    # PTO policies, requests, and approval workflow
│   │   ├── workflows/              # Automation rules (triggers → conditions → actions)
│   │   ├── forecast/               # Revenue forecasting + monthly targets
│   │   ├── forms/                  # Public lead-capture forms
│   │   ├── notifications/          # Real-time SSE notifications + scheduler + email digest
│   │   ├── custom-fields/          # Per-entity custom field definitions + values
│   │   ├── dashboard/              # Executive metrics + AI summary + customizable layouts
│   │   ├── reports/                # 4 report categories (leads, projects, clients, reps)
│   │   ├── bottleneck/             # Stage dwell analytics + task velocity + AI reports
│   │   ├── quickbooks/             # QuickBooks Online OAuth + bidirectional sync + webhooks
│   │   ├── ai/                     # Multi-provider AI abstraction layer
│   │   │   ├── providers/          # Anthropic, OpenAI, Gemini implementations
│   │   │   ├── prompts/            # Template prompts for each AI capability
│   │   │   └── interfaces/         # AIProvider interface contract
│   │   ├── admin/                  # User CRUD, AI settings, audit logs, tenant settings
│   │   ├── permissions/            # RBAC permission matrix
│   │   ├── roles/                  # Role definitions (built-in + custom)
│   │   ├── pipeline/               # Customizable pipeline stages
│   │   ├── teams/                  # Organizational team structure
│   │   ├── activities/             # Polymorphic activity log (calls, meetings)
│   │   ├── files/                  # Polymorphic file upload/download (GCP)
│   │   ├── settings/               # Service types, task types, dropdown options
│   │   ├── email/                  # Transactional emails (Resend API)
│   │   ├── storage/                # GCP Cloud Storage abstraction
│   │   ├── audit/                  # Audit trail (14 tracked actions)
│   │   ├── health/                 # /api/health endpoint
│   │   └── database/               # Prisma client provider
│   └── package.json
│
├── frontend/                       # Next.js 16 app
│   ├── middleware.ts               # Route protection (auth redirect)
│   ├── app/
│   │   ├── layout.tsx              # Root: QueryProvider → CurrencyProvider → AuthProvider
│   │   ├── page.tsx                # / → redirect to /login or /dashboard
│   │   ├── (auth)/                 # Login, register, forgot/reset password
│   │   ├── forms/                  # Public form embed pages (no auth)
│   │   ├── legal/                  # EULA + Privacy policy
│   │   └── (dashboard)/            # All protected routes
│   │       ├── dashboard/          # Executive dashboard (customizable widgets)
│   │       ├── leads/              # Pipeline (Kanban + table)
│   │       ├── clients/            # Client portfolio
│   │       ├── projects/           # Project management (Kanban + table)
│   │       ├── quotes/             # Quote builder + list
│   │       │   ├── new/            # New quote creation
│   │       │   └── [id]/edit/      # Quote editor
│   │       ├── cost-breakdown/     # Cost breakdown builder + list
│   │       │   ├── new/            # New breakdown
│   │       │   └── [id]/           # Edit breakdown
│   │       ├── proposals/          # Proposal generation + list
│   │       ├── tasks/              # Task list + detail
│   │       ├── calendar/           # Calendar (month, week, agenda, crew views)
│   │       ├── time-tracking/      # Time tracking + timesheets
│   │       ├── pto/                # PTO request submission + history
│   │       ├── analytics/          # Bottleneck analytics dashboard
│   │       ├── reports/            # Tabbed analytics (4 categories)
│   │       ├── admin/              # Admin sub-pages (25+ settings screens)
│   │       └── settings/           # User profile + password
│   ├── components/
│   │   ├── layout/                 # AppSidebar (collapsible, permission-filtered)
│   │   ├── dashboard/              # CustomizableDashboard, widgets, MetricsCards
│   │   ├── leads/                  # Kanban, dialogs, AI panel
│   │   ├── clients/                # Client detail, health, metrics
│   │   ├── projects/               # Kanban, costs, stage timeline, crew assignments
│   │   ├── quotes/                 # Quote builder, line items, PDF preview
│   │   ├── cost-breakdown/         # Breakdown builder, role estimates, direct expenses
│   │   ├── proposals/              # Proposal generation dialogs + list
│   │   ├── tasks/                  # Task list, detail dialog, filters, time picker
│   │   ├── calendar/               # Month, week, agenda, crew calendar views
│   │   ├── time-tracking/          # Time entries, timer widget, timesheets
│   │   ├── pto/                    # PTO request form, list, approval panel
│   │   ├── analytics/              # Bottleneck dashboard, stage dwell, AI reports
│   │   ├── reports/                # 4 tab views + filters
│   │   ├── contacts/               # Contact dialog, lead contacts section
│   │   ├── admin/                  # Users, teams, permissions, roles, QB, service items
│   │   ├── notifications/          # Notification bell, dropdown, preferences
│   │   ├── providers/              # QueryProvider, CurrencyProvider
│   │   ├── AIAssistant.tsx         # Floating AI chat widget
│   │   ├── CommandPalette.tsx      # Global search (Cmd+K)
│   │   └── ui/                     # Shadcn/Radix primitives
│   ├── contexts/                   # Auth + Currency contexts
│   ├── hooks/                      # Custom React hooks
│   ├── lib/
│   │   ├── api/                    # API client files (domain-split, 35+ files)
│   │   ├── types.ts                # All TypeScript domain types (250+ types)
│   │   └── validations/            # Zod schemas for forms
│   └── package.json
│
└── logs/                           # Application logs
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL via Docker Compose) or a hosted PostgreSQL database
- At least one AI API key (Anthropic, OpenAI, or Google)

### 1. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment

**Backend** (`backend/.env`):

```env
DATABASE_URL="postgresql://user:pass@host:5432/db"
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
PORT=4000
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# AI Providers (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...

# Email (optional — falls back to console in dev)
RESEND_API_KEY=re_...

# File Storage (optional — required for file uploads)
GCP_PROJECT_ID=your-project
GCP_STORAGE_BUCKET=your-bucket

# QuickBooks Online (optional — required for QB integration)
QB_CLIENT_ID=your-qb-client-id
QB_CLIENT_SECRET=your-qb-client-secret
QB_REDIRECT_URI=http://localhost:4000/api/quickbooks/callback
QB_ENVIRONMENT=sandbox

# AI Settings encryption
ENCRYPTION_KEY=32-char-hex-key
```

**Frontend** (`frontend/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### 3. Start Database (Docker)

```bash
cd backend
docker-compose up -d      # Starts PostgreSQL on port 5432
```

### 4. Setup Database

```bash
cd backend
npx prisma generate
npx prisma migrate dev
npx prisma db seed        # Seeds roles, pipeline stages, dropdown options, sample users
```

### 5. Start Development Servers

```bash
# Terminal 1 — Backend
cd backend && npm run start:dev     # http://localhost:4000

# Terminal 2 — Frontend
cd frontend && npm run dev          # http://localhost:3000
```

### 6. Access the Application

Open [http://localhost:3000](http://localhost:3000). Log in with a seeded user account.

**Seeded users** (password: `Pass123$1`):

| Email                | Role  |
| -------------------- | ----- |
| `ceo@relon.com`      | CEO   |
| `admin@relon.com`    | ADMIN |
| `manager@relon.com`  | BDM   |
| `manager2@relon.com` | BDM   |

---

## System Flow

### Core Business Flow

```
                    ┌─────────────┐
                    │   New Lead   │  (Prospective Project)
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │  Contacted  │ │   Quoted    │ │ Negotiation │
   └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
             ┌───────────┐ ┌───────────┐
             │    Won     │ │   Lost    │
             └─────┬─────┘ └───────────┘
                   │
                   ▼  (Convert Lead)
          ┌────────┴────────┐
          ▼                 ▼
   ┌─────────────┐  ┌─────────────┐
   │   Client    │  │   Project   │
   │  (created   │  │  (created   │
   │  or linked) │  │  from lead) │
   └──────┬──────┘  └──────┬──────┘
          │                │
          │    ┌───────────┘
          ▼    ▼
   ┌─────────────────┐
   │ Ongoing Mgmt    │  Tasks, Activities, Files, Comments,
   │ AI Health Score │  Cost Tracking, Time Tracking,
   │ Upsell Strategy │  Addenda (Change Orders), Quotes,
   │ Workflow Rules  │  Contacts, Custom Fields,
   │ QB Sync         │  Notifications, Forecast,
   │                 │  Bottleneck Analytics, Calendar,
   │                 │  PTO, Work Codes
   └─────────────────┘
```

### Authentication & Request Flow

```
Browser → Next.js Middleware (check token cookie)
  │
  ├─ No token → /login
  │
  └─ Has token → Render protected page
       │
       └─ React Query → fetch() with JWT Bearer header
            │
            └─ NestJS Backend
                 │
                 ├─ JwtAuthGuard (validate token, check user active)
                 ├─ PermissionsGuard (check @Permissions() decorator)
                 └─ Controller → Service → Prisma → PostgreSQL
```

### Data Flow: Lead Lifecycle

1. **Sales rep creates a lead** — Lead appears in pipeline Kanban at "New" stage
2. **Activities logged** — Calls and meetings tracked against the lead with dates
3. **Files uploaded** — Briefs, drawings, quotations stored in GCP
4. **Tasks created** — Follow-up tasks assigned to team members, linked to the lead
5. **Stage progression** — Drag lead through pipeline stages (each transition recorded in StageHistory)
6. **Workflow automation** — Rules fire automatically on stage change, sending notifications or assigning users
7. **AI risk analysis** — System analyzes the lead and flags risks (no contact, stale pipeline, high value)
8. **Cost breakdown created** — Estimator builds a role-hour estimate with direct expenses; PDF exported for the proposal
9. **Proposal generated** — DOCX template populated from cost breakdown and lead context, sent to client
10. **Quote generated** — Quote builder creates a line-item quote, PDF exported, sent to client
11. **Deal won** — Lead moves to "Won", `dealClosedAt` + `contractedValue` captured via CloseWonDialog
12. **Convert to Client + Project** — One-click conversion that creates/links a Client record and creates a Project with assignment carry-over
13. **Project tracked** — Cost logs, time entries, status changes, crew assignments, addenda (change orders), comments, activities, tasks, and files managed under the project
14. **QuickBooks sync** — Client synced as QB customer, quote pushed as QB invoice, project costs synced as expenses
15. **Client relationship** — Health score calculated, AI generates upsell strategies, contacts tracked, activity engagement tracked
16. **Forecast** — Won revenue feeds monthly forecast charts; targets set per month for comparison
17. **Bottleneck analytics** — Stage dwell times, task velocity, and stuck projects surfaced for optimization

---

## Features

### Authentication & Authorization

- **JWT-based authentication** via Passport.js with 7-day token expiry
- **Registration** with automatic welcome email
- **Password reset** via secure email link (1-hour expiry, bcrypt-hashed token)
- **Password change** requiring current password verification
- **Route protection** — dual-layer: Next.js middleware (server) + `useRequireAuth` hook (client)
- **Admin layout guard** — server-side JWT decode blocks non-CEO/ADMIN/BDM from admin pages
- **Session management** — `lastLogin` auto-updated on every authenticated request

### Executive Dashboard

The main dashboard (`/dashboard`) is a fully customizable, drag-and-drop executive view:

**Customizable widget system:**
- **7 widget types** — MetricCard, AreaChart, BarChart, FunnelChart, TaskList, LeadsList, AIPanel
- **Drag-and-drop layout** — Reorder widgets via dnd-kit with pointer sensor and rect sorting
- **Per-widget resize** — Custom resize handles for each widget
- **Edit mode toggle** — Switch between view and edit mode
- **Add/remove widgets** — Widget picker dialog to add new widgets; remove individual widgets
- **Per-user persistence** — Layout saved per user in the database (`DashboardLayout`)
- **Role-based defaults** — Reset to role-specific default layouts from the server
- **Draft persistence** — Unsaved changes stored in localStorage until explicitly saved
- **Permission-gated widgets** — Each widget type and metric maps to required permissions; widgets only render when the user has access

**Available metrics and widgets:**
- **Revenue metrics** — Total, monthly, and quarterly revenue with period comparison
- **Pipeline metrics** — Total leads, won/lost counts, win rate, average deal size
- **Time metrics** — Average time-to-quote and time-to-close
- **Project analytics** — Active projects, at-risk projects, projects by status
- **Client data** — Active clients, top clients, revenue concentration risk
- **Revenue trend** — 12-month area chart
- **Lead volume trend** — 12-week bar chart
- **Funnel visualization** — Drop-off rates between pipeline stages
- **Forecast widget** — Monthly revenue vs. targets for the next 6 months
- **Task list widget** — Open tasks with overdue/dueToday/upcoming stats, priority color-coded
- **Leads list widget** — Active leads with key details
- **AI Executive Summary** — On-demand overview covering what changed, what's at risk, what needs attention, and key insights
- **AI Pipeline Insights** — Bottleneck analysis, win probability by stage, urgent leads, recommendations
- **Period filtering** — Week / Month / Quarter

### Leads (Prospective Projects)

The sales pipeline (`/leads`) manages opportunities from initial contact to close:

- **Dual views** — Drag-and-drop Kanban board + sortable/filterable data table
- **Pipeline stats bar** — Total value, stage distribution, key metrics at a glance
- **Full lead lifecycle** — Create → track activities → upload files → progress through stages → close
- **Close Won dialog** — Captures contracted value and close date when moving to "Won"
- **Lead-to-Client+Project conversion** — One-click conversion that creates or links a client and creates a project with assignment carry-over
- **Bulk operations** — Bulk update and bulk delete across selected leads
- **Contact reps** — Multiple contact representatives per lead (name, phone, email)
- **Contacts** — Link existing client contacts directly to a lead
- **Assignment** — Sales rep, designer, and QS assignments with role-based visibility
- **Lead metrics** — Days in pipeline, days since last contact, activity count, file count, days to quotation
- **Risk flags** — Automated detection: NO_CONTACT, LONG_PIPELINE, HIGH_VALUE_STALE, STALLED, NO_ACTIVITY
- **AI risk analysis** — Per-lead AI-generated risk level, summary, and recommendations
- **AI summary generation** — On-demand narrative summary with insights and suggested next actions
- **AI email drafting** — AI drafts follow-up emails based on lead context (follow-up, negotiation, etc.)
- **Stage history** — Full audit trail of all stage transitions with who/when
- **Year filtering** — Filter leads by creation year
- **Tasks** — Create and view tasks linked to the lead
- **Custom fields** — Additional data fields configured per your business needs

**Role-based data filtering:**

| Role      | Sees                                  |
| --------- | ------------------------------------- |
| CEO/ADMIN | All leads                             |
| BDM       | Own leads + direct reports' leads     |
| SALES     | Only own assigned leads               |
| DESIGNER  | Only leads where assigned as designer |
| QS        | Only leads where assigned as QS       |

### Client Management

The client portfolio (`/clients`) tracks relationships and engagement:

- **Client list** with stats bar showing totals, health distribution, and revenue
- **Create clients** — Name, email, phone, address, website, segment, industry, individual contact info
- **Client detail dialog** — Full info panel with projects list, activity timeline, file uploads
- **Bulk operations** — Bulk update and bulk delete across selected clients
- **Engagement score** — Composite 0-100 score based on contact recency, activity level, active projects, repeat business, and client age
- **Health status** — Automatically calculated from engagement score + project activity: Active, At Risk, or Dormant
- **Health override** — Manually override health status with a reason (persists until cleared)
- **AI health report** — AI-generated health score, summary, and recommendations per client
- **AI upsell strategy** — AI-generated upsell opportunities with potential revenue values
- **Client metrics** — Days since last contact, total/recent activity counts, project counts, total/recent revenue, average project value
- **Lead conversion** — Won leads can be converted to create a new client or link to an existing one (auto-detect by email)
- **Account manager assignment** — Assign a user as the dedicated account manager
- **Contacts** — Manage a structured contact book per client
- **Custom fields** — Additional data fields configured per your business needs
- **Tenant settings** — Configurable client display mode (COMPANY or INDIVIDUAL)

### Contacts

A structured contact book that works across clients and leads:

- **Client-scoped contacts** — Create and list contacts belonging to a specific client
- **Lead contact linking** — Link existing contacts from a client's book to a lead, or unlink them
- **Contact details** — Name, email, phone, job title, department, LinkedIn URL, notes per contact
- **Primary and decision-maker flags** — Mark contacts as primary or decision-maker for visibility
- **Individual contact management** — View, update, and delete any contact record
- **Reusable across entities** — One contact record can be linked to multiple leads

### Project Management

Active project tracking (`/projects`) covers delivery and cost management:

- **Dual views** — Kanban board (by status) + sortable data table
- **Project stats bar** — Total projects, active, completed, total contracted value, total costs
- **Date range filters**
- **Full project detail** — Status history timeline, cost logs, activities, files, comments
- **Status tracking** — Planning → Active → On Hold → Completed → Cancelled (each change recorded in ProjectStatusHistory)
- **Complete project dialog** — Captures end-of-project value and completion date
- **Bulk operations** — Bulk update and bulk delete across selected projects
- **Cost logs** — Track expenses by date, category, description, and amount; auto-aggregates total cost on the project
- **Cost segments** — Named cost breakdown segments (e.g., Phase 1, Phase 2) for multi-phase cost tracking
- **Profitability view** — Contracted value vs. cumulative costs with margin calculation
- **Crew assignments** — Assign crew members to projects with role-specific positions; managed via ProjectAssignment records
- **Service item linkage** — Attach service items from the catalog directly to a project for time tracking and billing reference
- **Assignment** — Project manager, designer, and QS with role-based visibility
- **Client linkage** — Every project belongs to a client; auto-updates client project counts
- **Lead linkage** — Optional one-to-one link to the originating lead
- **Job numbers** — Configurable job number field for internal reference tracking
- **Tasks** — Create and view tasks linked to the project
- **Time tracking** — Time entries logged against projects with service item and subtask breakdown
- **Project budgets** — Set budgeted hours and cost per project; track actuals against budget
- **Optional stages** — INDOT-specific workflow stages for government projects
- **Custom fields** — Additional data fields configured per your business needs

### Addenda & Change Orders

A structured change order system integrated with project management:

- **Addendum creation** — Create change orders linked to a project with title and description
- **Line items** — Each addendum contains line items with role, service item link, estimated hours, billable rate, and line total
- **Approval workflow** — Status tracking from DRAFT → APPROVED → INVOICED with `approvedAt` timestamp
- **Cost rollup** — Line item totals aggregate to the addendum total
- **Role-based pricing** — Each line item specifies the role performing the work and the billable rate
- **Audit trail** — Full history of addendum creation, updates, and approvals
- **Project integration** — Addenda visible directly from the project detail view in a dedicated tab

### Project Comments

Team collaboration tool for project discussions:

- **Comment threads** — Post comments on any project visible to the team
- **@mention support** — Tag team members with @username to trigger mention notifications
- **Visibility levels** — Control whether comments are visible to the full team or specific users
- **Real-time delivery** — Mention notifications delivered instantly via SSE
- **Edit and delete** — Authors can edit or delete their own comments
- **Inline display** — Comments appear in the project detail view in chronological order

### Quotes

A full quoting module (`/quotes`) covering the quote lifecycle from draft to PDF:

- **Quote list** — Filter by lead, client, or status (draft, sent, accepted, rejected)
- **Quote builder** — Line-item editor with products from the catalog or ad-hoc items; quantity, unit price, discount, tax
- **Service item linkage** — Line items can link to service items from the catalog (with QB item ID for QuickBooks sync)
- **Quote settings** — Company details, logo URL, tax rates, payment terms, and default notes stored globally
- **Auto-numbering** — Sequential quote numbers with configurable prefix
- **Status lifecycle** — Draft → Sent → Accepted / Rejected
  - `send` — Marks quote as sent and records `sentAt`
  - `accept` — Marks as accepted and records `acceptedAt`
  - `reject` — Marks as rejected
- **PDF export** — Generate a formatted PDF (via pdfmake) of any quote, downloadable directly from the browser
- **Scope PDF** — Generate a scope-of-work PDF alongside the quote
- **Lead & client linkage** — Each quote can be linked to a lead and/or a client
- **QuickBooks integration** — Quotes can be pushed as QB invoices; `qbInvoiceId` and `qbPaymentStatus` tracked
- **Notifications** — Status changes trigger `QUOTE_STATUS` notifications to the quote owner

### Cost Breakdown & Estimating

A detailed estimating tool (`/cost-breakdown`) for building role-based cost estimates before quoting:

- **Breakdown builder** — Create named cost breakdowns linked to a lead, job type, and status
- **Line items** — Each breakdown contains service item lines representing scope components
- **Role hour estimates** — Per line item, estimate hours broken down by role (e.g., Party Chief: 4 hrs, Survey Technician: 8 hrs) with configurable hourly rates
- **Subtask exclusions** — Track which subtasks are excluded from scope per line item
- **Direct expenses** — Add mileage, lodging, and per diem expenses with quantity and rate; auto-calculates totals
- **Grand total rollup** — All role hours × rates + direct expenses + overhead calculates to a project cost estimate
- **Benchmark locking** — Lock a breakdown at a point in time as a benchmark for comparison
- **PDF generation** — Export the breakdown as a professional PDF for proposal attachment
- **Role display names** — Customize how roles appear on the breakdown PDF
- **Status tracking** — DRAFT, FINALIZED, ARCHIVED states
- **Template-based workflow** — Reuse breakdowns as templates for similar project types
- **Proposal linkage** — Cost breakdowns feed directly into the proposal generator

### Proposals

A proposal generation system (`/proposals`) that produces client-ready documents from templates:

- **Template management** — Upload and manage DOCX proposal templates scoped to job types (admin)
- **GCP template storage** — Templates stored in GCP Cloud Storage and retrieved for generation
- **Proposal generation** — Populate a DOCX template with lead context and cost breakdown data via LibreOffice
- **Form snapshot** — Proposal form field values are snapshotted at generation time for audit
- **Status lifecycle** — DRAFT → ACCEPTED with `acceptedAt` timestamp
- **Acceptance workflow** — Mark proposals as accepted; updates status and related lead
- **Bulk operations** — Bulk update and delete across proposals
- **Lead linkage** — Every proposal ties back to the originating lead and cost breakdown
- **Admin template management** — Full CRUD on proposal templates with job type association

### Products & Services Catalog

A product/service catalog (`/admin` → Products) used when building quotes:

- **Product list** with filtering by active/inactive status
- **Create products** — Name, description, unit price, unit type (each, hour, day, etc.), tax rate, and SKU
- **Active/inactive toggle** — Deactivate products without deleting them; inactive products are hidden from the quote builder
- **Used in quotes** — Products populate the line-item picker in the quote builder with pre-filled price and tax

### Service Items

A detailed service item catalog (`/admin` → Service Items) for managing surveying service offerings:

- **Service item management** — Full CRUD for service items scoped to a service type
- **INDOT flag** — Mark items as INDOT-specific for government project workflows
- **Job type associations** — Link service items to one or more job types
- **Subtasks** — Each service item has ordered subtasks with drag-to-reorder
- **Role hour estimates** — Per-subtask hour estimates broken down by role (e.g., Party Chief: 4 hrs, Survey Technician: 8 hrs)
- **QuickBooks item linkage** — Each service item can map to a QB item ID for sync
- **Used in time tracking** — Time entries reference service items and subtasks for granular tracking
- **Used in quotes** — Quote line items can link to service items
- **Used in cost breakdowns** — Breakdown line items reference service items
- **Used in projects** — Service items can be attached directly to projects

### Tasks

A cross-entity task management system (`/tasks`) for tracking follow-ups and work items:

- **Task list** — Filter by status (OPEN, IN_PROGRESS, DONE), priority (LOW, MEDIUM, HIGH, URGENT), entity type, entity, assignee, or due date range
- **Multiple views** — Table view and card view for different preferences
- **My tasks summary** — Quick count of open, in-progress, overdue, and due-today tasks for the current user
- **Team summary** — Aggregate task counts across the team (for managers and admins)
- **Team tasks view** — Dedicated view for team-scoped task management
- **Entity-linked tasks** — Tasks can be attached to a specific lead, client, or project and visible from those entity detail views
- **Task types** — Categorize tasks by type, linked to service types for domain-specific task categorization
- **Assignment** — Each task has an assignee and a creator; non-managers see only their own tasks unless they hold `tasks:view_all`
- **Due dates and times** — Optional due date with time picker; overdue detection
- **Estimated hours** — Set estimated hours on a task for planning
- **Reminders** — Set reminder time for tasks
- **Completion notes** — When marking a task DONE, a completion note is recorded; tasks can be uncompleted/reopened with a reason
- **Workflow integration** — Workflows can automatically create tasks as an action
- **Calendar integration** — Tasks appear as events on the calendar, color-coded by priority
- **Notifications** — `TASK_ASSIGNED`, `TASK_DUE`, and `TASK_OVERDUE` notifications are sent automatically via the scheduler

### Calendar

A multi-view calendar (`/calendar`) powered by react-big-calendar:

- **Month view** — Full month grid with task and project events
- **Week view** — Time-slotted week view for detailed scheduling
- **Agenda view** — Chronological list of upcoming events
- **Crew view** — Specialized crew/field scheduling view for managing field crew assignments by week
- **Event sources** — Tasks (by due date, color-coded by priority) and projects (by start/end dates)
- **Team filtering** — Filter calendar events by team membership
- **Toggle visibility** — Show/hide tasks and projects independently
- **Range-aware fetching** — Only queries data for the visible date range for performance
- **Inline editing** — Click a task event to open the task dialog; click a project event to open the project detail dialog

### Time Tracking

A native time tracking system (`/time-tracking`) for labor cost management:

- **Time entries** — Log hours against projects with service item and subtask breakdown
- **Live timer** — Timer widget for active time tracking with start/stop functionality
- **Entry source** — Track whether entries are manual, timer-based, or imported
- **Billable flag** — Mark entries as billable or non-billable
- **User rates** — Configure per-user hourly rates (internal and billing types) with date-ranged validity
- **Pay grade assignment** — Assign users to pay grades for structured rate management
- **Project budgets** — Set budgeted hours and cost per project; track actuals vs. budget
- **Weekly timesheet** — Weekly view of time entries for each user
- **Project summary** — Aggregated time per project with hours and cost breakdown
- **User summary** — Aggregated time per user across projects
- **Submission workflow** — Submit time entries for manager review

### Work Codes & Pay Grades

A structured work code and compensation system supporting INDOT compliance:

**Work Codes:**
- **Hierarchical work code system** — Three-tier division structure (5000-series Field Work, 6000-series Office/Processing, 7000-series Admin)
- **Parent/child codes** — Roll-up codes for summary reporting; child codes for granular entry
- **INDOT compliance** — Work codes map to INDOT-required categories for government project billing
- **Time entry linkage** — Time entries reference a specific work code for classification
- **Admin management** — Full CRUD on the work code hierarchy via `/admin/work-codes`

**Pay Grades:**
- **Pay grade definitions** — Define named pay grades (Base Rate, INDOT Pay Grade 1-5, etc.) with associated hourly rates
- **User rate assignment** — Assign each user to a pay grade with date-ranged validity for rate history
- **INDOT pay zones** — Define geographic pay zones by county with zone-specific pay grade overrides (required for INDOT projects)
- **Effective date tracking** — Rate changes tracked by effective date range for historical accuracy
- **Admin pages** — Separate admin views for pay grades (`/admin/pay-grades`), user rates (`/admin/pay-rates`), and INDOT pay zones (`/admin/indot-pay-zones`)

### PTO Management

A full paid-time-off request and approval system (`/pto`):

- **PTO request submission** — Employees submit time-off requests with type, start/end date, hours, and notes
- **Request types** — Vacation, sick, personal, and other configurable leave types
- **Manager approval workflow** — Requests routed to managers for APPROVE or DENY with optional response notes
- **Accrual policies** — Admin-defined PTO policies specifying maximum days per year, accrual type (annual, monthly), and carryover limits
- **Policy enforcement** — Requests validated against the applicable policy rules
- **Balance tracking** — PTO balance calculated from accrual type and approved/used history
- **Notification integration** — Notifications sent to employees on approval/denial and to managers on new requests
- **Calendar integration** — Approved PTO appears on the team calendar
- **Admin policy management** — Full CRUD on PTO policies via `/admin/pto`
- **Approval panel** — Managers see pending requests with bulk approval/denial capability

### Workflows & Automation

A no-code automation engine (`/admin` → Workflows) for triggering actions based on CRM events:

- **Workflow rules** — Name, trigger, conditions (AND/OR logic), list of actions, active/inactive toggle
- **Triggers** — `LEAD_CREATED`, `LEAD_STAGE_CHANGED`, `LEAD_UPDATED`, `PROJECT_STATUS_CHANGED`, `PROJECT_UPDATED`, `CLIENT_UPDATED`, `TASK_COMPLETED`, `FORM_SUBMITTED`, `SCHEDULED` (cron)
- **Conditions** — Field-level comparisons (`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `in`) on trigger entity fields
- **Actions** — Multiple actions per rule, executed in order:
  - `SEND_NOTIFICATION` — Push an in-app notification to specific users or roles
  - `SEND_EMAIL` — Send a transactional email via Resend
  - `UPDATE_FIELD` — Set a field on the trigger entity (allowlisted fields only)
  - `ASSIGN_USER` — Assign a specific user to the trigger entity
  - `CREATE_TASK` — Create a new task linked to the trigger entity
- **Execution history** — Last 20 executions per rule with status (SUCCESS/FAILURE) and error details
- **Test execution** — Manually fire a rule against a specific entity for debugging
- **Scheduled rules** — CRON-based rules run daily via `@nestjs/schedule`

### Forecast & Targets

Revenue forecasting (`/dashboard` forecast widget) giving visibility into future pipeline:

- **Monthly forecast** — Projects expected revenue for the next N months based on pipeline won probability, existing projects, and historical data
- **Forecast summary** — Aggregated view of pipeline value, expected close value, and revenue targets
- **Targets** — Set a revenue target per calendar month; persisted in `ForecastTarget` records
- **Actual vs. target comparison** — Side-by-side chart of actual closed revenue against monthly targets
- **Dashboard integration** — Forecast widget is embedded directly in the executive dashboard

### Lead Capture Forms

Public embeddable web forms (`/forms` public route + admin management) that feed leads directly into the CRM:

- **Form builder** — Create forms with a custom field configuration (label, type, required flag, placeholder)
- **API key auth** — Each form has a unique API key; public endpoints use the key rather than JWT
- **Public embed** — `GET /api/forms/public/:apiKey` returns form definition; `POST /api/forms/public/:apiKey/submit` accepts a submission — both are unauthenticated
- **Embed code generation** — Admin dialog generates `<iframe>` or JavaScript snippet code for embedding
- **Spam protection** — Submissions record the submitter's IP address for rate-limiting and review
- **Auto lead creation** — On submission, a new lead is created in the CRM with the form data mapped to lead fields, assigned to a configured user in a configured pipeline stage
- **Workflow trigger** — Form submissions fire the `FORM_SUBMITTED` trigger, enabling downstream automation
- **Notification** — `FORM_SUBMISSION` notification is dispatched to configured recipients
- **Analytics** — Submission count, last submission timestamp, and conversion tracking per form
- **Active/inactive toggle** — Deactivate a form without deleting it; inactive forms reject submissions

### Notifications

A real-time in-app notification system with user preferences:

- **Notification types** — `TASK_ASSIGNED`, `TASK_DUE`, `TASK_OVERDUE`, `LEAD_STALE`, `LEAD_STAGE_CHANGED`, `PROJECT_AT_RISK`, `CLIENT_DORMANT`, `MENTION`, `SYSTEM`, `WORKFLOW`, `QUOTE_STATUS`, `FORM_SUBMISSION`
- **Real-time delivery** — Server-Sent Events (SSE) stream pushes notifications to connected browsers instantly
- **Notification inbox** — Bell icon in the header shows unread count badge; dropdown lists recent notifications
- **Mark read / mark all read** — Per-notification and bulk read actions
- **Pagination** — Fetch notifications with limit/offset; filter to unread only
- **Preferences** — Per-user notification preferences control which types generate in-app or email notifications
- **Scheduled notifications** — `NotificationSchedulerService` runs on cron to detect and dispatch `TASK_DUE`, `TASK_OVERDUE`, `LEAD_STALE`, `PROJECT_AT_RISK`, and `CLIENT_DORMANT` events automatically
- **Weekly email digest** — Scheduled digest email summarizing key CRM activity, sent via Resend with branded HTML templates

### Custom Fields

An admin-managed system for extending entity data without schema changes:

- **Field definitions** — Create custom field definitions scoped to an entity type (LEAD, CLIENT, PROJECT)
- **Field types** — Text, Number, Date, Boolean, Select (with options list)
- **Required flag** — Mark fields as required; validation enforced on submission
- **Ordering** — Drag-to-reorder definitions; display order is persisted
- **Values** — `GET /api/custom-fields/values/:entityType/:entityId` retrieves all custom values for an entity; `POST` bulk-sets them in one call
- **Admin management** — Full CRUD on definitions via `settings:manage` permission
- **Frontend integration** — Custom field values appear in lead, client, and project detail dialogs

### Reports & Analytics

The reports page (`/reports`) provides deep analytics across four tabs:

**Leads Reports:**

- Overview — Total leads, total value, win rate, average close time
- Stage analysis — Counts and values per pipeline stage
- Conversion funnel — Drop-off rates stage-to-stage
- Revenue by rep — Won revenue grouped by sales representative
- Overdue leads — Stale pipeline items needing attention

**Projects Reports:**

- Overview — Total projects, active, completed, average value
- Profitability analysis — Per-project contracted value vs. costs
- Risk distribution — Projects by risk status
- Cost breakdown — Aggregated costs by category

**Clients Reports:**

- Overview — Client portfolio summary
- Revenue analysis — Revenue per client
- Health trends — Health status distribution over time
- Retention metrics — Client retention data
- Engagement trends — Activity engagement patterns
- Health score trends — Score trajectories over time

**Sales Reps Reports:**

- Overview — Team performance summary
- Individual performance — Per-rep metrics (leads, conversions, revenue)
- Stage time analysis — Average time per stage by rep

All reports support date range, period, service type, and assigned rep filters. Reports are role-filtered consistently with entity-level access rules (`reports:view_all` controls cross-team visibility). Tabs are eagerly prefetched for fast tab switching.

### Bottleneck Analytics

A dedicated analytics page (`/analytics`) identifying process bottlenecks and inefficiencies:

- **Stage dwell analysis** — Average, median, and max days spent in each pipeline stage (computed from StageHistory)
- **Task velocity** — Per-user task completion rates and throughput
- **Overdue breakdown** — Categorized view of overdue tasks and their impact
- **Stuck projects** — Identify projects exceeding a configurable stall threshold (default: 14 days)
- **Widget summary** — Dashboard-ready summary card of key bottleneck metrics
- **AI-generated reports** — One-click AI analysis generating narrative reports on bottlenecks and recommendations; reports persisted to `AIAnalyticsReport` for history
- **Latest report retrieval** — View the most recently generated AI bottleneck report without re-running the analysis
- **Analytics snapshots** — `AnalyticsSnapshot` model for time-series metric tracking

### AI Integration

Apex CRM integrates AI across the entire platform through a unified multi-provider abstraction:

| AI Capability        | Trigger                        | Output                                                                       |
| -------------------- | ------------------------------ | ---------------------------------------------------------------------------- |
| Lead Risk Analysis   | Button on lead detail          | Risk level (Low/Medium/High), summary, recommendations, confidence score     |
| Lead Summary         | Button on lead detail          | Insights and suggested next actions                                          |
| Email Drafting       | Button on lead detail          | Context-aware follow-up email draft (subject, body, tone)                    |
| Client Health Report | Button on client detail        | Health score (0-100), summary, risk factors, strengths, recommendations      |
| Upsell Strategy      | Button on client detail        | Opportunities with potential revenue values, approach, timing                |
| Executive Summary    | Button/widget on dashboard     | What changed, what's at risk, what needs attention, key insights             |
| Pipeline Insights    | Button on dashboard            | Bottlenecks, win probability by stage, urgent leads, recommendations         |
| Bottleneck Report    | Button on analytics page       | AI narrative analysis of stage dwell, velocity, and recommendations          |
| AI Chat Assistant    | Floating widget (bottom-right) | Conversational CRM assistant with lead/client context + suggestions          |
| Freeform Generation  | Internal (bottleneck service)  | Raw prompt passthrough for custom AI analysis                                |

**Provider selection** — Resolution priority: explicit API argument → per-feature DB override → DB default provider → env `AI_DEFAULT_PROVIDER` → OpenAI fallback. Each capability can use a different provider. Configured per-capability in the admin panel or globally via environment variable. All three providers implement the same `AIProvider` interface.

**Custom prompts** — Every AI capability's prompt is editable in the admin panel with template placeholders (leadRisk, clientHealth, executiveSummary, upsell, chat). Defaults are provided if none are set.

### QuickBooks Online Integration

Full bidirectional integration with QuickBooks Online (`/admin` → QuickBooks):

- **OAuth 2.0 connect/disconnect** — Standard Intuit OAuth flow with secure token storage
- **Connection status** — Dashboard showing connection state, company info, and last sync time
- **Token refresh automation** — Access tokens refreshed automatically before expiry
- **Client ↔ Customer sync** — Sync CRM clients to/from QB customers
- **Quote → Invoice** — Push accepted quotes as QB invoices with line items; `qbInvoiceId` tracked on the quote
- **Payment sync** — Pull payment status from QB back to quotes (`qbPaymentStatus`)
- **Expense sync** — Sync QB expenses as project cost logs
- **Service item sync** — Map CRM service items to QB items via `qbItemId`
- **Webhook endpoint** — Receive real-time updates from Intuit with signature verification
- **Sync history** — Full audit trail of all sync operations (`QuickBooksSync` records)
- **Scheduled sync** — Automated background sync via `@nestjs/schedule`
- **Admin UI** — QuickBooks management page with connect/disconnect buttons, sync triggers, and sync history table

### Administration

The admin panel (`/admin/*`) provides full system configuration:

**User Management** (`/admin/users`):

- Create, edit, and deactivate users
- Role assignment with hierarchy enforcement (CEO manages all; ADMIN manages BDM/SALES/DESIGNER/QS; BDM manages SALES)
- Temporary password generation with welcome email
- Team assignment

**Team Management** (`/admin/teams`):

- Create teams with a designated manager
- Add/remove team members
- Team types: SALES, SUPPORT, etc.

**Role Management** (`/admin/roles`):

- View built-in roles (CEO, ADMIN) and seeded roles (BDM, SALES, DESIGNER, QS)
- Create custom roles with auto-generated keys
- Clone permissions from existing roles
- Color coding for role badges
- `showInCostBreakdown` flag to control which roles appear in cost breakdown estimates

**Permission Matrix** (`/admin/permissions`):

- Visual grid of 56+ permissions across 14+ modules for each role
- Toggle individual permissions per role
- CEO permissions are immutable (always has full access)
- Changes take effect immediately (in-memory permission cache refreshed)

**Pipeline Settings** (`/admin/pipeline`):

- Customize pipeline stages for both lead and project pipelines
- Set stage names, colors, win probabilities, sort order
- Drag-to-reorder stages
- Protect system stages from deletion

**Dropdown Options** (`/admin/dropdown-options`):

- Configure dynamic dropdowns used throughout the system
- Categories: urgency, activity type, meeting type, file category, cost category, client segment, individual type, project status, project risk status, and more
- Reorder, activate/deactivate, protect system options

**Service Types / Job Types** (`/admin/job-types`):

- Manage the service type catalog (Topographic, Boundary, ROW Engineering, Construction Staking, ALTA/NSPS, Cell Tower, Subdivision Plat, Environmental, etc.)
- Name, description, active status, sort order

**Service Items** (`/admin/service-items`):

- Manage service items within each service type
- Subtask management with drag-to-reorder
- Per-role hour estimates per subtask
- QuickBooks item ID mapping

**Task Types** (`/admin/task-types`):

- Define task types linked to service types
- Name, description, active status, sort order

**Work Codes** (`/admin/work-codes`):

- Manage the full work code hierarchy (5000/6000/7000 series)
- Parent and child code relationships
- Used in time entries for labor classification and INDOT billing compliance

**Pay Grades** (`/admin/pay-grades`):

- Define pay grade levels with base hourly rates
- Used to standardize compensation rates across roles

**Pay Rates** (`/admin/pay-rates`):

- Assign each user to a pay grade with effective date ranges
- Historical rate tracking for accurate cost reporting

**INDOT Pay Zones** (`/admin/indot-pay-zones`):

- Define geographic pay zones mapped to Indiana counties
- Each zone specifies a pay grade override for INDOT project billing compliance

**Products** (`/admin/products`):

- Manage the product/service catalog used in the quote builder
- Create, update, activate/deactivate products

**Proposal Templates** (`/admin/proposal-templates`):

- Upload and manage DOCX proposal templates
- Associate templates with job types for auto-selection during generation

**Workflows** (`/admin/workflows`):

- Create and manage automation rules
- View execution history and test rules against entities

**Custom Fields** (`/admin/custom-fields`):

- Define custom fields per entity type (Lead, Client, Project)
- Manage field types, labels, required flags, and display order

**Lead Forms** (`/admin/lead-forms`):

- Create and manage public lead capture forms
- View form analytics and submission counts
- Generate embed code (iframe/JS snippet)

**Quote Settings** (`/admin/quote-settings`):

- Company branding (name, address, logo, accent color)
- Default tax rate, validity days, currency, notes, terms
- Quote number prefix
- Show/hide configuration flags

**AI Settings** (`/admin/ai-settings`):

- Select default AI provider and per-capability overrides
- Manage API keys (encrypted with AES-256-CBC, displayed masked)
- Validate API keys against provider APIs
- Edit custom prompts for each AI capability

**QuickBooks** (`/admin/quickbooks`):

- Connect/disconnect QuickBooks Online
- View connection status and company info
- Trigger manual syncs (clients, payments, expenses, service items)
- View sync history table

**PTO Policies** (`/admin/pto`):

- Create and manage PTO policies (max days, accrual type, carryover limits, requires-approval flag)
- Assign policies to users or teams

**General Settings** (`/admin/general-settings`):

- Tenant-level configuration (e.g., client display mode: COMPANY or INDIVIDUAL)
- Bottleneck stall threshold (days before a project is flagged as stuck)

**Audit Logs** (`/admin/audit-logs`):

- Full audit trail of system actions
- 14 tracked action types: CREATE_USER, UPDATE_USER, DELETE_USER, CREATE_LEAD, UPDATE_LEAD, DELETE_LEAD, CREATE_CLIENT, UPDATE_CLIENT, DELETE_CLIENT, CONVERT_LEAD_TO_CLIENT, CREATE_PROJECT, UPDATE_PROJECT, DELETE_PROJECT, UPDATE_PERMISSIONS
- Filter by action type or user

**System** (`/admin/system`):

- System diagnostics and information

### File Management

Polymorphic file upload/download that works across leads, clients, and projects:

- **Upload** — Up to 10MB per file, stored privately in GCP Cloud Storage
- **Categories** — brief, drawing, quotation, contract, meeting_notes, other
- **Download** — Streamed through the backend API (no direct GCP access)
- **Ownership** — Only the uploader can delete their files
- **Per-entity** — Each lead, client, and project has its own file list

### Activity Tracking

Polymorphic activity logging across leads, clients, and projects:

- **Types** — Call or Meeting (meetings require type: in-person or virtual)
- **Fields** — Date, time, reason (required), notes (optional)
- **Auto-updates** — Creating a client activity auto-updates `client.lastContactDate`
- **Ownership** — Only the creator can delete an activity
- **Timeline view** — Activities displayed in chronological timeline format within detail dialogs

### Command Palette

A global search and navigation tool accessible via `Cmd+K` (or `Ctrl+K`):

- **Quick search** — Search across clients, leads, and projects simultaneously
- **Navigation shortcuts** — Jump to any page in the application
- **Keyboard-driven** — Full keyboard navigation via cmdk library

---

## RBAC & Permissions

### Roles

| Role     | Description                                    | Management Scope                        |
| -------- | ---------------------------------------------- | --------------------------------------- |
| CEO      | Full access — all permissions hardcoded        | Manages everyone                        |
| ADMIN    | System administrator                           | Manages BDM, SALES, DESIGNER, QS        |
| BDM      | Business Development Manager                   | Manages SALES, auto-assigned as manager |
| SALES    | Sales representative                           | Cannot manage users                     |
| DESIGNER | Designer (assigned to leads/projects)          | Sees only assigned records              |
| QS       | Quantity Surveyor (assigned to leads/projects) | Sees only assigned records              |

Custom roles can be created via the admin panel with any combination of available permissions.

### Permission Modules (56+ permissions)

| Module        | Actions                                              |
| ------------- | ---------------------------------------------------- |
| Leads         | view, create, edit, delete, analyze                  |
| Clients       | view, create, edit, delete, health, upsell, convert  |
| Projects      | view, create, edit, delete                           |
| Costs         | view, create, delete                                 |
| Quotes        | view, create, edit, delete                           |
| Tasks         | view, create, edit, delete, view_all, assign         |
| Workflows     | view, create, edit, delete                           |
| Teams         | view, create, edit, delete, manage_members, be_manager |
| Users         | view, create, edit, delete                           |
| Dashboard     | view, edit                                           |
| AI Settings   | view, edit                                           |
| Audit Logs    | view                                                 |
| Permissions   | view, edit                                           |
| Pipeline      | manage                                               |
| Reports       | view, export, view_all                               |
| Settings      | manage, view, edit                                   |
| Notifications | view                                                 |
| Bottleneck    | view                                                 |

### How Permissions Work

1. **Global guards** — `JwtAuthGuard` + `PermissionsGuard` are registered as `APP_GUARD` in the root module, meaning every endpoint requires authentication and permission checks unless marked `@Public()`
2. **Decorator-based** — Controllers use `@Permissions('resource:action')` decorators. Multiple permissions use AND logic.
3. **In-memory cache** — Permission lookups use an in-memory `Map<string, Set<string>>` for performance, refreshed on update.
4. **CEO bypass** — CEO/SUPER_ADMIN always passes permission checks without lookup.
5. **Role-based data filtering** — Beyond permissions, services apply role-specific data filters (e.g., SALES only sees own leads, DESIGNER only sees assigned records).

---

## Database Schema

Prisma models powering the system (70+ models):

### Core CRM

| Model                   | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `User`                  | System users with role, team, hierarchy              |
| `Role`                  | Role definitions (built-in + custom)                 |
| `RolePermission`        | Role-permission mapping matrix                       |
| `Team`                  | Organizational team structure                        |
| `Lead`                  | Prospective projects in the sales pipeline           |
| `LeadRep`               | Contact representatives for a lead                   |
| `LeadTeamMember`        | Multi-user team assignments on a lead                |
| `LeadContact`           | Lead ↔ Contact join table                            |
| `StageHistory`          | Lead pipeline stage transitions with audit trail     |
| `Client`                | Client portfolio with health/engagement              |
| `Contact`               | Structured contact book linked to clients            |
| `Activity`              | Polymorphic call/meeting log                         |
| `File`                  | Polymorphic file metadata (GCP storage)              |

### Projects & Work

| Model                      | Purpose                                                  |
| -------------------------- | -------------------------------------------------------- |
| `Project`                  | Active projects with cost tracking and crew              |
| `ProjectAssignment`        | Crew member assignments to projects (role-based)         |
| `CostLog`                  | Individual cost entries per project                      |
| `ProjectCostSegment`       | Named cost segments within a project                     |
| `ProjectStatusHistory`     | Project status change audit trail                        |
| `ProjectServiceItem`       | Service items attached to a project                      |
| `ProjectAddendum`          | Change orders linked to a project                        |
| `ProjectAddendumLine`      | Line items within a change order                         |
| `ProjectComment`           | Team comments on a project with @mentions                |
| `ProjectBudget`            | Budgeted hours + cost per project                        |

### Quoting & Estimating

| Model                      | Purpose                                                  |
| -------------------------- | -------------------------------------------------------- |
| `Quote`                    | Quote records with line items and lifecycle              |
| `QuoteLineItem`            | Line items on a quote (product, service item, or ad-hoc) |
| `QuoteSettings`            | Global quote defaults (company info, tax, terms)         |
| `Product`                  | Product/service catalog for quoting                      |
| `CostBreakdown`            | Role-based cost estimate for a project                   |
| `CostBreakdownLine`        | Service item lines within a cost breakdown               |
| `CostBreakdownRoleEstimate`| Per-role hour estimates per line item                    |
| `Proposal`                 | Generated proposals linked to leads and cost breakdowns  |
| `ProposalTemplate`         | DOCX proposal template definitions                       |

### Service Catalog

| Model                     | Purpose                                            |
| ------------------------- | -------------------------------------------------- |
| `ServiceType`             | Configurable service type catalog (Division/JobType) |
| `ServiceItem`             | Detailed service items with QB item ID             |
| `ServiceItemSubtask`      | Subtasks within a service item                     |
| `ServiceItemRoleEstimate` | Per-role hour estimates per subtask                |

### Tasks & Time

| Model         | Purpose                                                   |
| ------------- | --------------------------------------------------------- |
| `Task`        | Tasks linked to any entity with status/priority           |
| `TaskType`    | Task type definitions linked to service types             |
| `TimeEntry`   | Time entries (project, service item, subtask linkage)     |
| `WorkCode`    | Work code hierarchy (5000/6000/7000 series, INDOT)        |
| `UserRate`    | Per-user hourly rates with date-ranged validity           |
| `PayGrade`    | Pay grade definitions with base rates                     |
| `IndotPayZone`| Geographic pay zones with county mapping (INDOT)          |
| `PtoPolicy`   | PTO policy definitions (accrual, max days, carryover)     |
| `PtoRequest`  | Employee PTO requests with approval workflow              |

### Automation & Configuration

| Model                    | Purpose                                              |
| ------------------------ | ---------------------------------------------------- |
| `WorkflowRule`           | Automation rules (trigger → conditions → actions)    |
| `WorkflowExecution`      | Execution history for workflow rules                 |
| `ForecastTarget`         | Monthly revenue targets                              |
| `LeadForm`               | Public lead capture form definitions                 |
| `LeadFormSubmission`     | Submissions received via public forms                |
| `Notification`           | In-app notifications per user                        |
| `NotificationPreference` | Per-user notification type preferences               |
| `CustomFieldDefinition`  | Custom field schema per entity type                  |
| `CustomFieldValue`       | Custom field values per entity instance              |
| `PipelineStage`          | Customizable pipeline stages (lead + project)        |
| `DropdownOption`         | Dynamic dropdown configuration                       |

### System & Integrations

| Model                  | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `DashboardLayout`      | Per-user customizable widget layout (JSON)           |
| `AISettings`           | AI provider config + encrypted keys + prompts        |
| `AIAnalyticsReport`    | Persisted AI-generated analytics reports             |
| `AnalyticsSnapshot`    | Time-series metric snapshots for bottleneck analytics|
| `AuditLog`             | System action audit trail                            |
| `TenantSettings`       | Singleton tenant configuration                       |
| `QuickBooksConnection` | QB OAuth tokens and connection state                 |
| `QuickBooksSync`       | QB sync history records                              |
| `UserPreference`       | Per-user key-value preference storage                |

### Key Relationships

```
User ─┬── manages → User[] (manager/report hierarchy)
      ├── memberOf → Team
      ├── assigned → Lead[] (as sales rep, designer, or QS)
      ├── assigned → Client[] (as account manager)
      ├── assigned → Project[] (as PM, designer, or QS)
      ├── has → TimeEntry[] (time tracked)
      ├── has → UserRate[] (hourly rates / pay grade)
      └── has → PtoRequest[] (time off requests)

Lead ─┬── belongsTo → Client? (existing client relationship)
      ├── convertsTo → Client? (on conversion)
      ├── convertsTo → Project? (one-to-one)
      ├── has → LeadRep[], Contact[] (via LeadContact), Activity[], File[],
      │         StageHistory[], Task[], Quote[], Proposal[]
      └── linkedTo → ServiceType?, PipelineStage

Client ─┬── has → Project[], Contact[], Activity[], File[], Task[], Quote[]
        ├── receivesFrom → Lead[] (converted leads)
        └── assignedTo → User? (account manager)

Project ─┬── belongsTo → Client
         ├── originatesFrom → Lead? (one-to-one)
         ├── has → CostLog[], ProjectAssignment[], Activity[], File[],
         │         ProjectStatusHistory[], Task[], TimeEntry[], ProjectBudget?,
         │         ProjectCostSegment[], ProjectServiceItem[],
         │         ProjectAddendum[], ProjectComment[]
         └── assignedTo → User? (PM), User? (designer), User? (QS)

ProjectAddendum ─┬── belongsTo → Project
                 └── has → ProjectAddendumLine[]

Quote ─┬── belongsTo → Lead? / Client?
       ├── has → QuoteLineItem[] (products, service items, or ad-hoc lines)
       ├── createdBy → User
       └── linkedTo → QuickBooks? (qbInvoiceId)

CostBreakdown ─┬── linkedTo → Lead?
               └── has → CostBreakdownLine[] → CostBreakdownRoleEstimate[]

Proposal ─┬── linkedTo → Lead
           └── linkedTo → CostBreakdown?

ServiceType ─── has → ServiceItem[] → ServiceItemSubtask[] → ServiceItemRoleEstimate[]

TimeEntry ─┬── belongsTo → Project
           ├── linkedTo → ServiceItem?, ServiceItemSubtask?
           ├── linkedTo → WorkCode?
           └── enteredBy → User

WorkCode ─── has → WorkCode[] (children, rollup hierarchy)

WorkflowRule ─┬── trigger → event type
              ├── conditions → JSON field comparisons
              ├── actions → notifications, emails, field updates, tasks
              └── has → WorkflowExecution[]
```

---

## API Reference

### Authentication (`/api/auth`)

| Method | Endpoint                | Auth   | Description                        |
| ------ | ----------------------- | ------ | ---------------------------------- |
| POST   | `/auth/register`        | Public | Register a new user                |
| POST   | `/auth/login`           | Public | Login, returns JWT + permissions   |
| POST   | `/auth/forgot-password` | Public | Send password reset email          |
| POST   | `/auth/reset-password`  | Public | Reset password with token          |
| POST   | `/auth/change-password` | JWT    | Change password (requires current) |
| GET    | `/auth/profile`         | JWT    | Get current user profile           |
| PATCH  | `/auth/profile`         | JWT    | Update profile (name)              |
| POST   | `/auth/logout`          | JWT    | Logout (client-side)               |
| GET    | `/auth/verify`          | JWT    | Verify token validity              |
| GET    | `/auth/permissions`     | JWT    | Get current user's permissions     |

### Leads (`/api/leads`)

| Method | Endpoint                 | Permission      | Description                              |
| ------ | ------------------------ | --------------- | ---------------------------------------- |
| GET    | `/leads`                 | `leads:view`    | List all leads (role-filtered, `?year=`) |
| GET    | `/leads/:id`             | `leads:view`    | Get lead with details + history          |
| POST   | `/leads`                 | `leads:create`  | Create lead                              |
| PATCH  | `/leads/:id`             | `leads:edit`    | Update lead                              |
| DELETE | `/leads/:id`             | `leads:delete`  | Delete lead                              |
| POST   | `/leads/bulk-update`     | `leads:edit`    | Bulk update multiple leads               |
| POST   | `/leads/bulk-delete`     | `leads:delete`  | Bulk delete multiple leads               |
| POST   | `/leads/:id/analyze`     | `leads:analyze` | AI risk analysis                         |
| POST   | `/leads/:id/summary`     | `leads:analyze` | AI lead summary                          |
| POST   | `/leads/:id/draft-email` | `leads:analyze` | AI email draft                           |
| POST   | `/leads/:id/reps`        | `leads:edit`    | Add contact rep                          |
| PATCH  | `/leads/:id/reps/:repId` | `leads:edit`    | Update contact rep                       |
| DELETE | `/leads/:id/reps/:repId` | `leads:edit`    | Delete contact rep                       |

### Clients (`/api/clients`)

| Method | Endpoint                          | Permission        | Description                          |
| ------ | --------------------------------- | ----------------- | ------------------------------------ |
| GET    | `/clients`                        | `clients:view`    | List all clients (role-filtered)     |
| GET    | `/clients/:id`                    | `clients:view`    | Get client with projects + metrics   |
| POST   | `/clients`                        | `clients:create`  | Create client                        |
| PATCH  | `/clients/:id`                    | `clients:edit`    | Update client                        |
| DELETE | `/clients/:id`                    | `clients:delete`  | Delete client                        |
| POST   | `/clients/bulk-update`            | `clients:edit`    | Bulk update multiple clients         |
| POST   | `/clients/bulk-delete`            | `clients:delete`  | Bulk delete multiple clients         |
| POST   | `/clients/:id/health`             | `clients:health`  | AI health report                     |
| POST   | `/clients/:id/upsell`             | `clients:upsell`  | AI upsell strategy                   |
| POST   | `/clients/:id/health/auto-update` | `clients:health`  | Auto-calculate health status         |
| POST   | `/clients/:id/health/override`    | `clients:health`  | Manually override health status      |
| POST   | `/clients/convert-lead/:leadId`   | `clients:convert` | Convert won lead to client + project |

### Projects (`/api/projects`)

| Method | Endpoint                                  | Permission        | Description                       |
| ------ | ----------------------------------------- | ----------------- | --------------------------------- |
| GET    | `/projects`                               | `projects:view`   | List all projects (role-filtered) |
| POST   | `/projects`                               | `projects:create` | Create project                    |
| GET    | `/projects/client/:clientId`              | `projects:view`   | Get projects for a client         |
| GET    | `/projects/:id`                           | `projects:view`   | Get project with full details     |
| PATCH  | `/projects/:id`                           | `projects:edit`   | Update project                    |
| DELETE | `/projects/:id`                           | `projects:delete` | Delete project                    |
| POST   | `/projects/bulk-update`                   | `projects:edit`   | Bulk update multiple projects     |
| POST   | `/projects/bulk-delete`                   | `projects:delete` | Bulk delete multiple projects     |
| POST   | `/projects/convert-lead/:leadId`          | `projects:create` | Convert lead to project           |
| GET    | `/projects/:id/costs`                     | `costs:view`      | List cost logs                    |
| POST   | `/projects/:id/costs`                     | `costs:create`    | Add cost log                      |
| DELETE | `/projects/:id/costs/:costId`             | `costs:delete`    | Delete cost log                   |
| GET    | `/projects/:id/assignments`               | `projects:view`   | List crew assignments             |
| POST   | `/projects/:id/assignments`               | `projects:edit`   | Add crew assignment               |
| DELETE | `/projects/:id/assignments/:assignmentId` | `projects:edit`   | Remove crew assignment            |
| GET    | `/projects/:id/service-items`             | `projects:view`   | List linked service items         |
| POST   | `/projects/:id/service-items`             | `projects:edit`   | Add service item to project       |

### Addenda (`/api/addenda`)

| Method | Endpoint                          | Permission        | Description                    |
| ------ | --------------------------------- | ----------------- | ------------------------------ |
| GET    | `/addenda/:projectId`             | `projects:view`   | List addenda for a project     |
| POST   | `/addenda`                        | `projects:edit`   | Create addendum                |
| PATCH  | `/addenda/:id`                    | `projects:edit`   | Update addendum                |
| DELETE | `/addenda/:id`                    | `projects:edit`   | Delete addendum                |
| POST   | `/addenda/:id/lines`              | `projects:edit`   | Add line item to addendum      |
| PATCH  | `/addenda/:id/lines/:lineId`      | `projects:edit`   | Update line item               |
| DELETE | `/addenda/:id/lines/:lineId`      | `projects:edit`   | Delete line item               |
| POST   | `/addenda/:id/approve`            | `projects:edit`   | Approve addendum               |

### Contacts (`/api/contacts`, `/api/clients/:id/contacts`, `/api/leads/:id/contacts`)

| Method | Endpoint                               | Permission     | Description                      |
| ------ | -------------------------------------- | -------------- | -------------------------------- |
| GET    | `/clients/:clientId/contacts`          | `clients:view` | List contacts for a client       |
| POST   | `/clients/:clientId/contacts`          | `clients:edit` | Create contact under a client    |
| GET    | `/leads/:leadId/contacts`              | `leads:view`   | List contacts linked to a lead   |
| POST   | `/leads/:leadId/contacts/:contactId`   | `leads:edit`   | Link contact to a lead           |
| DELETE | `/leads/:leadId/contacts/:contactId`   | `leads:edit`   | Unlink contact from a lead       |
| GET    | `/contacts/:id`                        | `clients:view` | Get a single contact             |
| PATCH  | `/contacts/:id`                        | `clients:edit` | Update a contact                 |
| DELETE | `/contacts/:id`                        | `clients:edit` | Delete a contact                 |

### Quotes (`/api/quotes`)

| Method | Endpoint              | Permission      | Description                                |
| ------ | --------------------- | --------------- | ------------------------------------------ |
| GET    | `/quotes`             | `quotes:view`   | List quotes (`?leadId=&clientId=&status=`) |
| GET    | `/quotes/settings`    | `quotes:view`   | Get global quote settings                  |
| PATCH  | `/quotes/settings`    | `quotes:edit`   | Update global quote settings               |
| GET    | `/quotes/:id`         | `quotes:view`   | Get quote with line items                  |
| GET    | `/quotes/:id/pdf`     | `quotes:view`   | Download quote as PDF                      |
| POST   | `/quotes`             | `quotes:create` | Create quote                               |
| PATCH  | `/quotes/:id`         | `quotes:edit`   | Update quote                               |
| DELETE | `/quotes/:id`         | `quotes:delete` | Delete quote                               |
| POST   | `/quotes/:id/send`    | `quotes:edit`   | Mark quote as sent                         |
| POST   | `/quotes/:id/accept`  | `quotes:edit`   | Mark quote as accepted                     |
| POST   | `/quotes/:id/reject`  | `quotes:edit`   | Mark quote as rejected                     |

### Cost Breakdowns (`/api/cost-breakdowns`)

| Method | Endpoint                                                      | Permission        | Description                          |
| ------ | ------------------------------------------------------------- | ----------------- | ------------------------------------ |
| GET    | `/cost-breakdowns`                                            | `quotes:view`     | List all breakdowns                  |
| POST   | `/cost-breakdowns`                                            | `quotes:create`   | Create breakdown                     |
| GET    | `/cost-breakdowns/:id`                                        | `quotes:view`     | Get breakdown with lines             |
| PATCH  | `/cost-breakdowns/:id`                                        | `quotes:edit`     | Update breakdown                     |
| DELETE | `/cost-breakdowns/:id`                                        | `quotes:delete`   | Delete breakdown                     |
| GET    | `/cost-breakdowns/:id/pdf`                                    | `quotes:view`     | Download breakdown as PDF            |
| POST   | `/cost-breakdowns/:id/lines`                                  | `quotes:edit`     | Add line item                        |
| PATCH  | `/cost-breakdowns/:id/lines/:lineId`                          | `quotes:edit`     | Update line item                     |
| DELETE | `/cost-breakdowns/:id/lines/:lineId`                          | `quotes:edit`     | Delete line item                     |
| PUT    | `/cost-breakdowns/lines/:lineId/role-estimates`               | `quotes:edit`     | Upsert role estimate on a line       |
| DELETE | `/cost-breakdowns/lines/:lineId/role-estimates/:subtaskId/:role` | `quotes:edit`  | Delete role estimate                 |

### Proposals (`/api/proposals`)

| Method | Endpoint                  | Permission        | Description                       |
| ------ | ------------------------- | ----------------- | --------------------------------- |
| GET    | `/proposals`              | `quotes:view`     | List proposals                    |
| POST   | `/proposals`              | `quotes:create`   | Generate proposal from template   |
| GET    | `/proposals/:id`          | `quotes:view`     | Get proposal                      |
| PATCH  | `/proposals/:id`          | `quotes:edit`     | Update proposal                   |
| DELETE | `/proposals/:id`          | `quotes:delete`   | Delete proposal                   |
| POST   | `/proposals/:id/accept`   | `quotes:edit`     | Mark proposal as accepted         |
| POST   | `/proposals/bulk-update`  | `quotes:edit`     | Bulk update proposals             |
| POST   | `/proposals/bulk-delete`  | `quotes:delete`   | Bulk delete proposals             |
| GET    | `/proposal-templates`     | `settings:view`   | List proposal templates           |
| POST   | `/proposal-templates`     | `settings:manage` | Create proposal template          |
| PATCH  | `/proposal-templates/:id` | `settings:manage` | Update proposal template          |
| DELETE | `/proposal-templates/:id` | `settings:manage` | Delete proposal template          |

### Products (`/api/products`)

| Method | Endpoint        | Permission        | Description                             |
| ------ | --------------- | ----------------- | --------------------------------------- |
| GET    | `/products`     | `quotes:view`     | List products (`?includeInactive=true`) |
| GET    | `/products/:id` | `quotes:view`     | Get a product                           |
| POST   | `/products`     | `settings:manage` | Create product                          |
| PATCH  | `/products/:id` | `settings:manage` | Update product                          |
| DELETE | `/products/:id` | `settings:manage` | Delete product                          |

### Service Items (`/api/service-items`)

| Method | Endpoint                                        | Permission        | Description                            |
| ------ | ----------------------------------------------- | ----------------- | -------------------------------------- |
| GET    | `/service-items`                                | `settings:view`   | List service items (`?serviceTypeId=`) |
| GET    | `/service-items/:id`                            | `settings:view`   | Get service item with subtasks         |
| POST   | `/service-items`                                | `settings:manage` | Create service item                    |
| PATCH  | `/service-items/:id`                            | `settings:manage` | Update service item                    |
| DELETE | `/service-items/:id`                            | `settings:manage` | Delete service item                    |
| POST   | `/service-items/:id/subtasks`                   | `settings:manage` | Add subtask                            |
| PATCH  | `/service-items/:id/subtasks/:subtaskId`        | `settings:manage` | Update subtask                         |
| DELETE | `/service-items/:id/subtasks/:subtaskId`        | `settings:manage` | Delete subtask                         |
| POST   | `/service-items/:id/subtasks/reorder`           | `settings:manage` | Reorder subtasks                       |

### Tasks (`/api/tasks`)

| Method | Endpoint                              | Permission     | Description                                    |
| ------ | ------------------------------------- | -------------- | ---------------------------------------------- |
| GET    | `/tasks`                              | `tasks:view`   | List tasks (filtered, role-scoped)             |
| GET    | `/tasks/summary`                      | `tasks:view`   | My tasks summary (open, in-progress, overdue)  |
| GET    | `/tasks/team-summary`                 | `tasks:view`   | Team-wide task summary                         |
| GET    | `/tasks/entity/:entityType/:entityId` | `tasks:view`   | Tasks linked to a specific entity              |
| GET    | `/tasks/:id`                          | `tasks:view`   | Get a task                                     |
| POST   | `/tasks`                              | `tasks:create` | Create task                                    |
| PATCH  | `/tasks/:id`                          | `tasks:edit`   | Update task                                    |
| PATCH  | `/tasks/:id/complete`                 | `tasks:edit`   | Complete task with a note                      |
| DELETE | `/tasks/:id`                          | `tasks:delete` | Delete task                                    |

### Time Tracking (`/api/time-tracking`)

| Method | Endpoint                                     | Permission        | Description                         |
| ------ | -------------------------------------------- | ----------------- | ----------------------------------- |
| GET    | `/time-tracking/entries`                     | `tasks:view`      | List time entries (filtered)        |
| POST   | `/time-tracking/entries`                     | `tasks:create`    | Create time entry                   |
| PATCH  | `/time-tracking/entries/:id`                 | `tasks:edit`      | Update time entry                   |
| DELETE | `/time-tracking/entries/:id`                 | `tasks:delete`    | Delete time entry                   |
| GET    | `/time-tracking/user-rates`                  | `settings:view`   | Get user rates                      |
| POST   | `/time-tracking/user-rates`                  | `settings:manage` | Create/update user rate             |
| GET    | `/time-tracking/work-codes`                  | `settings:view`   | List work codes                     |
| POST   | `/time-tracking/work-codes`                  | `settings:manage` | Create work code                    |
| PATCH  | `/time-tracking/work-codes/:id`              | `settings:manage` | Update work code                    |
| DELETE | `/time-tracking/work-codes/:id`              | `settings:manage` | Delete work code                    |
| GET    | `/time-tracking/pay-grades`                  | `settings:view`   | List pay grades                     |
| POST   | `/time-tracking/pay-grades`                  | `settings:manage` | Create pay grade                    |
| GET    | `/time-tracking/indot-pay-zones`             | `settings:view`   | List INDOT pay zones                |
| POST   | `/time-tracking/indot-pay-zones`             | `settings:manage` | Create INDOT pay zone               |
| GET    | `/time-tracking/project-budgets/:projectId`  | `projects:view`   | Get project budget                  |
| POST   | `/time-tracking/project-budgets`             | `projects:edit`   | Create/update project budget        |
| GET    | `/time-tracking/project-summary/:projectId`  | `projects:view`   | Get project time summary            |
| GET    | `/time-tracking/user-summary/:userId`        | `tasks:view`      | Get user time summary               |
| GET    | `/time-tracking/weekly-timesheet`            | `tasks:view`      | Get weekly timesheet                |

### PTO (`/api/pto`)

| Method | Endpoint                        | Permission        | Description                    |
| ------ | ------------------------------- | ----------------- | ------------------------------ |
| GET    | `/pto/policies`                 | `settings:view`   | List PTO policies              |
| POST   | `/pto/policies`                 | `settings:manage` | Create PTO policy              |
| PATCH  | `/pto/policies/:id`             | `settings:manage` | Update PTO policy              |
| DELETE | `/pto/policies/:id`             | `settings:manage` | Delete PTO policy              |
| GET    | `/pto/requests`                 | `tasks:view`      | List PTO requests (role-scoped)|
| POST   | `/pto/requests`                 | `tasks:create`    | Submit PTO request             |
| GET    | `/pto/requests/:id`             | `tasks:view`      | Get PTO request                |
| PATCH  | `/pto/requests/:id/approve`     | `tasks:edit`      | Approve PTO request            |
| PATCH  | `/pto/requests/:id/deny`        | `tasks:edit`      | Deny PTO request               |
| DELETE | `/pto/requests/:id`             | `tasks:delete`    | Delete PTO request             |

### Workflows (`/api/workflows`)

| Method | Endpoint                    | Permission         | Description                       |
| ------ | --------------------------- | ------------------ | --------------------------------- |
| GET    | `/workflows`                | `workflows:view`   | List all workflow rules           |
| GET    | `/workflows/:id`            | `workflows:view`   | Get rule with executions          |
| POST   | `/workflows`                | `workflows:create` | Create workflow rule              |
| PATCH  | `/workflows/:id`            | `workflows:edit`   | Update workflow rule              |
| DELETE | `/workflows/:id`            | `workflows:delete` | Delete workflow rule              |
| GET    | `/workflows/:id/executions` | `workflows:view`   | Get execution history for a rule  |
| POST   | `/workflows/:id/test`       | `workflows:view`   | Test rule against an entity       |

### Forecast (`/api/forecast`)

| Method | Endpoint            | Permission       | Description                           |
| ------ | ------------------- | ---------------- | ------------------------------------- |
| GET    | `/forecast/summary` | `dashboard:view` | Forecast summary (pipeline + targets) |
| GET    | `/forecast/monthly` | `dashboard:view` | Monthly forecast (`?months=6`)        |
| GET    | `/forecast/targets` | `dashboard:view` | All revenue targets                   |
| POST   | `/forecast/targets` | `dashboard:view` | Create or update a monthly target     |

### Bottleneck Analytics (`/api/bottleneck`)

| Method | Endpoint                    | Permission     | Description                            |
| ------ | --------------------------- | -------------- | -------------------------------------- |
| GET    | `/bottleneck/stage-dwell`   | `reports:view` | Avg/median/max days per pipeline stage |
| GET    | `/bottleneck/task-velocity` | `reports:view` | Per-user task completion rates         |
| GET    | `/bottleneck/overdue`       | `reports:view` | Overdue task breakdown                 |
| GET    | `/bottleneck/stuck-projects`| `reports:view` | Projects exceeding stall threshold     |
| GET    | `/bottleneck/widget-summary`| `reports:view` | Dashboard-ready bottleneck summary     |
| POST   | `/bottleneck/ai-report`     | `reports:view` | Generate AI bottleneck report          |
| GET    | `/bottleneck/ai-report`     | `reports:view` | Get latest AI analytics report         |

### QuickBooks (`/api/quickbooks`)

| Method | Endpoint                             | Permission        | Description                         |
| ------ | ------------------------------------ | ----------------- | ----------------------------------- |
| GET    | `/quickbooks/connect`                | `settings:manage` | Initiate QB OAuth flow              |
| GET    | `/quickbooks/callback`               | Public            | QB OAuth callback                   |
| POST   | `/quickbooks/disconnect`             | `settings:manage` | Disconnect QB                       |
| GET    | `/quickbooks/status`                 | `settings:view`   | Get QB connection status            |
| POST   | `/quickbooks/sync/clients`           | `settings:manage` | Sync clients ↔ QB customers         |
| POST   | `/quickbooks/sync/payments`          | `settings:manage` | Sync QB payments                    |
| POST   | `/quickbooks/sync/expenses`          | `settings:manage` | Sync QB expenses as cost logs       |
| POST   | `/quickbooks/sync/service-items`     | `settings:manage` | Sync service items ↔ QB items       |
| POST   | `/quickbooks/invoice/:quoteId`       | `quotes:edit`     | Create QB invoice from quote        |
| POST   | `/quickbooks/webhook`                | Public            | QB webhook endpoint (Intuit-signed) |

### Forms (`/api/forms`)

| Method | Endpoint                       | Auth              | Description                         |
| ------ | ------------------------------ | ----------------- | ----------------------------------- |
| GET    | `/forms/public/:apiKey`        | Public            | Get public form definition          |
| POST   | `/forms/public/:apiKey/submit` | Public            | Submit a form (creates a lead)      |
| GET    | `/forms`                       | `settings:manage` | List all forms                      |
| POST   | `/forms`                       | `settings:manage` | Create form                         |
| GET    | `/forms/:id`                   | `settings:manage` | Get form                            |
| PATCH  | `/forms/:id`                   | `settings:manage` | Update form                         |
| DELETE | `/forms/:id`                   | `settings:manage` | Delete form                         |
| GET    | `/forms/:id/analytics`         | `settings:manage` | Get submission analytics for a form |

### Notifications (`/api/notifications`)

| Method | Endpoint                       | Permission           | Description                                        |
| ------ | ------------------------------ | -------------------- | -------------------------------------------------- |
| GET    | `/notifications`               | `notifications:view` | List notifications (`?unread=&limit=&offset=`)     |
| GET    | `/notifications/unread-count`  | `notifications:view` | Get unread notification count                      |
| PATCH  | `/notifications/:id/read`      | `notifications:view` | Mark a notification as read                        |
| POST   | `/notifications/mark-all-read` | `notifications:view` | Mark all notifications as read                     |
| GET    | `/notifications/preferences`   | `notifications:view` | Get notification preferences                       |
| PATCH  | `/notifications/preferences`   | `notifications:view` | Update notification preferences                    |
| GET    | `/notifications/stream`        | `notifications:view` | SSE stream for real-time notifications             |

### Custom Fields (`/api/custom-fields`)

| Method | Endpoint                                      | Permission        | Description                                  |
| ------ | --------------------------------------------- | ----------------- | -------------------------------------------- |
| GET    | `/custom-fields/definitions`                  | `settings:manage` | List definitions (`?entityType=`)            |
| GET    | `/custom-fields/definitions/:id`              | `settings:manage` | Get a definition                             |
| POST   | `/custom-fields/definitions`                  | `settings:manage` | Create a definition                          |
| PATCH  | `/custom-fields/definitions/:id`              | `settings:manage` | Update a definition                          |
| DELETE | `/custom-fields/definitions/:id`              | `settings:manage` | Delete a definition                          |
| POST   | `/custom-fields/definitions/reorder`          | `settings:manage` | Reorder definitions for an entity type       |
| GET    | `/custom-fields/values/:entityType/:entityId` | `leads:view`      | Get custom field values for an entity        |
| POST   | `/custom-fields/values/:entityType/:entityId` | `leads:edit`      | Bulk-set custom field values for an entity   |

### Dashboard (`/api/dashboard`)

| Method | Endpoint                           | Permission       | Description                                     |
| ------ | ---------------------------------- | ---------------- | ----------------------------------------------- |
| GET    | `/dashboard/metrics`               | `dashboard:view` | Full metrics (`?period=`)                       |
| GET    | `/dashboard/executive-summary`     | `dashboard:view` | AI executive summary (`?provider=`)             |
| GET    | `/dashboard/revenue-breakdown`     | `dashboard:view` | Revenue by client/project                       |
| GET    | `/dashboard/project-analytics`     | `dashboard:view` | Projects by status + at-risk                    |
| GET    | `/dashboard/revenue-trend`         | `dashboard:view` | Monthly revenue (12 months)                     |
| GET    | `/dashboard/lead-volume-trend`     | `dashboard:view` | Weekly lead volume (12 weeks)                   |
| GET    | `/dashboard/pipeline-insights`     | `dashboard:view` | Pipeline breakdown + stale leads                |
| GET    | `/dashboard/layout`                | `dashboard:view` | Get user's widget layout                        |
| PUT    | `/dashboard/layout`                | `dashboard:edit` | Save widget layout                              |
| DELETE | `/dashboard/layout`                | `dashboard:edit` | Reset layout to defaults                        |
| GET    | `/dashboard/layout/defaults/:role` | `dashboard:view` | Get default layout for a role                   |

### Reports (`/api/reports`)

| Method | Endpoint                               | Permission     | Description                  |
| ------ | -------------------------------------- | -------------- | ---------------------------- |
| GET    | `/reports/leads/overview`              | `reports:view` | Lead overview stats          |
| GET    | `/reports/leads/stage-analysis`        | `reports:view` | Counts + values per stage    |
| GET    | `/reports/leads/conversion-funnel`     | `reports:view` | Funnel conversion rates      |
| GET    | `/reports/leads/revenue-by-rep`        | `reports:view` | Won revenue by rep           |
| GET    | `/reports/leads/overdue`               | `reports:view` | Stale pipeline items         |
| GET    | `/reports/projects/overview`           | `reports:view` | Project summary stats        |
| GET    | `/reports/projects/profitability`      | `reports:view` | Per-project profitability    |
| GET    | `/reports/projects/risk-distribution`  | `reports:view` | Distribution by risk status  |
| GET    | `/reports/projects/cost-breakdown`     | `reports:view` | Costs by category            |
| GET    | `/reports/clients/overview`            | `reports:view` | Client portfolio overview    |
| GET    | `/reports/clients/revenue-analysis`    | `reports:view` | Revenue per client           |
| GET    | `/reports/clients/health-trends`       | `reports:view` | Health status distribution   |
| GET    | `/reports/clients/retention-metrics`   | `reports:view` | Client retention data        |
| GET    | `/reports/clients/engagement-trends`   | `reports:view` | Activity engagement patterns |
| GET    | `/reports/clients/health-score-trends` | `reports:view` | Health score over time       |
| GET    | `/reports/reps/overview`               | `reports:view` | Rep performance overview     |
| GET    | `/reports/reps/performance`            | `reports:view` | Individual rep metrics       |
| GET    | `/reports/reps/stage-time`             | `reports:view` | Avg time per stage by rep    |

### Activities (polymorphic)

| Method | Endpoint                                      | Permission      | Description             |
| ------ | --------------------------------------------- | --------------- | ----------------------- |
| POST   | `/leads/:leadId/activities`                   | `leads:edit`    | Create lead activity    |
| GET    | `/leads/:leadId/activities`                   | `leads:view`    | List lead activities    |
| DELETE | `/leads/:leadId/activities/:activityId`       | `leads:edit`    | Delete lead activity    |
| POST   | `/clients/:clientId/activities`               | `clients:edit`  | Create client activity  |
| GET    | `/clients/:clientId/activities`               | `clients:view`  | List client activities  |
| DELETE | `/clients/:clientId/activities/:activityId`   | `clients:edit`  | Delete client activity  |
| POST   | `/projects/:projectId/activities`             | `projects:edit` | Create project activity |
| GET    | `/projects/:projectId/activities`             | `projects:view` | List project activities |
| DELETE | `/projects/:projectId/activities/:activityId` | `projects:edit` | Delete project activity |

### Files (polymorphic)

| Method | Endpoint                                      | Permission      | Description            |
| ------ | --------------------------------------------- | --------------- | ---------------------- |
| POST   | `/leads/:leadId/files`                        | `leads:edit`    | Upload file (10MB max) |
| GET    | `/leads/:leadId/files`                        | `leads:view`    | List files             |
| GET    | `/leads/:leadId/files/:fileId`                | `leads:view`    | Get file metadata      |
| GET    | `/leads/:leadId/files/:fileId/download`       | `leads:view`    | Download file          |
| DELETE | `/leads/:leadId/files/:fileId`                | `leads:edit`    | Delete file            |
| POST   | `/clients/:clientId/files`                    | `clients:edit`  | Upload client file     |
| GET    | `/clients/:clientId/files`                    | `clients:view`  | List client files      |
| GET    | `/clients/:clientId/files/:fileId/download`   | `clients:view`  | Download client file   |
| DELETE | `/clients/:clientId/files/:fileId`            | `clients:edit`  | Delete client file     |
| POST   | `/projects/:projectId/files`                  | `projects:edit` | Upload project file    |
| GET    | `/projects/:projectId/files`                  | `projects:view` | List project files     |
| GET    | `/projects/:projectId/files/:fileId/download` | `projects:view` | Download project file  |
| DELETE | `/projects/:projectId/files/:fileId`          | `projects:edit` | Delete project file    |

### AI (`/api/ai`)

| Method | Endpoint                | Permission       | Description                |
| ------ | ----------------------- | ---------------- | -------------------------- |
| POST   | `/ai/executive-summary` | `dashboard:view` | Generate executive summary |
| POST   | `/ai/chat`              | `leads:view`     | AI chat assistant          |
| GET    | `/ai/providers`         | `dashboard:view` | List available providers   |

### Admin (`/api/admin`)

| Method | Endpoint                           | Permission         | Description                     |
| ------ | ---------------------------------- | ------------------ | ------------------------------- |
| GET    | `/admin/users`                     | `users:view`       | List users (hierarchy-filtered) |
| POST   | `/admin/users`                     | `users:create`     | Create user                     |
| PATCH  | `/admin/users/:id`                 | `users:edit`       | Update user                     |
| DELETE | `/admin/users/:id`                 | `users:delete`     | Delete user                     |
| GET    | `/admin/ai-settings`               | `ai_settings:view` | Get AI settings (keys masked)   |
| PATCH  | `/admin/ai-settings`               | `ai_settings:edit` | Update AI settings              |
| GET    | `/admin/api-keys/status`           | `ai_settings:view` | Validate API key status         |
| GET    | `/admin/tenant-settings`           | `settings:view`    | Get tenant settings             |
| PATCH  | `/admin/tenant-settings`           | `settings:edit`    | Update tenant settings          |
| GET    | `/admin/audit-logs`                | `audit_logs:view`  | Get audit logs                  |
| GET    | `/admin/audit-logs/user/:userId`   | `audit_logs:view`  | Audit logs by user              |
| GET    | `/admin/audit-logs/action/:action` | `audit_logs:view`  | Audit logs by action            |

### Roles (`/api/admin/roles`)

| Method | Endpoint            | Permission         | Description         |
| ------ | ------------------- | ------------------ | ------------------- |
| GET    | `/admin/roles`      | `permissions:view` | List roles + counts |
| POST   | `/admin/roles`      | `permissions:edit` | Create custom role  |
| PATCH  | `/admin/roles/:key` | `permissions:edit` | Update role         |
| DELETE | `/admin/roles/:key` | `permissions:edit` | Delete custom role  |

### Permissions (`/api/permissions`)

| Method | Endpoint                  | Permission         | Description                   |
| ------ | ------------------------- | ------------------ | ----------------------------- |
| GET    | `/permissions/matrix`     | `permissions:view` | Full permission matrix        |
| PUT    | `/permissions/role/:role` | `permissions:edit` | Update permissions for a role |

### Pipeline (`/api/pipeline`)

| Method | Endpoint                   | Permission        | Description            |
| ------ | -------------------------- | ----------------- | ---------------------- |
| GET    | `/pipeline/stages`         | `leads:view`      | List stages (`?type=`) |
| POST   | `/pipeline/stages`         | `pipeline:manage` | Create stage           |
| PATCH  | `/pipeline/stages/reorder` | `pipeline:manage` | Reorder stages         |
| PATCH  | `/pipeline/stages/:id`     | `pipeline:manage` | Update stage           |
| DELETE | `/pipeline/stages/:id`     | `pipeline:manage` | Delete stage           |

### Teams (`/api/teams`)

| Method | Endpoint                     | Permission             | Description     |
| ------ | ---------------------------- | ---------------------- | --------------- |
| POST   | `/teams`                     | `teams:create`         | Create team     |
| GET    | `/teams`                     | `teams:view`           | List teams      |
| GET    | `/teams/:id`                 | `teams:view`           | Get team detail |
| PATCH  | `/teams/:id`                 | `teams:edit`           | Update team     |
| DELETE | `/teams/:id`                 | `teams:delete`         | Delete team     |
| POST   | `/teams/:id/members`         | `teams:manage_members` | Add member      |
| DELETE | `/teams/:id/members/:userId` | `teams:manage_members` | Remove member   |

### Settings (`/api/settings`)

| Method | Endpoint                             | Permission        | Description                      |
| ------ | ------------------------------------ | ----------------- | -------------------------------- |
| GET    | `/settings/service-types`            | `leads:view`      | List service types               |
| POST   | `/settings/service-types`            | `settings:manage` | Create service type              |
| PATCH  | `/settings/service-types/:id`        | `settings:manage` | Update service type              |
| DELETE | `/settings/service-types/:id`        | `settings:manage` | Delete service type              |
| GET    | `/settings/task-types`               | `tasks:view`      | List task types                  |
| POST   | `/settings/task-types`               | `settings:manage` | Create task type                 |
| PATCH  | `/settings/task-types/:id`           | `settings:manage` | Update task type                 |
| DELETE | `/settings/task-types/:id`           | `settings:manage` | Delete task type                 |
| GET    | `/settings/dropdown-options`         | `leads:view`      | Get active dropdown options      |
| GET    | `/settings/dropdown-options/all`     | `settings:manage` | Get all options (incl. inactive) |
| POST   | `/settings/dropdown-options`         | `settings:manage` | Create dropdown option           |
| PATCH  | `/settings/dropdown-options/:id`     | `settings:manage` | Update dropdown option           |
| DELETE | `/settings/dropdown-options/:id`     | `settings:manage` | Delete dropdown option           |
| POST   | `/settings/dropdown-options/reorder` | `settings:manage` | Reorder options                  |

### Health

| Method | Endpoint  | Auth   | Description  |
| ------ | --------- | ------ | ------------ |
| GET    | `/health` | Public | Health check |

---

## AI Provider Configuration

### Supported Providers

| Provider         | Model                    | Best For                             | API Key                                                 |
| ---------------- | ------------------------ | ------------------------------------ | ------------------------------------------------------- |
| Anthropic Claude | `claude-sonnet-4-6`      | Complex reasoning, detailed analysis | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI GPT       | `gpt-4o`                 | Structured JSON responses            | [platform.openai.com](https://platform.openai.com/)     |
| Google Gemini    | `gemini-3-flash-preview` | Fast responses, cost efficiency      | [ai.google.dev](https://ai.google.dev/)                 |

### Configuration Methods

**Environment variable** — Set `AI_DEFAULT_PROVIDER` in `backend/.env`:

```env
AI_DEFAULT_PROVIDER=anthropic  # or 'openai' or 'gemini'
```

**Admin panel** — Navigate to Admin → AI Settings:

- Select default provider
- Set per-capability overrides (lead risk, client health, executive summary, chat)
- Manage API keys (stored encrypted with AES-256-CBC, displayed masked)
- Validate API keys against provider APIs
- Edit custom prompts for each AI capability

**Per-request** — API endpoints accept an optional `provider` query parameter to override at call time.

**Resolution priority** — Explicit API argument → per-feature DB override → DB default provider → env `AI_DEFAULT_PROVIDER` → OpenAI fallback.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable              | Required | Description                                  |
| --------------------- | -------- | -------------------------------------------- |
| `DATABASE_URL`        | Yes      | PostgreSQL connection string                 |
| `JWT_SECRET`          | Yes      | Secret key for JWT signing                   |
| `JWT_EXPIRES_IN`      | No       | Token expiry (default: `7d`)                 |
| `PORT`                | No       | Server port (default: `4000`)                |
| `CORS_ORIGIN`         | No       | Allowed CORS origins                         |
| `FRONTEND_URL`        | No       | Frontend URL for email links                 |
| `ANTHROPIC_API_KEY`   | No\*     | Anthropic API key                            |
| `OPENAI_API_KEY`      | No\*     | OpenAI API key                               |
| `GEMINI_API_KEY`      | No\*     | Google Gemini API key                        |
| `AI_DEFAULT_PROVIDER` | No       | Default AI provider (anthropic/openai/gemini)|
| `RESEND_API_KEY`      | No       | Resend email API key (console fallback)      |
| `GCP_PROJECT_ID`      | No       | Google Cloud project ID                      |
| `GCP_STORAGE_BUCKET`  | No       | GCP Storage bucket name                      |
| `ENCRYPTION_KEY`      | No       | 32-char key for AI key encryption            |
| `QB_CLIENT_ID`        | No       | QuickBooks OAuth client ID                   |
| `QB_CLIENT_SECRET`    | No       | QuickBooks OAuth client secret               |
| `QB_REDIRECT_URI`     | No       | QuickBooks OAuth redirect URI                |
| `QB_ENVIRONMENT`      | No       | QuickBooks environment (sandbox/production)  |

\* At least one AI API key is required for AI features to work.

### Frontend (`frontend/.env.local`)

| Variable              | Required | Description                                            |
| --------------------- | -------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_API_URL` | Yes      | Backend API URL (default: `http://localhost:4000/api`) |

---

## Development Commands

### Backend (run from `backend/`)

```bash
npm run start:dev          # Watch mode with hot reload
npm run build              # Compile TypeScript
npm run start:prod         # Production mode

# Database
npx prisma generate        # Regenerate Prisma client
npx prisma migrate dev     # Run migrations (dev)
npx prisma db seed         # Seed base data
npm run seed:demo          # Seed extended demo data
npx prisma studio          # DB GUI at localhost:5555

# Docker (PostgreSQL)
docker-compose up -d       # Start PostgreSQL container
docker-compose down        # Stop PostgreSQL container
```

### Frontend (run from `frontend/`)

```bash
npm run dev                # Dev server at localhost:3000
npm run build              # Production build
npm run lint               # ESLint
```

---

## Troubleshooting

### Backend not starting

- Verify `DATABASE_URL` is correct in `backend/.env`
- Ensure PostgreSQL is running (`docker-compose up -d` if using Docker)
- Run `npx prisma generate` if you see Prisma client errors
- Check port 4000 isn't already in use

### Frontend showing empty data

- Ensure backend is running on port 4000
- Verify `NEXT_PUBLIC_API_URL=http://localhost:4000/api` in `frontend/.env.local`
- Check browser console for CORS or network errors

### AI features not working

- Add at least one AI provider API key to `backend/.env`
- Validate keys in Admin → AI Settings → API Key Status
- Check the AI settings table has a record (auto-created on first access)

### QuickBooks not connecting

- Verify `QB_CLIENT_ID`, `QB_CLIENT_SECRET`, and `QB_REDIRECT_URI` in `backend/.env`
- Ensure the redirect URI matches exactly what's configured in the Intuit Developer portal
- Check the `QB_ENVIRONMENT` matches your Intuit app configuration (sandbox vs production)

### Notifications not updating in real time

- Ensure the SSE connection is established (check browser DevTools → Network → EventStream)
- Verify the user's session is valid (SSE requires a valid JWT)
- Check that notification preferences are enabled for the relevant notification type

### Workflow rules not firing

- Confirm the rule is set to active in Admin → Workflows
- Check the execution history for error details
- Use the "Test" button to fire the rule against a specific entity and inspect the result

### Permission denied errors

- Check the user's role has the required permission in Admin → Permissions
- CEO always has full access; check other roles in the permission matrix
- Permission changes take effect immediately (cache refreshed)

### File upload failures

- Verify GCP credentials (`gcp-service-account-key.json` or ADC)
- Check `GCP_PROJECT_ID` and `GCP_STORAGE_BUCKET` are set
- Ensure file is under 10MB

### Cost breakdown PDF not generating

- Verify pdfmake is installed in the backend dependencies
- Check that all required fields (role estimates, line items) are populated before generating

### Proposal generation failing

- Ensure LibreOffice is installed on the server (required for DOCX conversion)
- Verify the proposal template GCP path is correct and the file is accessible
- Check that the cost breakdown linked to the proposal is finalized

---

## Tech Stack

| Category     | Technology                                                                  |
| ------------ | --------------------------------------------------------------------------- |
| Frontend     | Next.js 16, React 19, TypeScript, Tailwind CSS, Shadcn/Radix               |
| State        | React Query (TanStack), React Hook Form + Zod                               |
| Charts       | Recharts                                                                    |
| Calendar     | react-big-calendar                                                          |
| Drag & Drop  | dnd-kit                                                                     |
| Tables       | TanStack Table                                                              |
| Search       | cmdk (Command Palette)                                                      |
| Backend      | NestJS, TypeScript, Passport.js (JWT), @nestjs/schedule                     |
| Database     | PostgreSQL, Prisma ORM                                                      |
| Storage      | Google Cloud Storage                                                        |
| Email        | Resend                                                                      |
| AI           | Anthropic SDK, OpenAI SDK, Google Generative AI SDK                         |
| Real-time    | Server-Sent Events (SSE)                                                    |
| PDF          | pdfmake (quote + cost breakdown PDFs)                                       |
| Documents    | LibreOffice (DOCX proposal generation)                                      |
| Integrations | QuickBooks Online (OAuth 2.0, bidirectional sync, webhooks)                 |

---

Built with [Next.js](https://nextjs.org/) · [NestJS](https://nestjs.com/) · [Prisma](https://www.prisma.io/) · [Anthropic](https://www.anthropic.com/) · [OpenAI](https://openai.com/) · [Google AI](https://ai.google/) · [QuickBooks](https://quickbooks.intuit.com/)
