# Relon → Apex Consulting & Surveying: Customization Strategy

## The Opportunity

Apex Consulting & Surveying, Inc. is a DBE/MBE/EBE certified land surveying and engineering firm in Fort Wayne, IN. They've been in business 20+ years, work with INDOT, local public agencies, and A/E consulting firms, and deliver services like topographic surveys, right-of-way engineering, construction staking, boundary surveys, and site development. They currently lack a unified system for project management, time tracking, revenue tracking, and invoicing — and they're aware of QFactor (bizwatt.com), a competitor built specifically for land surveyors.

This document lays out how to transform Relon CRM into a purpose-built project management and financial operations platform for Apex that not only matches QFactor's capabilities but leapfrogs them with AI-powered insights and deeper QuickBooks integration.

---

## Competitive Analysis: QFactor (bizwatt.com)

### What QFactor Does Well
- **Built for surveyors** — language, workflow, and features designed for survey companies
- **QuickBooks Online sync** — clients and financial entries flow both ways
- **QuickBooks Time integration** — employee hours auto-populate from TSheets/QB Time
- **Google Maps / Google Earth** — map view showing project locations, lat/long, lot & tract numbers
- **Proposal builder** — create proposals from templates, send, and track status
- **Tasklist templates** — standardized checklists per service type (e.g., "Boundary Survey Checklist") with auto-notifications when tasks complete, automatic status advancement
- **Profitability tracking** — real-time budget vs. actual per project
- **Project calendar** — milestone-based calendar with task due dates
- **Document & photo management** — virtual project binder per project

### Where QFactor Falls Short (Your Advantages)
- **No AI** — zero AI capabilities (no risk analysis, no automated insights, no smart recommendations)
- **No lead pipeline** — QFactor starts at the proposal stage; no CRM or lead tracking
- **No bottleneck identification** — can see task completion but no analytics on WHO is causing delays
- **No workflow automation** — task advancement is manual or basic; no conditional rule engine
- **No executive dashboard** — no aggregated business intelligence view
- **No custom reporting** — limited to basic profitability reports
- **No role-based permissions** — simplistic team member vs. admin access
- **No client relationship management** — contacts exist but no health scoring, engagement tracking, or upsell intelligence

---

## What the Boss Needs (Mapped to Features)

| Boss's Need | What It Really Means | Relon Feature (Existing or New) |
|---|---|---|
| **Project management** | Track survey projects from proposal through field work to delivery | Projects module (customize statuses for surveying lifecycle) |
| **Tracking revenue** | Know revenue per project, per client, per service type, per time period | Dashboard metrics + Reports + QuickBooks revenue sync |
| **Time cost tracking** | Log hours per crew member per project, calculate labor cost against budget | **NEW: Time tracking module + QuickBooks Time integration** |
| **Identify who is delaying projects** | See which team member has overdue tasks, is bottlenecking workflows | **NEW: Bottleneck analytics + team delay reports** |
| **QuickBooks integration** | Sync clients, push invoices, pull payments, reconcile | **NEW: QuickBooks Online integration module** |

---

## Architecture: New Modules to Build

### Module 1: QuickBooks Online Integration (CRITICAL PATH)

This is the #1 dealmaker. The integration should be bidirectional and cover invoicing, clients, and payments.

**Backend: `backend/src/quickbooks/`**

```
quickbooks/
├── quickbooks.module.ts
├── quickbooks.controller.ts
├── quickbooks.service.ts
├── quickbooks-auth.service.ts      # OAuth 2.0 flow (Intuit)
├── quickbooks-sync.service.ts      # Bidirectional sync engine
├── quickbooks-invoice.service.ts   # Invoice creation & status tracking
├── quickbooks-webhook.service.ts   # Receive QB webhook notifications
├── dto/
│   ├── qb-connect.dto.ts
│   ├── qb-invoice-create.dto.ts
│   └── qb-sync-config.dto.ts
└── interfaces/
    └── qb-types.ts
```

**Key Capabilities:**

1. **OAuth 2.0 Connection** — Admin connects QuickBooks account via OAuth flow. Store encrypted tokens (refresh + access) in DB. Auto-refresh before expiry.

2. **Client Sync (Bidirectional)**
   - When a client is created in Relon → auto-create Customer in QuickBooks
   - Pull existing QuickBooks customers on initial connection
   - Map Relon `client.id` ↔ QB `Customer.Id` in a `QuickBooksMapping` table

3. **Invoice Generation (Relon → QB)**
   - From a completed project or accepted quote, generate a QuickBooks invoice with one click
   - Map Relon quote line items → QB Invoice line items
   - Relon products/services catalog syncs to QB Items
   - Track invoice status: Draft → Sent → Partially Paid → Paid
   - Pull payment status back from QB via webhooks or polling

4. **Payment Tracking (QB → Relon)**
   - When a payment is recorded in QB, webhook fires and updates Relon project financials
   - Dashboard shows outstanding invoices, overdue payments, DSO (days sales outstanding)

5. **Expense Sync (Optional Phase 2)**
   - Pull QB bills/expenses tagged to projects back into Relon cost logs

**Database Additions (Prisma):**

```prisma
model QuickBooksConnection {
  id              String   @id @default(uuid())
  realmId         String   @unique          // QB company ID
  accessToken     String   @db.Text         // encrypted
  refreshToken    String   @db.Text         // encrypted
  tokenExpiresAt  DateTime
  companyName     String
  isActive        Boolean  @default(true)
  connectedAt     DateTime @default(now())
  connectedBy     String                    // userId
  tenantId        String
}

model QuickBooksMapping {
  id            String   @id @default(uuid())
  entityType    String                      // CLIENT, PRODUCT, INVOICE
  relonId       String                      // Relon entity ID
  qbId          String                      // QuickBooks entity ID
  qbType        String                      // Customer, Item, Invoice
  lastSyncedAt  DateTime
  syncStatus    String   @default("SYNCED") // SYNCED, PENDING, ERROR
  tenantId      String

  @@unique([entityType, relonId, tenantId])
  @@unique([entityType, qbId, tenantId])
}

model Invoice {
  id              String    @id @default(uuid())
  invoiceNumber   String
  projectId       String?
  quoteId         String?
  clientId        String
  amount          Decimal
  taxAmount       Decimal   @default(0)
  totalAmount     Decimal
  status          String    @default("DRAFT") // DRAFT, SENT, PARTIAL, PAID, OVERDUE, VOID
  dueDate         DateTime
  sentAt          DateTime?
  paidAt          DateTime?
  paidAmount      Decimal   @default(0)
  qbInvoiceId     String?                     // QuickBooks Invoice ID
  qbSyncStatus    String?                     // SYNCED, PENDING, ERROR
  lineItems       Json                        // Stored as JSON array
  notes           String?   @db.Text
  createdById     String
  tenantId        String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

**npm Package:** Use `node-quickbooks` for the QB API client, or build a lightweight wrapper with `axios` using the QB REST API directly (more control, fewer dependencies).

---

### Module 2: Time Tracking & Labor Cost Engine

This is where you beat QFactor. They rely entirely on QuickBooks Time — you'll build native time tracking AND integrate with QB Time for firms that already use it.

**Backend: `backend/src/time-tracking/`**

```
time-tracking/
├── time-tracking.module.ts
├── time-tracking.controller.ts
├── time-tracking.service.ts
├── time-reports.service.ts         # Aggregation & analytics
├── qb-time-sync.service.ts         # QuickBooks Time integration (optional)
└── dto/
    ├── create-time-entry.dto.ts
    └── time-report-filter.dto.ts
```

**Key Capabilities:**

1. **Time Entries** — crew members log hours against a project + service type + task
   - Start/stop timer (real-time) or manual entry (date, hours, description)
   - Categorize by service type: Field Work, Office/CAD, Travel, Review, Admin
   - Tag with specific task (if applicable)
   - Optional: GPS location stamp when starting/stopping (for field crews)

2. **Labor Cost Calculation**
   - Each user has a configurable hourly cost rate (internal) and billing rate (external)
   - Cost = hours × cost rate → feeds project cost tracking
   - Billable amount = hours × billing rate → feeds invoicing
   - Support overtime rules (1.5x after 40 hrs/week)

3. **Budget vs. Actual**
   - Each project has a budgeted hours estimate (by service type)
   - Real-time burn rate: "You've used 75% of budgeted field hours with 40% of work complete"
   - AI alert when a project is trending over budget

4. **QuickBooks Time Sync (Optional)**
   - If Apex already uses QB Time / TSheets, pull entries via API
   - Map QB Time employees → Relon users
   - Map QB Time service items → Relon service types

**Database Additions:**

```prisma
model TimeEntry {
  id            String    @id @default(uuid())
  userId        String
  projectId     String
  taskId        String?
  serviceType   String                      // FIELD_WORK, OFFICE_CAD, TRAVEL, REVIEW, ADMIN
  date          DateTime
  hours         Decimal
  description   String?   @db.Text
  isBillable    Boolean   @default(true)
  costRate      Decimal                     // Snapshot at time of entry
  billingRate   Decimal                     // Snapshot at time of entry
  status        String    @default("PENDING") // PENDING, APPROVED, REJECTED
  approvedById  String?
  approvedAt    DateTime?
  tenantId      String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model UserRate {
  id          String   @id @default(uuid())
  userId      String
  costRate    Decimal                       // Internal cost per hour
  billingRate Decimal                       // Client billing rate per hour
  effectiveFrom DateTime
  tenantId    String
  createdAt   DateTime @default(now())

  @@unique([userId, effectiveFrom, tenantId])
}

model ProjectBudget {
  id            String   @id @default(uuid())
  projectId     String
  serviceType   String
  budgetedHours Decimal
  budgetedCost  Decimal
  tenantId      String

  @@unique([projectId, serviceType, tenantId])
}
```

---

### Module 3: Bottleneck & Delay Analytics (The Boss's Killer Feature)

This is what neither QFactor nor most project management tools do well. The boss specifically wants to know WHO is holding things up.

**Backend: `backend/src/bottleneck/`**

**Key Analytics to Surface:**

1. **Task Completion Velocity per User**
   - Average time to complete tasks (by type, by priority)
   - Compare each team member against team average
   - Trend over time (improving or degrading?)

2. **Overdue Task Heatmap**
   - Visual grid: Users × Projects → color-coded by overdue severity
   - "Sarah has 5 overdue tasks across 3 projects, averaging 4 days late"

3. **Project Stage Dwell Time**
   - How long does each project sit in each stage?
   - Which stage is the bottleneck? (e.g., "Review" stage averages 12 days vs. 3-day target)
   - Which user is the assignee when stages stall?

4. **Dependency Chain Analysis**
   - If Task B depends on Task A, and Task A is overdue → flag the owner of Task A as the blocker
   - Show cascading delay impact: "Task A is 3 days late, which delays Tasks B, C, D affecting 2 projects"

5. **AI Bottleneck Report** (New AI Capability)
   - Add a new AI prompt template: "Analyze current project delays and identify root causes"
   - Feed it: overdue tasks by user, stage dwell times, recent status changes, workload distribution
   - Output: "The primary bottleneck is in the CAD/drafting phase. User X has 8 pending tasks while User Y has 2. Recommend redistributing 3 tasks from X to Y. Projects P1 and P3 are at risk of missing client deadlines due to this imbalance."

**Frontend: New Report Tab + Dashboard Widget**

- **Bottleneck Report Tab** (add to `/reports`) — "Team Performance" tab showing:
  - Delay leaderboard (who has the most overdue items)
  - Stage bottleneck chart (avg dwell time per stage)
  - Workload distribution bar chart
  - AI-generated bottleneck summary

- **Dashboard Widget** — "At Risk" widget showing:
  - Top 3 delayed projects with blockers identified
  - Quick action: reassign, escalate, or nudge

---

## Surveying-Specific Customizations

These customizations make the system feel purpose-built for Apex rather than generic.

### 1. Project Types & Service Catalog (Preconfigured)

Seed the system with Apex's actual service types:

| Service Type | Typical Deliverable | Default Pipeline Stages |
|---|---|---|
| Topographic Survey | Topo map / CAD file | Proposal → Field Work → Processing → Review → Delivery |
| Boundary Survey | Survey plat / legal description | Proposal → Research → Field Work → Processing → Review → Recording → Delivery |
| Right-of-Way Engineering | ROW plans / legal descriptions | Proposal → Research → Design → Review → Submittal → Revisions → Final |
| Construction Staking | Staking report | Proposal → Scheduling → Field Work → Verification → Delivery |
| ALTA/NSPS Survey | ALTA survey plat | Proposal → Research → Field Work → Processing → Review → Certification → Delivery |
| Cell Tower Survey | Site survey report | Proposal → Field Work → Processing → Delivery |
| Subdivision Plat | Recorded plat | Proposal → Design → Review → Submittal → Recording |
| Environmental Survey | Environmental report | Proposal → Field Work → Analysis → Report → Delivery |

### 2. Custom Fields (Preconfigured for Surveying)

**Project-level custom fields:**
- Parcel Number(s) — text
- County — dropdown (Allen, DeKalb, Noble, Whitley, etc.)
- Township / Section / Range — text
- Client PO Number — text
- INDOT Des Number — text (for DOT projects)
- Crew Lead — user picker
- Field Date(s) Scheduled — date range
- Equipment Needed — multi-select (GPS, Total Station, Drone, Level)
- Plat Book / Page — text
- Recording Number — text (after recording)

**Client-level custom fields:**
- Client Type — dropdown: Government Agency, A/E Firm, Developer, Private Owner, Utility, Contractor
- Payment Terms — dropdown: Net 15, Net 30, Net 45, Net 60
- Tax Exempt — boolean
- Tax ID — text
- Prequalification Status — text

### 3. Pipeline Stages (Surveying Lifecycle)

Replace the generic sales pipeline with a surveying project lifecycle:

**Lead/Proposal Pipeline:**
1. Inquiry Received (0% win probability)
2. Site Assessed (10%)
3. Proposal Sent (25%)
4. Proposal Reviewed (50%)
5. Negotiation (65%)
6. Awarded (90%)
7. Won — converts to Project
8. Lost / No Bid

**Project Pipeline:**
1. Planning / Research
2. Scheduled
3. Field Work In Progress
4. Processing / CAD
5. Quality Review
6. Client Review
7. Revisions
8. Final Delivery
9. Invoiced
10. Completed / Closed

### 4. GIS Map View (Match QFactor's Killer Feature)

Add a map view to the projects page showing project locations. This is a feature QFactor customers specifically love.

**Implementation:**
- Add `latitude` and `longitude` fields to Project model
- Use Google Maps JavaScript API or Mapbox GL JS in a new `/projects/map` view
- Color-code pins by project status (green = on track, yellow = at risk, red = delayed)
- Click pin → project summary popup with quick actions
- Filter by: date range, status, client, crew lead, service type
- Cluster pins for areas with multiple projects
- Show "nearby projects" when viewing a single project (helps with crew scheduling)

### 5. Crew Scheduling View

Survey companies need to know where crews are and when. Add a calendar/schedule view:

- **Weekly calendar** — rows = crew members, columns = days, cells = project assignments
- **Drag to reassign** — move a crew member from one project day to another
- **Equipment scheduling** — track which equipment is allocated where
- **Conflict detection** — flag when a crew member or equipment is double-booked
- **Integration point** — time entries auto-populate from schedule

### 6. Field Notes & Photo Capture

For field crews on mobile, make it easy to attach notes and photos to projects:

- Use the existing file management system but add a "Field Notes" category
- Mobile-optimized photo upload with auto-GPS tagging
- Quick-add notes with voice-to-text (browser native)
- Photos attached to specific project tasks or survey points

---

## Revised Role Structure

Replace the generic CRM roles with surveying-specific roles:

| Role | Description | Key Permissions |
|---|---|---|
| **Owner** | Company owner (Nanna Poker) | Full access, financials, admin |
| **Project Manager** | Senior surveyor managing projects | All projects, assign crews, approve time, view costs |
| **Party Chief** | Leads field survey crews | Own projects, log time, upload field data, manage tasks |
| **Survey Technician** | CAD/office processing | Assigned projects only, processing tasks, time entry |
| **Field Crew** | Junior field surveyors | Log time, upload photos/notes, view assigned tasks |
| **Office Admin** | Administrative staff | Invoicing, client contacts, scheduling, QB sync |

---

## AI Enhancements (Specific to Apex)

### Existing AI Features → Surveying Context

| AI Feature | Generic CRM Use | Apex Surveying Use |
|---|---|---|
| Lead Risk Analysis | "Deal might stall" | "Proposal may lose — no follow-up in 14 days, client has 3 competing bids" |
| Client Health Report | "Client engagement score" | "INDOT contract renewal in 60 days, 2 active projects completing, recommend submitting for next bid cycle" |
| Executive Summary | "Pipeline overview" | "12 active survey projects, 3 in field this week, 2 overdue in CAD processing. Revenue this month: $45K of $60K target. Crew utilization at 78%." |
| Email Drafting | Generic follow-up | "Draft proposal follow-up for boundary survey at [Parcel], reference recent INDOT work in the area" |

### New AI Capabilities

1. **Crew Optimization** — "Given current workload and project locations, recommend optimal crew assignments for next week"
2. **Project Estimation** — "Based on 50 historical boundary surveys, estimate hours and cost for a 40-acre rural parcel in DeKalb County"
3. **Invoice Reminder AI** — "Draft a polite payment reminder for Invoice #1042, 15 days overdue, $8,500 balance, long-standing client"
4. **Bottleneck Analysis** — (described in Module 3 above)

---

## Implementation Phases

### Phase 1: Core Customization (Weeks 1–3)
- Configure surveying pipeline stages, service types, and custom fields
- Set up surveying-specific roles and permissions
- Customize dashboard metrics for surveying KPIs
- Seed products/services catalog with Apex's service offerings
- Configure dropdown options (counties, equipment, service categories)
- Rebrand UI with Apex colors/logo

### Phase 2: QuickBooks Integration (Weeks 3–6)
- Build OAuth 2.0 connection flow
- Implement client sync (bidirectional)
- Build invoice generation (Relon → QB)
- Implement payment status sync (QB → Relon)
- Add QB connection status to admin panel
- Build invoice management UI (list, create, view, track)

### Phase 3: Time Tracking (Weeks 5–8)
- Build time entry system (timer + manual)
- Implement user rate cards (cost rate + billing rate)
- Build project budget tracking (budgeted vs. actual hours)
- Add time approval workflow
- Build timesheet reports (by user, by project, by period)
- Optional: QuickBooks Time sync

### Phase 4: Bottleneck Analytics (Weeks 7–9)
- Build task velocity calculations
- Implement overdue heatmap
- Build stage dwell time analytics
- Add AI bottleneck report prompt
- Build dashboard "At Risk" widget
- Add "Team Performance" report tab

### Phase 5: Map & Scheduling (Weeks 9–12)
- Add lat/long to projects, integrate geocoding
- Build map view with status-colored pins
- Build crew scheduling calendar
- Add equipment tracking
- Mobile-optimize field notes and photo upload

### Phase 6: Polish & Deploy (Weeks 12–14)
- End-to-end testing with Apex team
- Data migration from current spreadsheets/systems
- User training sessions
- Go-live support

---

## Pricing Strategy

QFactor targets land survey companies and likely charges $100–300/month based on team size. Since Relon provides significantly more functionality (AI, full CRM, QuickBooks integration, bottleneck analytics, custom automation), you can position at a premium or match and win on value.

**Recommended approach for Apex:**
- **Single-tenant deployment** — dedicated instance (already your architecture)
- **Setup fee** — covers customization, data migration, training
- **Monthly SaaS fee** — recurring for hosting, support, updates, AI usage
- **QB integration** — included (this is the hook that makes them choose you over QFactor)

---

## Summary: Why This Beats QFactor

| Capability | QFactor | Relon for Apex |
|---|---|---|
| Project management | Yes (basic) | Yes (advanced with Kanban, automation, AI) |
| QuickBooks sync | Yes (clients + invoices) | Yes (clients + invoices + payments + expenses) |
| QuickBooks Time | Yes (pull hours) | Yes (native time tracking + optional QB Time sync) |
| Map view | Yes (Google Maps/Earth) | Yes (Google Maps with status pins + nearby projects) |
| Proposal builder | Yes | Yes (quote builder with PDF + email) |
| Task management | Yes (checklist templates) | Yes (full task system with dependencies + automation) |
| Profitability tracking | Yes (basic) | Yes (advanced: budget vs. actual, burn rate, AI alerts) |
| **Bottleneck identification** | **No** | **Yes (delay heatmap, AI analysis, stage dwell time)** |
| **AI insights** | **No** | **Yes (8+ AI capabilities, multi-provider)** |
| **Lead/CRM pipeline** | **No** | **Yes (full lead-to-project lifecycle)** |
| **Workflow automation** | **No** | **Yes (no-code rule engine with 9 triggers)** |
| **Role-based security** | **Basic** | **Yes (granular RBAC, 56 permissions)** |
| **Client health scoring** | **No** | **Yes (engagement score + AI health reports)** |
| **Crew scheduling** | **No** | **Yes (weekly calendar with drag-assign)** |
| **Custom fields** | **No** | **Yes (unlimited per entity)** |
| **Revenue forecasting** | **No** | **Yes (pipeline + targets + trend)** |

Relon for Apex isn't just a project management tool — it's the **operating system for their entire business**, from the first client inquiry to the final invoice payment and everything in between.
