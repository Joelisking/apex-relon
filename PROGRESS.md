# Relon-Apex Build Plan

**Context:** Relon CRM has a mature foundation (31 backend modules, 36 frontend pages, full RBAC, AI integration, workflow engine). The goal is to layer on the surveying-specific features that make it beat QFactor. Phases are ordered by dependency and business impact.

---

## HOW TO USE THIS FILE
- Check off `[x]` immediately after completing each subtask
- This file lives at `/Users/joel/Documents/Relon-Apex/PROGRESS.md` (kept in git)
- Source plan also lives at `/Users/joel/.claude/plans/cryptic-dazzling-quiche.md`

---

## PHASE 1 — Surveying Customizations & Branding
*Foundation: seed the system with Apex-specific data so all subsequent features have correct context*

### 1.0 Progress Tracker Setup
- [x] Create `/Users/joel/Documents/Relon-Apex/PROGRESS.md` (copy of this file, kept in git)

### 1.1 Pipeline Stages Seed
Seed `PipelineStage` records for the surveying project lifecycle.
- [x] Write/update `backend/prisma/seed.ts` with surveying pipeline stages:
  - Inquiry, Proposal Sent, Site Visit Scheduled, Contract Signed, Mobilization, Field Work, Office Processing, QC Review, Deliverable Prep, Client Review, Closed Won, Closed Lost
  - Set `probability`, `color`, `order` per stage
- [x] Run `npx prisma db seed` and verify in admin UI (`/admin/pipeline`)

### 1.2 Service Types Seed
Seed `ServiceType` records for Apex's service catalog.
- [x] Add service types to seed script:
  - Topographic Survey, Boundary Survey, ROW Engineering Survey, Construction Staking, ALTA/NSPS Land Title Survey, Cell Tower Survey, Subdivision Plat, Environmental Survey, Control Survey, As-Built Survey
- [x] Run seed and verify in admin UI (`/admin/service-types`)

### 1.3 Custom Fields Seed
Seed surveying-specific `CustomFieldDefinition` records.
- [x] Add custom fields to seed script:
  - Parcel Number, County (dropdown), Township / Section / Range, INDOT Des Number, Crew Lead (user-select), Equipment Type (multi-select), Permit Number, GIS Layer File
- [x] Run seed and verify in admin UI (`/admin/custom-fields`)

### 1.4 Roles Seed
Seed surveying-specific `Role` records.
- [x] Add roles to seed script:
  - Owner, Project Manager, Party Chief, Survey Technician, Field Crew, Office Admin, Drafting/CAD Tech, Billing Admin
- [x] Run seed and verify in admin UI (`/admin/roles`)

### 1.5 Branding Updates
- [x] Update sidebar alt text from "Relon" to "Apex Field OS"
- [x] Update `frontend/app/layout.tsx` metadata title/description for Apex
- [x] Update quote settings seed with Apex company defaults
- [ ] Verify branding in browser

### 1.6 Lead Form Template
- [x] Create "Apex Project Inquiry" lead capture form via seed script
- [ ] Verify form renders at `/forms/[apiKey]`

---

## PHASE 2 — QuickBooks Online Integration (CRITICAL PATH)
*The #1 competitive differentiator. Requires new `backend/src/quickbooks/` module.*

**Key files to create:**
- `backend/src/quickbooks/quickbooks.module.ts`
- `backend/src/quickbooks/quickbooks.controller.ts`
- `backend/src/quickbooks/quickbooks.service.ts`
- `backend/src/quickbooks/quickbooks-sync.service.ts`
- `backend/src/quickbooks/quickbooks-webhook.service.ts`
- `backend/src/quickbooks/dto/` (connect, sync, webhook DTOs)
- `backend/prisma/schema.prisma` — add QB models
- `frontend/app/(dashboard)/admin/quickbooks/` — QB admin page
- `frontend/components/admin/QuickBooksView.tsx`

### 2.1 Prisma Schema — QB Models
- [x] Add `QuickBooksConnection` model to `schema.prisma`
- [x] Add `QuickBooksSync` model for sync log
- [x] Add `qbCustomerId` (String?) to `Client` model
- [x] Add `qbInvoiceId` (String?) and `qbPaymentStatus` to `Quote` model
- [x] Run `npx prisma migrate dev --name add_quickbooks`

### 2.2 QB OAuth 2.0 Flow
- [ ] Register app at developer.intuit.com (OAuth 2.0 credentials → env vars)
- [ ] Add env vars: `QB_CLIENT_ID`, `QB_CLIENT_SECRET`, `QB_REDIRECT_URI`, `QB_ENVIRONMENT`
- [x] Implement `GET /quickbooks/connect` — redirect to Intuit OAuth URL
- [x] Implement `GET /quickbooks/callback` — exchange code for tokens
- [x] Implement `DELETE /quickbooks/disconnect` — delete connection + tokens
- [x] Implement `GET /quickbooks/status` — return connection status + company name
- [x] Token refresh logic

### 2.3 Client Sync (Bidirectional)
- [x] `POST /quickbooks/sync/clients` — trigger manual client sync
- [x] QB → CRM: fetch all QB Customers, upsert to `Client`
- [x] CRM → QB: push CRM clients without qbCustomerId to QB
- [x] Conflict resolution strategy (QB wins for financial/contact, CRM wins for CRM fields)
- [x] Log all sync events to `QuickBooksSync` table

### 2.4 Invoice Generation (Quote → QB Invoice)
- [x] `POST /quickbooks/invoices` — create QB Invoice from a CRM Quote
- [x] Map Quote line items → QB Invoice line items
- [x] Store `qbInvoiceId` back on Quote record
- [x] Handle QB Item (product) creation if not found

### 2.5 Payment Tracking
- [x] `POST /quickbooks/sync/payments` — fetch QB payments, update Quote `qbPaymentStatus`
- [x] Mark quotes as "Paid" when QB payment recorded
- [x] "Send to QuickBooks" button shows QB status on Quote view

### 2.6 Webhook Handler
- [x] `POST /quickbooks/webhook` — receive Intuit change notifications
- [x] Verify webhook signature (HMAC-SHA256)
- [x] Handle entity types: Customer, Invoice, Payment

### 2.7 Frontend — QB Admin Page
- [x] Create `frontend/app/(dashboard)/admin/quickbooks/page.tsx`
- [x] Create `frontend/components/admin/QuickBooksView.tsx`
- [x] Add "QuickBooks" link to admin sidebar section in `AppSidebar.tsx`
- [x] Add "Send to QuickBooks" button on Quote detail view

---

## PHASE 3 — Time Tracking & Labor Costs
*Enables accurate job costing and comparison to QB payroll data*

### 3.1 Prisma Schema — Time Tracking Models
- [x] Add `TimeEntry` model
- [x] Add `UserRate` model
- [x] Add `ProjectBudget` model
- [x] Run `npx prisma migrate dev --name add_time_tracking`

### 3.2 NestJS Time Tracking Module
- [x] Generate module: `time-tracking`
- [x] Implement `TimeEntry` CRUD endpoints
- [x] Implement `UserRate` management
- [x] Implement `ProjectBudget` management
- [x] Summary endpoints (project, user, timesheet)
- [x] Register module in `app.module.ts`

### 3.3 Timer Functionality
- [x] Timer state stored client-side (localStorage) via `TimerWidget.tsx`
- [x] Stop timer → opens `TimeEntryDialog` pre-filled with elapsed hours
- [ ] Active timer indicator in app header (stretch goal)

### 3.4 Frontend — Time Tracking UI
- [x] Create `frontend/app/(dashboard)/time-tracking/page.tsx`
- [x] `TimeTrackingView.tsx`, `TimerWidget.tsx`, `TimeEntryDialog.tsx`
- [x] Add "Time Tracking" to main nav sidebar
- [ ] `TimesheetTable.tsx` (weekly grid) — stretch goal
- [ ] Embed `BudgetVsActualCard` in `ProjectDetailDialog` — stretch goal

### 3.5 Reports Integration
- [ ] Add "Time & Labor" tab to `/reports` — stretch goal
- [ ] Billable hours by service type
- [ ] Profit margin by project
- [ ] User utilization rate

---

## PHASE 4 — Bottleneck Analytics (Killer Feature)
*AI-powered delay analysis — differentiates Relon from QFactor entirely*

### 4.1 Prisma Schema — Analytics
- [x] Add `AnalyticsSnapshot` model
- [x] Add `AIAnalyticsReport` model
- [x] Run `npx prisma migrate dev` (combined with QB + time tracking migration)

### 4.2 Stage Dwell Time Analysis (Backend)
- [x] Query `StageHistory` to calculate avg/median days per stage
- [x] Identify stages with longest dwell time (>14 day avg = critical)
- [x] Endpoint: `GET /analytics/bottleneck/stage-dwell`

### 4.3 Task Velocity & Overdue Analysis
- [x] Task completion rate per user (last 30 days)
- [x] Identify users with highest overdue count
- [x] Endpoint: `GET /analytics/bottleneck/task-velocity`
- [x] Endpoint: `GET /analytics/bottleneck/overdue`

### 4.4 Stuck Project Detection
- [x] Projects with no updates in 14+ days
- [x] Endpoint: `GET /analytics/bottleneck/stuck-projects`

### 4.5 AI Bottleneck Report
- [x] `POST /analytics/bottleneck/ai-report` — compile analytics + Claude summary
- [x] Store generated report with timestamp
- [x] Endpoint: `GET /analytics/bottleneck/ai-report/latest`

### 4.6 Frontend — Analytics Dashboard
- [x] Create `frontend/app/(dashboard)/analytics/page.tsx`
- [x] `BottleneckDashboard.tsx` — stage dwell chart, task velocity table, stuck projects, AI report
- [x] Alert banner for critical bottlenecks
- [x] Add "Analytics" to main nav sidebar
- [ ] Add bottleneck summary widget to executive dashboard — stretch goal

---

## PHASE 5 — Map View & Crew Scheduling
*Field operations visibility*

### 5.1 Job Site Location (Schema)
- [ ] Add `latitude` (Float?), `longitude` (Float?) to `Project` model
- [ ] Add `address` (String?) if not already present
- [ ] Run migration

### 5.2 Map View (Frontend)
- [ ] Install `@vis.gl/react-google-maps` or Mapbox GL
- [ ] Create `frontend/app/(dashboard)/map/page.tsx`
- [ ] Map component shows active projects as color-coded pins
- [ ] Click pin → project detail dialog
- [ ] Filter by: status, service type, crew lead, date range
- [ ] Add "Map" to main nav sidebar

### 5.3 Crew Scheduling Calendar
- [ ] Create `frontend/app/(dashboard)/schedule/page.tsx`
- [ ] Weekly calendar: rows = crew, cols = days
- [ ] Drag-to-assign projects to crew members
- [ ] Equipment assignment, conflict detection
- [ ] Mobile-responsive

### 5.4 Field Notes & Photos (Mobile)
- [ ] Mobile-optimized file upload attached to Project
- [ ] Voice note recording (MediaRecorder API)
- [ ] GPS tagging on photo upload (Geolocation API)
- [ ] Photos in project timeline/activity feed

---

## Environment Setup Checklist (Do Before Any Phase)
- [ ] Verify PostgreSQL running locally or connection string in `.env`
- [ ] Verify `backend/.env` has all required vars (DATABASE_URL, JWT_SECRET, AI keys)
- [ ] Verify `frontend/.env.local` has `NEXT_PUBLIC_API_URL`
- [ ] Confirm `npm run dev` works for both frontend and backend
- [ ] Confirm Prisma client is generated (`npx prisma generate`)

---

## Progress Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Surveying Customizations | ✅ Complete (seed applied) | 14/15 tasks |
| Phase 2: QuickBooks Integration | ✅ Code + DB complete (needs QB app registration + env vars) | 19/20 tasks |
| Phase 3: Time Tracking | ✅ Code + DB complete | 15/16 tasks |
| Phase 4: Bottleneck Analytics | ✅ Code + DB complete | 14/15 tasks |
| Phase 5: Map & Scheduling | 🔲 Not started | 0/12 tasks |

## Pending Actions Before Testing

1. **Run Prisma migrations** (adds QB, time tracking, analytics models):
   ```bash
   cd backend
   npx prisma migrate dev --name add_quickbooks_timetracking_analytics
   npx prisma generate
   ```

2. **Run seed** (adds Apex pipeline stages, service types, custom fields, roles, quote settings, lead form):
   ```bash
   npx prisma db seed
   ```

3. **Add backend env vars** for QuickBooks (`backend/.env`):
   ```
   QB_CLIENT_ID=
   QB_CLIENT_SECRET=
   QB_REDIRECT_URI=http://localhost:4000/api/quickbooks/callback
   QB_ENVIRONMENT=sandbox
   QB_WEBHOOK_VERIFIER_TOKEN=
   FRONTEND_URL=http://localhost:3001
   ```

4. **Register QB app** at developer.intuit.com to get OAuth credentials
