# Relon CRM

A single-tenant, AI-enhanced CRM & Business Performance Dashboard for managing leads, clients, projects, quotes, tasks, and sales pipelines. Built with **Next.js 16** (App Router) and a **NestJS** backend, with multi-provider AI support (Anthropic Claude, OpenAI GPT-4o, Google Gemini).

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
  - [Quotes](#quotes)
  - [Products & Services Catalog](#products--services-catalog)
  - [Tasks](#tasks)
  - [Workflows & Automation](#workflows--automation)
  - [Forecast & Targets](#forecast--targets)
  - [Lead Capture Forms](#lead-capture-forms)
  - [Notifications](#notifications)
  - [Custom Fields](#custom-fields)
  - [Reports & Analytics](#reports--analytics)
  - [AI Integration](#ai-integration)
  - [Administration](#administration)
  - [File Management](#file-management)
  - [Activity Tracking](#activity-tracking)
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
│  │ Passport) │  │  + AI)   │  │  + AI)   │  │  + Status)    │  │
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
│  │ (Metrics) │  │ (4 cats) │  │ (3 provs)│  │ (Users/Roles) │  │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├───────────────┤  │
│  │ Pipeline  │  │ Teams    │  │ Files    │  │ Activities    │  │
│  │ (Stages)  │  │ (Org)    │  │ (GCP)    │  │ (Polymorphic) │  │
│  └─────┬─────┘  └──────────┘  └──────────┘  └───────────────┘  │
│        │                                                        │
│        ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Prisma ORM  →  MySQL (Docker / hosted)  │  GCP Storage  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

| Layer    | Technology                                                                                    |
| -------- | --------------------------------------------------------------------------------------------- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS, Shadcn/Radix, React Query, Recharts, dnd-kit |
| Backend  | NestJS, Passport.js (JWT), Prisma ORM, Resend (email), @nestjs/schedule (cron)                |
| Database | MySQL (Docker Compose or hosted)                                                              |
| Storage  | Google Cloud Storage (private buckets, signed-URL streaming)                                  |
| AI       | Anthropic Claude, OpenAI GPT-4o, Google Gemini (runtime switch)                               |

---

## Project Structure

```
Relon/
├── README.md
├── backend/                     # NestJS API server
│   ├── prisma/
│   │   ├── schema.prisma        # Full data schema
│   │   ├── seed.ts              # Sample data seeder
│   │   └── migrations/          # MySQL migrations
│   ├── src/
│   │   ├── main.ts              # Entry: port 4000, /api prefix, CORS, validation
│   │   ├── app.module.ts        # Root module — global guards (JWT + Permissions)
│   │   ├── auth/                # Login, register, password reset, JWT strategy
│   │   ├── leads/               # Prospective projects pipeline + AI risk analysis
│   │   ├── clients/             # Client portfolio + AI health + upsell
│   │   ├── contacts/            # Contact records scoped to clients/leads
│   │   ├── projects/            # Active projects + cost tracking + status history
│   │   ├── quotes/              # Quote builder + PDF generation + lifecycle
│   │   ├── products/            # Product/service catalog for quoting
│   │   ├── tasks/               # Task management linked to any entity
│   │   ├── workflows/           # Automation rules (triggers → conditions → actions)
│   │   ├── forecast/            # Revenue forecasting + monthly targets
│   │   ├── forms/               # Public lead-capture forms
│   │   ├── notifications/       # Real-time SSE notifications + scheduler
│   │   ├── custom-fields/       # Per-entity custom field definitions + values
│   │   ├── dashboard/           # Executive metrics + AI summary
│   │   ├── reports/             # 4 report categories (leads, projects, clients, reps)
│   │   ├── ai/                  # Multi-provider AI abstraction layer
│   │   │   ├── providers/       # Anthropic, OpenAI, Gemini implementations
│   │   │   ├── prompts/         # Template prompts for each AI capability
│   │   │   └── interfaces/      # AIProvider interface contract
│   │   ├── admin/               # User CRUD, AI settings, audit logs
│   │   ├── permissions/         # RBAC permission matrix
│   │   ├── roles/               # Role definitions (built-in + custom)
│   │   ├── pipeline/            # Customizable pipeline stages
│   │   ├── teams/               # Organizational team structure
│   │   ├── activities/          # Polymorphic activity log (calls, meetings)
│   │   ├── files/               # Polymorphic file upload/download (GCP)
│   │   ├── settings/            # Service types + dropdown option config
│   │   ├── email/               # Transactional emails (Resend API)
│   │   ├── storage/             # GCP Cloud Storage abstraction
│   │   ├── audit/               # Audit trail (14 tracked actions)
│   │   ├── health/              # /api/health endpoint
│   │   └── database/            # Prisma client provider
│   └── package.json
│
├── frontend/                    # Next.js 16 app
│   ├── middleware.ts            # Route protection (auth redirect)
│   ├── app/
│   │   ├── layout.tsx           # Root: QueryProvider → CurrencyProvider → AuthProvider
│   │   ├── page.tsx             # / → redirect to /login or /dashboard
│   │   ├── (auth)/              # Login, register, forgot/reset password
│   │   ├── forms/               # Public form embed pages (no auth)
│   │   └── (dashboard)/         # All protected routes
│   │       ├── dashboard/       # Executive dashboard + AI summary
│   │       ├── leads/           # Pipeline (Kanban + table)
│   │       ├── clients/         # Client portfolio
│   │       ├── projects/        # Project management (Kanban + table)
│   │       ├── quotes/          # Quote builder + list
│   │       ├── tasks/           # Task list + detail
│   │       ├── reports/         # Tabbed analytics (4 categories)
│   │       ├── admin/           # Admin sub-pages
│   │       └── settings/        # User profile + password
│   ├── components/
│   │   ├── layout/              # AppSidebar (collapsible, permission-filtered)
│   │   ├── dashboard/           # EnhancedDashboard, MetricsCards, charts
│   │   ├── leads/               # Kanban, dialogs, AI panel
│   │   ├── clients/             # Client detail, health, metrics
│   │   ├── projects/            # Kanban, costs, stage timeline
│   │   ├── quotes/              # Quote builder, line items, PDF download
│   │   ├── tasks/               # Task list, detail dialog, filters
│   │   ├── reports/             # 4 tab views + filters
│   │   ├── admin/               # Users, teams, permissions, roles
│   │   ├── notifications/       # Notification bell, dropdown, preferences
│   │   ├── providers/           # QueryProvider, CurrencyProvider
│   │   ├── AIAssistant.tsx      # Floating AI chat widget
│   │   └── ui/                  # Shadcn/Radix primitives
│   ├── lib/
│   │   ├── api/                 # API client files (domain-split)
│   │   ├── types.ts             # All TypeScript domain types
│   │   ├── validations/         # Zod schemas for forms
│   │   └── context/             # Auth + Currency contexts
│   └── package.json
│
└── logs/                        # Application logs
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for MySQL via Docker Compose) or a hosted MySQL database
- At least one AI API key (Anthropic, OpenAI, or Google)

### 1. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment

**Backend** (`backend/.env`):

```env
DATABASE_URL="mysql://user:pass@host:3306/db"
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
docker-compose up -d      # Starts MySQL on port 3306
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
   │ Ongoing Mgmt    │  Tasks, Activities, Files,
   │ AI Health Score │  Cost Tracking, Quotes,
   │ Upsell Strategy │  Contacts, Custom Fields,
   │ Workflow Rules  │  Notifications, Forecast
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

1. **Sales rep creates a lead** → Lead appears in pipeline Kanban at "New" stage
2. **Activities logged** → Calls and meetings tracked against the lead with dates
3. **Files uploaded** → Briefs, drawings, quotations stored in GCP
4. **Tasks created** → Follow-up tasks assigned to team members, linked to the lead
5. **Stage progression** → Drag lead through pipeline stages (each transition recorded in StageHistory)
6. **Workflow automation** → Rules fire automatically on stage change, sending notifications or assigning users
7. **AI risk analysis** → System analyzes the lead and flags risks (no contact, stale pipeline, high value)
8. **Quote generated** → Quote builder creates a line-item quote, PDF exported, sent to client
9. **Deal won** → Lead moves to "Won", `dealClosedAt` + `contractedValue` captured via CloseWonDialog
10. **Convert to Client + Project** → ConvertLeadDialog creates/links a Client record and creates a Project with PM/designer/QS carry-over from the lead
11. **Project tracked** → Cost logs, status changes, activities, tasks, and files managed under the project
12. **Client relationship** → Health score calculated, AI generates upsell strategies, contacts tracked, activity engagement tracked
13. **Forecast** → Won revenue feeds monthly forecast charts; targets set per month for comparison

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

The main dashboard (`/dashboard`) provides a real-time executive view:

- **Revenue metrics** — Total, monthly, and quarterly revenue with period comparison
- **Pipeline metrics** — Total leads, won/lost counts, win rate, average deal size
- **Time metrics** — Average time-to-quote and time-to-close
- **Project analytics** — Active projects, at-risk projects, projects by status
- **Client data** — Active clients, top clients, revenue concentration risk
- **Revenue trend** — 12-month area chart
- **Lead volume trend** — 12-week bar chart
- **Funnel visualization** — Drop-off rates between pipeline stages
- **Forecast widget** — Monthly revenue vs. targets for the next 6 months
- **AI Executive Summary** — On-demand overview covering what changed, what's at risk, what needs attention, and key insights
- **AI Pipeline Insights** — Bottleneck analysis, win probability by stage, urgent leads, recommendations
- **Period filtering** — Week / Month / Quarter
- **Executing company filter** — Filter all metrics by company

### Leads (Prospective Projects)

The sales pipeline (`/leads`) manages opportunities from initial contact to close:

- **Dual views** — Drag-and-drop Kanban board + sortable/filterable data table
- **Pipeline stats bar** — Total value, stage distribution, key metrics at a glance
- **Full lead lifecycle** — Create → track activities → upload files → progress through stages → close
- **Close Won dialog** — Captures contracted value and close date when moving to "Won"
- **Lead-to-Client+Project conversion** — One-click conversion that creates or links a client and creates a project with assignment carry-over
- **Contact reps** — Multiple contact representatives per lead (name, phone, email)
- **Contacts** — Link existing client contacts directly to a lead
- **Assignment** — Sales rep, designer, and QS assignments with role-based visibility
- **Lead metrics** — Days in pipeline, days since last contact, activity count, file count, days to quotation
- **Risk flags** — Automated detection: NO_CONTACT, LONG_PIPELINE, HIGH_VALUE_STALE, STALLED, NO_ACTIVITY
- **AI risk analysis** — Per-lead AI-generated risk level, summary, and recommendations
- **AI email drafting** — AI drafts follow-up emails based on lead context
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

### Contacts

A structured contact book that works across clients and leads:

- **Client-scoped contacts** — Create and list contacts belonging to a specific client
- **Lead contact linking** — Link existing contacts from a client's book to a lead, or unlink them
- **Contact details** — Name, email, phone, job title, and notes per contact
- **Individual contact management** — View, update, and delete any contact record
- **Reusable across entities** — One contact record can be linked to multiple leads

### Project Management

Active project tracking (`/projects`) covers delivery and cost management:

- **Dual views** — Kanban board (by status) + sortable data table
- **Project stats bar** — Total projects, active, completed, total contracted value, total costs
- **Date range + executing company filters**
- **Full project detail** — Status history timeline, cost logs, activities, files
- **Status tracking** — Planning → Active → On Hold → Completed → Cancelled (each change recorded in ProjectStatusHistory)
- **Complete project dialog** — Captures end-of-project value and completion date
- **Cost logs** — Track expenses by date, category, description, and amount; auto-aggregates total cost on the project
- **Profitability view** — Contracted value vs. cumulative costs
- **Assignment** — Project manager, designer, and QS with role-based visibility
- **Client linkage** — Every project belongs to a client; auto-updates client project counts
- **Lead linkage** — Optional one-to-one link to the originating lead
- **Tasks** — Create and view tasks linked to the project
- **Custom fields** — Additional data fields configured per your business needs

### Quotes

A full quoting module (`/quotes`) covering the quote lifecycle from draft to PDF:

- **Quote list** — Filter by lead, client, or status (draft, sent, accepted, rejected)
- **Quote builder** — Line-item editor with products from the catalog or ad-hoc items; quantity, unit price, discount, tax
- **Quote settings** — Company details, logo URL, tax rates, payment terms, and default notes stored globally
- **Auto-numbering** — Sequential quote numbers with configurable prefix
- **Status lifecycle** — Draft → Sent → Accepted / Rejected
  - `send` — Marks quote as sent and records `sentAt`
  - `accept` — Marks as accepted and records `acceptedAt`
  - `reject` — Marks as rejected
- **PDF export** — Generate a formatted PDF of any quote, downloadable directly from the browser
- **Lead & client linkage** — Each quote can be linked to a lead and/or a client
- **Notifications** — Status changes trigger `QUOTE_STATUS` notifications to the quote owner

### Products & Services Catalog

A product/service catalog (`/admin` → Products) used when building quotes:

- **Product list** with filtering by active/inactive status
- **Create products** — Name, description, unit price, unit type (each, hour, day, etc.), tax rate, and SKU
- **Active/inactive toggle** — Deactivate products without deleting them; inactive products are hidden from the quote builder
- **Used in quotes** — Products populate the line-item picker in the quote builder with pre-filled price and tax

### Tasks

A cross-entity task management system (`/tasks`) for tracking follow-ups and work items:

- **Task list** — Filter by status (OPEN, IN_PROGRESS, DONE), priority (LOW, MEDIUM, HIGH, URGENT), entity type, entity, assignee, or due date range
- **My tasks summary** — Quick count of open, in-progress, overdue, and due-today tasks for the current user
- **Team summary** — Aggregate task counts across the team (for managers and admins)
- **Entity-linked tasks** — Tasks can be attached to a specific lead, client, or project and visible from those entity detail views
- **Assignment** — Each task has an assignee and a creator; non-managers see only their own tasks unless they hold `tasks:view_all`
- **Due dates** — Optional due date with overdue detection
- **Completion notes** — When marking a task DONE, a completion note is recorded
- **Workflow integration** — Workflows can automatically create tasks as an action
- **Notifications** — `TASK_ASSIGNED`, `TASK_DUE`, and `TASK_OVERDUE` notifications are sent automatically via the scheduler

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
- **Spam protection** — Submissions record the submitter's IP address for rate-limiting and review
- **Auto lead creation** — On submission, a new lead is created in the CRM with the form data mapped to lead fields
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

All reports support date range, period, and executing company filters. Reports are role-filtered consistently with entity-level access rules. Tabs are eagerly prefetched for fast tab switching.

### AI Integration

Relon integrates AI across the entire platform through a unified multi-provider abstraction:

| AI Capability        | Trigger                        | Output                                                           |
| -------------------- | ------------------------------ | ---------------------------------------------------------------- |
| Lead Risk Analysis   | Button on lead detail          | Risk level (Low/Medium/High), summary, recommendations           |
| Lead Summary         | Button on lead detail          | Insights and suggested next actions                              |
| Email Drafting       | Button on lead detail          | Context-aware follow-up email draft                              |
| Client Health Report | Button on client detail        | Health score (0-100), summary, recommendations                   |
| Upsell Strategy      | Button on client detail        | Opportunities with potential revenue values                      |
| Executive Summary    | Button on dashboard            | What changed, what's at risk, what needs attention, key insights |
| Pipeline Insights    | Button on dashboard            | Bottlenecks, win probability, urgent leads, recommendations      |
| AI Chat Assistant    | Floating widget (bottom-right) | Conversational CRM assistant with lead/client context            |

**Provider selection** — Each capability can use a different provider. Configured per-capability in the admin panel or globally via environment variable. All three providers implement the same `AIProvider` interface.

**Custom prompts** — Every AI capability's prompt is editable in the admin panel with template placeholders. Defaults are provided if none are set.

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

**Permission Matrix** (`/admin/permissions`):

- Visual grid of 56 permissions across 12 modules for each role
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
- Categories: urgency, activity type, meeting type, file category, cost category, client segment, individual type, project status, project risk status, executing company
- Reorder, activate/deactivate, protect system options

**Products** (`/admin/products`):

- Manage the product/service catalog used in the quote builder
- Create, update, activate/deactivate products

**Workflows** (`/admin/workflows`):

- Create and manage automation rules
- View execution history and test rules against entities

**Custom Fields** (`/admin/custom-fields`):

- Define custom fields per entity type (Lead, Client, Project)
- Manage field types, labels, required flags, and display order

**Lead Forms** (`/admin/forms`):

- Create and manage public lead capture forms
- View form analytics and submission counts

**AI Settings** (`/admin/ai-settings`):

- Select default AI provider and per-capability overrides
- Manage API keys (encrypted with AES-256-CBC, displayed masked)
- Validate API keys against provider APIs
- Edit custom prompts for each AI capability

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

Custom roles can be created via the admin panel with any combination of the 56 available permissions.

### Permission Modules (56 permissions)

| Module        | Actions                                              |
| ------------- | ---------------------------------------------------- |
| Leads         | view, create, edit, delete, analyze                  |
| Clients       | view, create, edit, delete, health, upsell, convert  |
| Projects      | view, create, edit, delete                           |
| Costs         | view, create, delete                                 |
| Quotes        | view, create, edit, delete                           |
| Tasks         | view, create, edit, delete, view_all                 |
| Workflows     | view, create, edit, delete                           |
| Teams         | view, create, edit, delete, manage_members           |
| Users         | view, create, edit, delete                           |
| Dashboard     | view                                                 |
| AI Settings   | view, edit                                           |
| Audit Logs    | view                                                 |
| Permissions   | view, edit                                           |
| Pipeline      | manage                                               |
| Reports       | view                                                 |
| Settings      | manage                                               |
| Notifications | view                                                 |

### How Permissions Work

1. **Global guards** — `JwtAuthGuard` + `PermissionsGuard` are registered as `APP_GUARD` in the root module, meaning every endpoint requires authentication and permission checks unless marked `@Public()`
2. **Decorator-based** — Controllers use `@Permissions('resource:action')` decorators. Multiple permissions use AND logic.
3. **In-memory cache** — Permission lookups use an in-memory `Map<string, Set<string>>` for performance, refreshed on update.
4. **CEO bypass** — CEO/SUPER_ADMIN always passes permission checks without lookup.
5. **Role-based data filtering** — Beyond permissions, services apply role-specific data filters (e.g., SALES only sees own leads, DESIGNER only sees assigned records).

---

## Database Schema

Prisma models powering the system:

| Model                    | Purpose                                          |
| ------------------------ | ------------------------------------------------ |
| `User`                   | System users with role, team, hierarchy          |
| `Lead`                   | Prospective projects in the sales pipeline       |
| `LeadRep`                | Contact representatives for a lead               |
| `Client`                 | Client portfolio with health/engagement          |
| `Contact`                | Structured contact book linked to clients/leads  |
| `Project`                | Active projects with cost tracking               |
| `CostLog`                | Individual cost entries per project              |
| `Quote`                  | Quote records with line items and lifecycle      |
| `QuoteItem`              | Line items on a quote (product or ad-hoc)        |
| `QuoteSettings`          | Global quote defaults (company info, tax, terms) |
| `Product`                | Product/service catalog for quoting              |
| `Task`                   | Tasks linked to any entity with status/priority  |
| `WorkflowRule`           | Automation rules (trigger → conditions → actions)|
| `WorkflowExecution`      | Execution history for workflow rules             |
| `ForecastTarget`         | Monthly revenue targets                          |
| `LeadForm`               | Public lead capture form definitions             |
| `FormSubmission`         | Submissions received via public forms            |
| `Notification`           | In-app notifications per user                    |
| `NotificationPreference` | Per-user notification type preferences           |
| `CustomFieldDefinition`  | Custom field schema per entity type              |
| `CustomFieldValue`       | Custom field values per entity instance          |
| `Activity`               | Polymorphic call/meeting log                     |
| `File`                   | Polymorphic file metadata (GCP storage)          |
| `StageHistory`           | Lead pipeline stage transitions                  |
| `ProjectStatusHistory`   | Project status change audit trail                |
| `ServiceType`            | Configurable service type catalog                |
| `PipelineStage`          | Customizable pipeline stages (lead + project)    |
| `DropdownOption`         | Dynamic dropdown configuration                   |
| `AISettings`             | AI provider config + encrypted keys + prompts    |
| `AuditLog`               | System action audit trail                        |
| `RolePermission`         | Role-permission mapping matrix                   |
| `Role`                   | Role definitions (built-in + custom)             |
| `Team`                   | Organizational team structure                    |

### Key Relationships

```
User ─┬── manages → User[] (manager/report hierarchy)
      ├── memberOf → Team
      ├── assigned → Lead[] (as sales rep, designer, or QS)
      ├── assigned → Client[] (as account manager)
      └── assigned → Project[] (as PM, designer, or QS)

Lead ─┬── belongsTo → Client? (existing client relationship)
      ├── convertsTo → Client? (on conversion)
      ├── convertsTo → Project? (one-to-one)
      ├── has → LeadRep[], Contact[], Activity[], File[], StageHistory[], Task[], Quote[]
      └── linkedTo → ServiceType?, PipelineStage

Client ─┬── has → Project[], Contact[], Activity[], File[], Task[], Quote[]
        ├── receivesFrom → Lead[] (converted leads)
        └── assignedTo → User? (account manager)

Project ─┬── belongsTo → Client
         ├── originatesFrom → Lead? (one-to-one)
         ├── has → CostLog[], Activity[], File[], ProjectStatusHistory[], Task[]
         └── assignedTo → User? (PM), User? (designer), User? (QS)

Quote ─┬── belongsTo → Lead? / Client?
       ├── has → QuoteItem[] (products or ad-hoc lines)
       └── createdBy → User

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
| POST   | `/clients/:id/health`             | `clients:health`  | AI health report                     |
| POST   | `/clients/:id/upsell`             | `clients:upsell`  | AI upsell strategy                   |
| POST   | `/clients/:id/health/auto-update` | `clients:health`  | Auto-calculate health status         |
| POST   | `/clients/:id/health/override`    | `clients:health`  | Manually override health status      |
| POST   | `/clients/convert-lead/:leadId`   | `clients:convert` | Convert won lead to client + project |

### Projects (`/api/projects`)

| Method | Endpoint                         | Permission        | Description                       |
| ------ | -------------------------------- | ----------------- | --------------------------------- |
| GET    | `/projects`                      | `projects:view`   | List all projects (role-filtered) |
| POST   | `/projects`                      | `projects:create` | Create project                    |
| GET    | `/projects/client/:clientId`     | `projects:view`   | Get projects for a client         |
| GET    | `/projects/:id`                  | `projects:view`   | Get project with full details     |
| PATCH  | `/projects/:id`                  | `projects:edit`   | Update project                    |
| DELETE | `/projects/:id`                  | `projects:delete` | Delete project                    |
| POST   | `/projects/convert-lead/:leadId` | `projects:create` | Convert lead to project           |
| GET    | `/projects/:id/costs`            | `costs:view`      | List cost logs                    |
| POST   | `/projects/:id/costs`            | `costs:create`    | Add cost log                      |
| DELETE | `/projects/:id/costs/:costId`    | `costs:delete`    | Delete cost log                   |

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

| Method | Endpoint              | Permission      | Description                               |
| ------ | --------------------- | --------------- | ----------------------------------------- |
| GET    | `/quotes`             | `quotes:view`   | List quotes (`?leadId=&clientId=&status=`)|
| GET    | `/quotes/settings`    | `quotes:view`   | Get global quote settings                 |
| PATCH  | `/quotes/settings`    | `quotes:edit`   | Update global quote settings              |
| GET    | `/quotes/:id`         | `quotes:view`   | Get quote with line items                 |
| GET    | `/quotes/:id/pdf`     | `quotes:view`   | Download quote as PDF                     |
| POST   | `/quotes`             | `quotes:create` | Create quote                              |
| PATCH  | `/quotes/:id`         | `quotes:edit`   | Update quote                              |
| DELETE | `/quotes/:id`         | `quotes:delete` | Delete quote                              |
| POST   | `/quotes/:id/send`    | `quotes:edit`   | Mark quote as sent                        |
| POST   | `/quotes/:id/accept`  | `quotes:edit`   | Mark quote as accepted                    |
| POST   | `/quotes/:id/reject`  | `quotes:edit`   | Mark quote as rejected                    |

### Products (`/api/products`)

| Method | Endpoint        | Permission        | Description                             |
| ------ | --------------- | ----------------- | --------------------------------------- |
| GET    | `/products`     | `quotes:view`     | List products (`?includeInactive=true`) |
| GET    | `/products/:id` | `quotes:view`     | Get a product                           |
| POST   | `/products`     | `settings:manage` | Create product                          |
| PATCH  | `/products/:id` | `settings:manage` | Update product                          |
| DELETE | `/products/:id` | `settings:manage` | Delete product                          |

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

| Method | Endpoint                       | Permission       | Description                                     |
| ------ | ------------------------------ | ---------------- | ----------------------------------------------- |
| GET    | `/dashboard/metrics`           | `dashboard:view` | Full metrics (`?period=`, `?executingCompany=`) |
| GET    | `/dashboard/executive-summary` | `dashboard:view` | AI executive summary (`?provider=`)             |
| GET    | `/dashboard/revenue-breakdown` | `dashboard:view` | Revenue by client/project                       |
| GET    | `/dashboard/project-analytics` | `dashboard:view` | Projects by status + at-risk                    |
| GET    | `/dashboard/revenue-trend`     | `dashboard:view` | Monthly revenue (12 months)                     |
| GET    | `/dashboard/lead-volume-trend` | `dashboard:view` | Weekly lead volume (12 weeks)                   |
| GET    | `/dashboard/pipeline-insights` | `dashboard:view` | Pipeline breakdown + stale leads                |

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

| Provider         | Model                        | Best For                             | API Key                                                 |
| ---------------- | ---------------------------- | ------------------------------------ | ------------------------------------------------------- |
| Anthropic Claude | `claude-sonnet-4-5-20250929` | Complex reasoning, detailed analysis | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI GPT       | `gpt-4o`                     | Structured JSON responses            | [platform.openai.com](https://platform.openai.com/)     |
| Google Gemini    | `gemini-3-flash-preview`     | Fast responses, cost efficiency      | [ai.google.dev](https://ai.google.dev/)                 |

### Configuration Methods

**Environment variable** — Set `AI_DEFAULT_PROVIDER` in `backend/.env`:

```env
AI_DEFAULT_PROVIDER=anthropic  # or 'openai' or 'gemini'
```

**Admin panel** — Navigate to Admin → AI Settings:

- Select default provider
- Set per-capability overrides (lead risk, client health, executive summary, chat)
- Manage API keys (stored encrypted with AES-256-CBC)
- Edit custom prompts with template placeholders

**Per-request** — API endpoints accept an optional `provider` query parameter to override at call time.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable             | Required | Description                             |
| -------------------- | -------- | --------------------------------------- |
| `DATABASE_URL`       | Yes      | MySQL connection string                 |
| `JWT_SECRET`         | Yes      | Secret key for JWT signing              |
| `JWT_EXPIRES_IN`     | No       | Token expiry (default: `7d`)            |
| `PORT`               | No       | Server port (default: `4000`)           |
| `CORS_ORIGIN`        | No       | Allowed CORS origins                    |
| `FRONTEND_URL`       | No       | Frontend URL for email links            |
| `ANTHROPIC_API_KEY`  | No\*     | Anthropic API key                       |
| `OPENAI_API_KEY`     | No\*     | OpenAI API key                          |
| `GEMINI_API_KEY`     | No\*     | Google Gemini API key                   |
| `RESEND_API_KEY`     | No       | Resend email API key (console fallback) |
| `GCP_PROJECT_ID`     | No       | Google Cloud project ID                 |
| `GCP_STORAGE_BUCKET` | No       | GCP Storage bucket name                 |
| `ENCRYPTION_KEY`     | No       | 32-char key for AI key encryption       |

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
npx prisma db seed         # Seed sample data
npx prisma studio          # DB GUI at localhost:5555

# Docker (MySQL)
docker-compose up -d       # Start MySQL container
docker-compose down        # Stop MySQL container
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
- Ensure MySQL is running (`docker-compose up -d` if using Docker)
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

---

## Tech Stack

| Category    | Technology                                                   |
| ----------- | ------------------------------------------------------------ |
| Frontend    | Next.js 16, React 19, TypeScript, Tailwind CSS, Shadcn/Radix |
| State       | React Query (TanStack), React Hook Form + Zod                |
| Charts      | Recharts                                                     |
| Drag & Drop | dnd-kit                                                      |
| Backend     | NestJS, TypeScript, Passport.js (JWT), @nestjs/schedule      |
| Database    | MySQL, Prisma ORM                                            |
| Storage     | Google Cloud Storage                                         |
| Email       | Resend                                                       |
| AI          | Anthropic SDK, OpenAI SDK, Google Generative AI SDK          |
| Real-time   | Server-Sent Events (SSE)                                     |
| PDF         | PDF generation service (quotes)                              |

---

Built with [Next.js](https://nextjs.org/) · [NestJS](https://nestjs.com/) · [Prisma](https://www.prisma.io/) · [Anthropic](https://www.anthropic.com/) · [OpenAI](https://openai.com/) · [Google AI](https://ai.google/)
