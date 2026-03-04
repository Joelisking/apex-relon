# Relon CRM

A single-tenant, AI-enhanced CRM & Business Performance Dashboard for managing leads, clients, projects, and sales pipelines. Built with **Next.js 16** (App Router) and a **NestJS** backend, with multi-provider AI support (Anthropic Claude, OpenAI GPT-4o, Google Gemini).

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
  - [Project Management](#project-management)
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
│                                │  REST (fetch)                  │
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
│  │ Dashboard │  │ Reports  │  │ AI Svc   │  │ Admin         │  │
│  │ (Metrics) │  │ (4 cats) │  │ (3 provs)│  │ (Users/Roles) │  │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├───────────────┤  │
│  │ Pipeline  │  │ Teams    │  │ Files    │  │ Activities    │  │
│  │ (Stages)  │  │ (Org)    │  │ (GCP)   │  │ (Polymorphic) │  │
│  └─────┬─────┘  └──────────┘  └──────────┘  └───────────────┘  │
│        │                                                        │
│        ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Prisma ORM  →  PostgreSQL (Neon)  │  GCP Cloud Storage  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

| Layer    | Technology                                                                                    |
| -------- | --------------------------------------------------------------------------------------------- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS, Shadcn/Radix, React Query, Recharts, dnd-kit |
| Backend  | NestJS, Passport.js (JWT), Prisma ORM, Resend (email)                                         |
| Database | PostgreSQL (Neon — pooled + direct URLs)                                                      |
| Storage  | Google Cloud Storage (private buckets, signed-URL streaming)                                  |
| AI       | Anthropic Claude, OpenAI GPT-4o, Google Gemini (runtime switch)                               |

---

## Project Structure

```
Relon/
├── README.md
├── CLAUDE.md                    # AI assistant instructions
├── backend/                     # NestJS API server
│   ├── prisma/
│   │   ├── schema.prisma        # 18 models — full data schema
│   │   ├── seed.ts              # Sample data seeder
│   │   └── migrations/          # PostgreSQL migrations
│   ├── src/
│   │   ├── main.ts              # Entry: port 4000, /api prefix, CORS, validation
│   │   ├── app.module.ts        # Root module — global guards (JWT + Permissions)
│   │   ├── auth/                # Login, register, password reset, JWT strategy
│   │   ├── leads/               # Prospective projects pipeline + AI risk analysis
│   │   ├── clients/             # Client portfolio + AI health + upsell
│   │   ├── projects/            # Active projects + cost tracking + status history
│   │   ├── dashboard/           # Executive metrics + AI summary
│   │   ├── reports/             # 4 report categories (leads, projects, clients, reps)
│   │   ├── ai/                  # Multi-provider AI abstraction layer
│   │   │   ├── providers/       # Anthropic, OpenAI, Gemini implementations
│   │   │   ├── prompts/         # Template prompts for each AI capability
│   │   │   └── interfaces/      # AIProvider interface contract
│   │   ├── admin/               # User CRUD, AI settings, audit logs
│   │   ├── permissions/         # RBAC permission matrix (56 permissions)
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
│   │   └── (dashboard)/         # All protected routes
│   │       ├── dashboard/       # Executive dashboard + AI summary
│   │       ├── leads/           # Pipeline (Kanban + table)
│   │       ├── clients/         # Client portfolio
│   │       ├── projects/        # Project management (Kanban + table)
│   │       ├── reports/         # Tabbed analytics (4 categories)
│   │       ├── admin/           # 10 admin sub-pages
│   │       └── settings/        # User profile + password
│   ├── components/
│   │   ├── layout/              # AppSidebar (collapsible, permission-filtered)
│   │   ├── dashboard/           # EnhancedDashboard, MetricsCards, charts
│   │   ├── leads/               # 17 components (Kanban, dialogs, AI panel)
│   │   ├── clients/             # 14 components (detail, health, metrics)
│   │   ├── projects/            # 13 components (Kanban, costs, stage timeline)
│   │   ├── reports/             # 7 components (4 tab views + filters)
│   │   ├── admin/               # 16 components (users, teams, permissions, roles)
│   │   ├── providers/           # QueryProvider, CurrencyProvider
│   │   ├── AIAssistant.tsx      # Floating AI chat widget
│   │   └── ui/                  # 34 Shadcn/Radix primitives
│   ├── lib/
│   │   ├── api/                 # 15 API client files (domain-split)
│   │   ├── types.ts             # All TypeScript domain types (~500 lines)
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
- PostgreSQL database (or [Neon](https://neon.tech) for hosted)
- At least one AI API key (Anthropic, OpenAI, or Google)

### 1. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment

**Backend** (`backend/.env`):

```env
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
DIRECT_URL="postgresql://user:pass@host/db?sslmode=require"
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

### 3. Setup Database

```bash
cd backend
npx prisma generate
npx prisma migrate dev
npx prisma db seed            # Seeds roles, pipeline stages, dropdown options, sample users
```

### 4. Start Development Servers

```bash
# Terminal 1 — Backend
cd backend && npm run start:dev     # http://localhost:4000

# Terminal 2 — Frontend
cd frontend && npm run dev          # http://localhost:3000
```

### 5. Access the Application

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
   │ Ongoing Mgmt    │  Activities, Files,
   │ AI Health Score │  Cost Tracking,
   │ Upsell Strategy │  Status History
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
4. **Stage progression** → Drag lead through pipeline stages (each transition recorded in StageHistory)
5. **AI risk analysis** → System analyzes the lead and flags risks (no contact, stale pipeline, high value)
6. **Quote sent** → Lead moves to "Quoted", `quoteSentAt` timestamp captured
7. **Deal won** → Lead moves to "Won", `dealClosedAt` + `contractedValue` captured via CloseWonDialog
8. **Convert to Client + Project** → ConvertLeadDialog creates/links a Client record and creates a Project with PM/designer/QS carry-over from the lead
9. **Project tracked** → Cost logs, status changes, activities, and files managed under the project
10. **Client relationship** → Health score calculated, AI generates upsell strategies, activity engagement tracked

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
- **Assignment** — Sales rep, designer, and QS assignments with role-based visibility
- **Lead metrics** — Days in pipeline, days since last contact, activity count, file count, days to quotation
- **Risk flags** — Automated detection: NO_CONTACT, LONG_PIPELINE, HIGH_VALUE_STALE, STALLED, NO_ACTIVITY
- **AI risk analysis** — Per-lead AI-generated risk level, summary, and recommendations
- **AI email drafting** — AI drafts follow-up emails based on lead context
- **Stage history** — Full audit trail of all stage transitions with who/when
- **Year filtering** — Filter leads by creation year

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

| Module      | Actions                                             |
| ----------- | --------------------------------------------------- |
| Leads       | view, create, edit, delete, analyze                 |
| Clients     | view, create, edit, delete, health, upsell, convert |
| Projects    | view, create, edit, delete                          |
| Costs       | view, create, delete                                |
| Teams       | view, create, edit, delete, manage_members          |
| Users       | view, create, edit, delete                          |
| Dashboard   | view                                                |
| AI Settings | view, edit                                          |
| Audit Logs  | view                                                |
| Permissions | view, edit                                          |
| Pipeline    | manage                                              |
| Reports     | view                                                |
| Settings    | manage                                              |

### How Permissions Work

1. **Global guards** — `JwtAuthGuard` + `PermissionsGuard` are registered as `APP_GUARD` in the root module, meaning every endpoint requires authentication and permission checks unless marked `@Public()`
2. **Decorator-based** — Controllers use `@Permissions('resource:action')` decorators. Multiple permissions use AND logic.
3. **In-memory cache** — Permission lookups use an in-memory `Map<string, Set<string>>` for performance, refreshed on update.
4. **CEO bypass** — CEO/SUPER_ADMIN always passes permission checks without lookup.
5. **Role-based data filtering** — Beyond permissions, services apply role-specific data filters (e.g., SALES only sees own leads, DESIGNER only sees assigned records).

---

## Database Schema

18 Prisma models powering the system:

| Model                  | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `User`                 | System users with role, team, hierarchy       |
| `Lead`                 | Prospective projects in the sales pipeline    |
| `LeadRep`              | Contact representatives for a lead            |
| `Client`               | Client portfolio with health/engagement       |
| `Project`              | Active projects with cost tracking            |
| `CostLog`              | Individual cost entries per project           |
| `Activity`             | Polymorphic call/meeting log                  |
| `File`                 | Polymorphic file metadata (GCP storage)       |
| `StageHistory`         | Lead pipeline stage transitions               |
| `ProjectStatusHistory` | Project status change audit trail             |
| `ServiceType`          | Configurable service type catalog             |
| `PipelineStage`        | Customizable pipeline stages (lead + project) |
| `DropdownOption`       | Dynamic dropdown configuration                |
| `AISettings`           | AI provider config + encrypted keys + prompts |
| `AuditLog`             | System action audit trail                     |
| `RolePermission`       | Role-permission mapping matrix                |
| `Role`                 | Role definitions (built-in + custom)          |
| `Team`                 | Organizational team structure                 |

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
      ├── has → LeadRep[], Activity[], File[], StageHistory[]
      └── linkedTo → ServiceType?, PipelineStage

Client ─┬── has → Project[], Activity[], File[]
        ├── receivesFrom → Lead[] (converted leads)
        └── assignedTo → User? (account manager)

Project ─┬── belongsTo → Client
         ├── originatesFrom → Lead? (one-to-one)
         ├── has → CostLog[], Activity[], File[], ProjectStatusHistory[]
         └── assignedTo → User? (PM), User? (designer), User? (QS)
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
| `DATABASE_URL`       | Yes      | PostgreSQL connection string (pooled)   |
| `DIRECT_URL`         | Yes      | PostgreSQL direct connection string     |
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

- Verify `DATABASE_URL` and `DIRECT_URL` are correct in `backend/.env`
- Ensure PostgreSQL is reachable
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
| Backend     | NestJS, TypeScript, Passport.js (JWT)                        |
| Database    | PostgreSQL, Prisma ORM                                       |
| Storage     | Google Cloud Storage                                         |
| Email       | Resend                                                       |
| AI          | Anthropic SDK, OpenAI SDK, Google Generative AI SDK          |

---

Built with [Next.js](https://nextjs.org/) · [NestJS](https://nestjs.com/) · [Prisma](https://www.prisma.io/) · [Anthropic](https://www.anthropic.com/) · [OpenAI](https://openai.com/) · [Google AI](https://ai.google/)
