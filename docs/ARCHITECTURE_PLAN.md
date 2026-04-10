# Relon-Apex Architecture Plan & Implementation Tracker

> **Last updated:** 2026-04-09
> **Sessions covered:** Architecture analysis (Session 1), Delta refinements (Session 2)
> **Status key:** ✅ Done · 🔄 In Progress · ⬜ Not Started · ❌ Blocked · 🔁 Deferred

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Findings](#2-current-architecture-findings)
3. [Source-of-Truth Design Decisions](#3-source-of-truth-design-decisions)
4. [Schema & Data Model Changes](#4-schema--data-model-changes)
5. [Naming Rename: Division / JobType](#5-naming-rename-division--jobtype)
6. [Phase-by-Phase Implementation Plan](#6-phase-by-phase-implementation-plan)
7. [Meeting Notes Cross-Reference](#7-meeting-notes-cross-reference)
8. [Export Bug Investigation](#8-export-bug-investigation)
9. [Cross-App Impact Matrix](#9-cross-app-impact-matrix)
10. [Risks & Open Questions](#10-risks--open-questions)

---

## 1. Executive Summary

Relon CRM for Apex Consulting & Surveying is a single-tenant NestJS + Next.js CRM. A two-session analysis (25+ change requests) identified five major architectural problems and a series of discrete improvements.

**Five root-cause issues (in priority order):**

| # | Issue | Impact |
|---|---|---|
| 1 | No single source of truth for project financials | Profitability reports are wrong; 5 overlapping cost systems |
| 2 | Cost breakdown disconnected from actual work | Service items, tasks, and hours are not linked to the CB estimate |
| 3 | ServiceCategory/ServiceType naming is confusing | Affects all service-related UI and admin pages |
| 4 | Pay rate system doesn't support INDOT pay grades | Can't correctly calculate labor cost for INDOT jobs |
| 5 | Admin navigation is unstructured; RBAC permissions are missing for role management | Admins can't find tools; role management not properly gated |

---

## 2. Current Architecture Findings

### 2.1 Financial Model (Inconsistent)

The codebase has **five overlapping cost systems** that produce inconsistent numbers:

| System | What it stores | Connected to reports? |
|---|---|---|
| `Project.contractedValue` | Manual entry on project creation | Yes (reports use this) |
| `Project.estimatedRevenue` | Often null; no population logic | No (fallback only in detail view) |
| `Project.endOfProjectValue` | Informally used as "final" revenue | No (only in detail view fallback) |
| `Project.totalCost` | Manual; never updated from time entries | Yes (profitability — wrong) |
| `CostLog` entries | Manual cost log rows | Indirectly (feeds totalCost) |
| `TimeEntry.totalCost` | Snapshot at entry; disconnected from project | No |
| `CostBreakdown.totalEstimatedCost` | Computed estimate from CB lines | No |
| `ProjectBudget` / `ProjectCostSegment` | Additional budget breakdowns | No |

**Revenue calculation inconsistency:**
- `ProjectDetailView.tsx` line 263: `project.estimatedRevenue ?? project.contractedValue` — falls back through three fields
- `projects-reporting.service.ts` line 130: only `project.contractedValue`
- These produce different values for the same project.

**Labor cost is entirely absent from profitability:**
- `getProfitabilityData()` uses `project.totalCost` which is manually entered and never reflects actual time entries.
- `TimeEntry` records carry `hours` and `hourlyRate` but the reports service never aggregates them.

### 2.2 Cost Breakdown / Proposal Flow

```
Lead → CostBreakdown (estimate) → Proposal (PDF/DOCX)
                                        ↓
                                 acceptProposal()
                                        ↓
                         updates status + acceptedAt ONLY
                         (BUG — contractedValue and invoicedValue never set)
```

- `acceptProposal()` (`proposal-templates.service.ts` line 224) sets `status` and `acceptedAt` but does **not** write `contractedValue` or `invoicedValue` on the project.
- `generateProposal()` leaves `crmFirstName`/`companyName` empty when called without `leadId` (the cost-breakdowns-page path), causing a blank proposal header.
- `ProposalEditor.tsx` has no `useEffect` to fetch breakdown from `prefilledBreakdownId` on mount — `selectedBreakdown` stays null if arriving from CB page.

### 2.3 Service Item Hierarchy

```
ServiceCategory (→ Division)
  └── ServiceType (→ JobType)
        └── ServiceItem
              └── ServiceItemSubtask
```

- `CostBreakdown` is linked to `ServiceType` (one per breakdown) and auto-populates lines from service items of that type on CREATE only — edit-mode "add line" shows all items unfiltered.
- `ProjectServiceItem` links a project to specific service items; used by `TimeEntryDialog` to restrict service item picker.
- Subtask selection in `TimeEntryDialog` is currently flat (service item first, then subtask dropdown) — needs grouping with subtasks listed under their parent service item as headers.

### 2.4 Permission System

- `permissions.constants.ts` has 56 permissions across 16 modules.
- Role management is gated only by `permissions:view` and `permissions:edit` — no dedicated `roles:*` permissions.
- `ADMIN_PANEL_PERMISSIONS` gates entire admin area and currently requires only `permissions:view`.
- `AppSidebar.tsx` Roles nav item uses `permission: 'permissions:view'` (should be `'roles:view'`).
- Same `permission: 'permissions:view'` guards both the Roles page and the Permissions matrix page — they should be independently gated.

### 2.5 Calendar

- `CalendarView.tsx` `handleEventClick()`: project events navigate directly to `/projects/:id` — no popover.
- `CalendarEvent` type does not carry `estimatedDueDate`.
- `projectToEvents()` in `calendarUtils.ts` needs to pass through `estimatedDueDate` in the event payload.

### 2.6 Admin Navigation

Current sidebar admin groups and their items:

```
People & Access:     Users, Teams, Roles, Permissions
Configuration:       Pipeline, Custom Fields, Form Options, Service Types [to rename],
                     Service Items, Task Types, Work Codes, Intake Forms
Settings:            General, Invoicing, AI
Integrations:        QuickBooks, Automation
System:              Audit Logs, System
```

Problems:
- **Proposal Templates** have no admin nav entry — buried inside the "Invoicing" settings page (`AdminQuoteSettingsView`). A user looking for templates will not find them without knowing to look inside invoicing.
- **Pay Rates** and **INDOT Pay Zones** (new) have no home.
- "Service Types" label needs to become "Job Types" after rename.
- Global search (command palette) almost certainly only indexes nav items and live data — admin settings pages are not searchable. Fix: add static admin route entries to the command palette data source from `adminNavGroups`.

### 2.7 Customer Model

- `Client.name` is NOT NULL in schema — requires migration to make nullable.
- `Client.individualName` and `Client.individualType` exist but no `clientType` discriminator exists to drive UI conditionals.
- UI always shows company-type fields (industry, company type, website) regardless of whether the customer is an individual.
- For `type: "individual"`: company type, industry, website should be hidden. Segment remains (individuals can be Government, Private, etc.).

### 2.8 Pay Rate Model (Current vs. Needed)

Current: `UserRate.type` is `"internal" | "billing"` — only two rate types per user per time period. No concept of INDOT tier.

`TimeEntry.hourlyRate` is a manual snapshot at entry time — not derived dynamically from a rate configuration. This means rate errors require editing individual time entries.

The INDOT pay rate lookup chain needed: `TimeEntry` created → project county → `IndotPayZone` → `PayGrade` → user's `UserRate` for that grade effective on entry date.

---

## 3. Source-of-Truth Design Decisions

These are the agreed canonical definitions for financial data going forward.

### 3.1 Revenue

```
Revenue = Project.contractedValue          (locked at proposal acceptance)
        + Σ(ProjectAddendum.total WHERE status IN ['APPROVED', 'INVOICED'])
```

- `contractedValue` is written by `acceptProposal()` at the moment of acceptance, set from the cost breakdown's `roundedFee` if present, else `totalEstimatedCost + direct expenses`.
- `invoicedValue` is also set at acceptance (via a confirmation modal) and can later be updated manually or synced from QB.
- **`estimatedRevenue` field — deprecated.** Migration: copy non-null values to `contractedValue`, then soft-deprecate (keep column, remove from all UI). Drop in a future migration after confirming all rows are migrated.
- **`endOfProjectValue` field — deprecated.** Replaced by the computed total above (base + addenda). Same soft-deprecation approach.

### 3.2 Labor Cost

```
LaborCost = Σ(TimeEntry.hours × UserRate.rate)
```

Where the `UserRate` is the record for that user with the correct `payGradeId`, with `effectiveDate` ≤ entry date (the most recent one that applies).

- For non-INDOT projects: use the user's `UserRate` linked to the `PayGrade` with `isDefault = true`.
- For INDOT projects: look up the project's county → find `IndotPayZone` for that county → get `payGradeId` → find that user's `UserRate` for that `payGradeId`.
- **`Project.totalCost` must be reactively updated** after every `TimeEntry` create/update/delete. `TimeTrackingService` must call `recalculateProjectCost(projectId)` after each write.
- `TimeEntry.hourlyRate` is stored as a snapshot at save time so historical costs don't change when a pay rate is updated later.

### 3.3 Direct Cost

```
DirectCost = Σ(CostLog.amount) for the project
```

`CostLog` remains the source for non-labor direct expenses (vendor invoices, travel, per diem).

### 3.4 Profitability Formula

```
profitability(project) = {
  revenue:        contractedValue + sum(addenda[APPROVED|INVOICED].total),
  laborCost:      sum(timeEntries.hours × effectiveUserRate),
  directCost:     sum(costLogs.amount),
  totalCost:      laborCost + directCost,
  grossProfit:    revenue - totalCost,
  margin:         grossProfit / revenue * 100,
  proposedHours:  sum(costBreakdownRoleEstimates.estimatedHours),
  actualHours:    sum(timeEntries.hours),
  hoursVariance:  actualHours - proposedHours
}
```

A shared `ProjectProfitabilityService.compute(projectId)` utility must be created and called from: `projects-reporting.service.ts`, `ProjectDetailView.tsx`, and `dashboard.service.ts`.

### 3.5 Allowed Tasks / Service Items on a Project

```
IF project has an active CostBreakdown (linked projectId, status != ARCHIVED):
    allowed service items = CostBreakdown.lines[].serviceItemId
ELSE:
    allowed service items = all active ServiceItems (filtered by INDOT flag if applicable)
```

`ProjectServiceItem` records should be auto-generated and kept in sync with CB lines when a breakdown is linked to a project (one-way sync: breakdown → project service items). Manual additions to `ProjectServiceItem` should be blocked if an active breakdown exists; addenda handle additional scope.

### 3.6 Expected Hours Per Task/Subtask

```
expectedHours(serviceItemId, subtaskId, role) =
    CostBreakdownRoleEstimate.estimatedHours
    WHERE lineId = CostBreakdownLine(costBreakdownId = project.costBreakdownId, serviceItemId)
    AND subtaskId = subtaskId
    AND role = user.role (resolved server-side)
```

When logging time: after selecting project + subtask, show callout: **"Budget: X hrs | Logged: Y hrs | Remaining: Z hrs"**

When creating a task linked to a project with a CB: auto-populate `Task.estimatedHours` from the sum of role estimates for that line. Editable.

### 3.7 INDOT Pay Grade Lookup

Fully configurable `PayGrade` model replaces hardcoded type strings. Lookup chain:

```
TimeEntry.projectId → Project.county → IndotPayZone.counties (contains county)
  → IndotPayZone.payGradeId → PayGrade
  → UserRate(userId, payGradeId, effectiveDate ≤ entry.date) → rate
```

If no zone is found for the project's county, fall back to the user's default (`PayGrade.isDefault = true`) rate and surface a warning in the UI.

### 3.8 Cost Breakdown Locking

When a proposal is accepted: set `CostBreakdown.benchmarkLockedAt = now()`. After this point, the service layer should guard against edits to the breakdown (or allow with an explicit "unlock with reason" flow for audit purposes).

---

## 4. Schema & Data Model Changes

### 4.1 New Models

```prisma
model PayGrade {
  id          String   @id @default(uuid())
  tenantId    String
  name        String             // e.g. "Base Rate", "INDOT Pay 1", "INDOT Pay 2"
  code        String   @unique   // e.g. "base", "indot_1", "indot_2" — internal key
  description String?
  sortOrder   Int      @default(0)
  isDefault   Boolean  @default(false)  // one grade = default (base rate)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userRates   UserRate[]
  payZones    IndotPayZone[]
  tenant      Tenant @relation(fields: [tenantId], references: [id])

  @@map("pay_grades")
}

model IndotPayZone {
  id          String   @id @default(uuid())
  tenantId    String
  name        String             // e.g. "Zone 1", "Zone 2"
  payGradeId  String
  counties    String[]           // array of county name strings — must match DropdownOption.label
                                 // where category = "county" (counties are plain DropdownOption
                                 // records; the metadata field exists but is currently unused)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  payGrade    PayGrade @relation(fields: [payGradeId], references: [id])
  tenant      Tenant @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, name])
  @@map("indot_pay_zones")
}

model ProjectAddendum {
  id          String   @id @default(uuid())
  tenantId    String
  projectId   String
  title       String
  description String?  @db.Text
  status      String   @default("DRAFT")  // "DRAFT" | "APPROVED" | "INVOICED"
  total       Float    @default(0)        // derived from lines, stored for perf
  approvedAt  DateTime?
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project     Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdBy   User    @relation(fields: [createdById], references: [id])
  lines       ProjectAddendumLine[]

  @@index([projectId])
  @@map("project_addenda")
}

model ProjectAddendumLine {
  id             String   @id @default(uuid())
  addendumId     String
  description    String
  role           String?
  estimatedHours Float    @default(0)
  billableRate   Float    @default(0)
  lineTotal      Float    @default(0)   // estimatedHours × billableRate
  sortOrder      Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  addendum       ProjectAddendum @relation(fields: [addendumId], references: [id], onDelete: Cascade)

  @@index([addendumId])
  @@map("project_addendum_lines")
}

model ProjectComment {
  id           String   @id @default(uuid())
  tenantId     String
  projectId    String
  authorId     String
  content      String   @db.Text    // raw text with @userId mention tokens
  visibility   String   @default("ALL")  // "ALL" | "TAGGED_ONLY"
  mentionedIds String[] @default([])     // array of userId strings
  editedAt     DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  project      Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  author       User    @relation(fields: [authorId], references: [id])
  tenant       Tenant  @relation(fields: [tenantId], references: [id])

  @@index([projectId])
  @@index([createdAt])
  @@map("project_comments")
}

model PtoPolicy {
  id             String   @id @default(uuid())
  tenantId       String
  name           String             // "Vacation", "Sick", "Personal"
  color          String?
  maxDaysPerYear Float    @default(0)   // 0 = unlimited
  accrualType    String   @default("FLAT")  // "FLAT" | "ACCRUAL" (future)
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  requests       PtoRequest[]
  tenant         Tenant @relation(fields: [tenantId], references: [id])

  @@map("pto_policies")
}

model PtoRequest {
  id         String   @id @default(uuid())
  tenantId   String
  userId     String
  policyId   String
  startDate  DateTime
  endDate    DateTime
  days       Float              // Float to support half-days (e.g. 0.5)
  status     String   @default("PENDING")  // "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
  notes      String?
  approverId String?
  reviewNote String?
  reviewedAt DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user       User      @relation(fields: [userId], references: [id])
  policy     PtoPolicy @relation(fields: [policyId], references: [id])
  approver   User?     @relation("PtoApprovals", fields: [approverId], references: [id])
  tenant     Tenant    @relation(fields: [tenantId], references: [id])

  @@index([userId])
  @@index([status])
  @@index([startDate, endDate])
  @@map("pto_requests")
}
```

### 4.2 Field Changes to Existing Models

**`UserRate`** — `type` field is **replaced** by `payGradeId FK`:
```prisma
// Remove:
type        String  // "internal" | "billing"

// Replace with:
payGradeId  String
payGrade    PayGrade @relation(fields: [payGradeId], references: [id])

// Existing "internal" rows → migrate to PayGrade where isDefault = true
// Existing "billing" rows → migrate to PayGrade with code = "billing" (create one)
```

**`Project`:**
```prisma
// Add:
invoicedValue       Float?    // set via modal at proposal acceptance; later QB-synced
costBreakdownId     String?   // optional FK to the "primary/active" cost breakdown
                              // keep existing costBreakdowns[] relation — this is just a direct pointer
// Soft-deprecate (keep column, remove from all UI):
estimatedRevenue    Float?    // → use contractedValue instead
endOfProjectValue   Float?    // → replaced by contractedValue + addenda total
```

**`Client`:**
```prisma
// Add:
clientType  String   @default("COMPANY")  // "COMPANY" | "INDIVIDUAL"

// Change:
name        String?  @default("")   // was NOT NULL; nullable for individuals
                                   // audit qb-customer-sync.service.ts before this migration
                                   // create getClientDisplayName(client) helper:
                                   //   returns name || individualName || "Unknown"
```

**`Task`:**
```prisma
// Add (all nullable — only populated for project tasks with a cost breakdown):
estimatedHours        Float?
costBreakdownLineId   String?    // FK to CostBreakdownLine
serviceItemId         String?    // FK to ServiceItem
serviceItemSubtaskId  String?    // FK to ServiceItemSubtask
// Note: only populate these when entityType = 'PROJECT' to avoid confusion for lead/client tasks
```

**`CostBreakdown`:**
```prisma
// Add:
benchmarkLockedAt  DateTime?  // set when proposal is accepted; guards against edits after lock
```

**`Role`:**
```prisma
// Add:
showInCostBreakdown  Boolean  @default(true)
// When false, this role does not appear in the CostBreakdownRoleEstimate row picker
// Controlled from the Roles admin page
```

**`NotificationPreference`:**
```prisma
// Add:
commentMention  Boolean  @default(true)   // email/in-app when @mentioned in a comment
ptoRequest      Boolean  @default(true)   // for approvers: notify on new PTO requests
```

### 4.3 Deprecated / Removed Models

These models should be **hidden from the UI now** but **NOT dropped from the database** until confirmed empty after data migration:

| Model | Superseded by | Action |
|---|---|---|
| `ProjectBudget` | `CostBreakdown` totals | Hide UI; keep table; deprecation migration TBD |
| `ProjectCostSegment` | `CostBreakdownLine` | Hide UI (already removed from Create dialog); keep table — some projects may have data |

> **Important:** Do not drop `ProjectCostSegment` until you have confirmed all existing segment data has been reviewed. Some projects have entries that represent real budget data. Provide a migration guide: "existing cost segments should be manually moved to cost breakdown lines."

### 4.4 Model Renames (Prisma `@@map`)

Keep DB table names unchanged; rename Prisma model names only (zero-change migration):

```prisma
model Division {           // was: ServiceCategory
  @@map("ServiceCategory")
  ...
}

model JobType {            // was: ServiceType
  @@map("ServiceType")
  ...
}
```

### 4.5 New Permissions

Add to `ALL_PERMISSIONS` in `permissions.constants.ts`:

```ts
{ key: 'roles:view',   label: 'View Roles',   module: 'Roles' },
{ key: 'roles:create', label: 'Create Roles',  module: 'Roles' },
{ key: 'roles:edit',   label: 'Edit Roles',    module: 'Roles' },
{ key: 'roles:delete', label: 'Delete Roles',  module: 'Roles' },
```

Seed in `DEFAULT_ROLE_PERMISSIONS`:
- CEO, ADMIN: all four
- PROJECT_MANAGER: `roles:view` only

The existing `permissions:view`/`permissions:edit` become exclusively the permission-matrix gate. Role CRUD gets its own gate. Fully additive — no breaking changes.

Also update `ADMIN_PANEL_PERMISSIONS` to include `'roles:view'`.

---

## 5. Naming Rename: Division / JobType

**Scope:** ServiceCategory → Division, ServiceType → JobType everywhere.

**Blast radius (files to touch):**

### Backend
- `backend/prisma/schema.prisma` — add `@@map()` directives, rename model names
- `backend/src/service-categories/` — rename directory, all files, class names, exports
- `backend/src/service-types/` — rename directory, all files, class names, exports
- `backend/src/cost-breakdown/cost-breakdown.service.ts` — all `serviceType`, `serviceCategory` field refs; `serviceTypeIds: { has: dto.serviceTypeId }` → `jobTypeIds: { has: dto.jobTypeId }`
- `backend/src/projects/projects.service.ts` — `serviceTypeId`, `serviceCategoryId` references
- `backend/src/time-tracking/time-tracking.service.ts` — service type references
- `backend/src/reports/services/*.service.ts` — any service type/category grouping
- All `*.dto.ts` files referencing these — rename field names
- `backend/src/settings/settings.service.ts` — method names: `findAllServiceCategories` → `findAllDivisions`, etc.
- `backend/src/settings/settings.controller.ts` — routes: `/settings/service-categories` → `/settings/divisions`; `/settings/service-types` → `/settings/job-types`
- `backend/src/app.module.ts` — module import names

### Frontend
- `frontend/lib/types.ts` — `ServiceCategory`, `ServiceType` → `Division`, `JobType`
- `frontend/lib/api/` — `serviceCategoriesApi`, `serviceTypesApi` → `divisionsApi`, `jobTypesApi`
- `frontend/components/cost-breakdown/` — all label text, prop names
- `frontend/components/projects/ProjectCoreFields.tsx` — service type/category pickers
- `frontend/components/time-tracking/TimeEntryDialog.tsx` — service type references
- `frontend/components/layout/AppSidebar.tsx` — "Service Types" nav label → "Job Types"
- `frontend/app/(dashboard)/admin/service-types/` — rename directory to `job-types/`
- `frontend/app/(dashboard)/admin/service-categories/` — rename to `divisions/`
- All `import` statements referencing old names

**Seeded data:** Seed method names and routes change; the string label values themselves (e.g., `"Engineering"`, `"Surveying"`) do not change.

**Strategy:** Do this rename as a single focused PR before any new feature is built that touches these models. Use global search-and-replace with whole-word matching. Test all service item, cost breakdown, and time entry flows after.

---

## 6. Phase-by-Phase Implementation Plan

### Phase 0 — Quick Fixes & Foundations (no schema changes)

| # | Task | File(s) | Status |
|---|---|---|---|
| 0.1 | Fix `formatProposalDate()` — add ordinal suffix ("January 15th, 2026") | `proposal-fill.util.ts` | ✅ |
| 0.2 | Fix proposal generation from CB page — mount `useEffect` to fetch breakdown by `prefilledBreakdownId`, auto-set `selectedBreakdown`; if breakdown has `leadId` auto-set lead picker | `ProposalEditor.tsx` | ✅ |
| 0.3 | Fix `generateProposal()` — when `leadId` absent, fall back to breakdown's linked project/client; don't leave header fields blank | `proposal-templates.service.ts` | ✅ |
| 0.4 | Sort Job # column — `DataTableColumnHeader` + `enableSorting: true` | `columns-projects.tsx` | ✅ |
| 0.5 | Sort Client column — same | `columns-projects.tsx` | ✅ |
| 0.6 | Remove `estimatedRevenue` column from projects table (column only — DB field stays for now) | `columns-projects.tsx` | ✅ |
| 0.7 | Rename "Budget" tab → "Financials" on ProjectDetailView | `ProjectDetailView.tsx` | ✅ |
| 0.8 | Rename "Mailing Address" → "Project Address" on lead forms + lead detail view | `CreateLeadDialog.tsx`, `EditLeadDialog.tsx` | ✅ |
| 0.9 | Remove custom fields tab from ClientDetailView | `ClientDetailView.tsx` | ✅ |
| 0.10 | Verify and fix direct expenses rendering in `CostBreakdownEditor.tsx` — read JSX ~line 250+; confirm `<Input>` elements exist and call `scheduleExpenseSave()` on change | `CostBreakdownEditor.tsx` | ✅ |
| 0.11 | Remove `ProjectCostSegments` section from `CreateProjectDialog` — remove import, JSX, and `costSegments`/`setCostSegments` hook state | `CreateProjectDialog.tsx`, `useCreateProjectForm.ts` | ✅ |
| 0.12 | Remove service items section from `CreateProjectDialog` and `EditProjectDialog` — remove `linkedServiceItems`, `filteredServiceItems`, `addServiceItem`, `removeServiceItem` from hook and dialogs; `ProjectsService.create()` no longer creates `ProjectServiceItem` rows from the form. **The Services tab on `ProjectDetailView` stays** — it becomes read-only (shows what the cost breakdown linked, not editable from the project form) | `CreateProjectDialog.tsx`, `EditProjectDialog.tsx`, `useCreateProjectForm.ts`, `projects.service.ts` | ✅ |
| 0.13 | Calendar: project event click → `ProjectCalendarPopover` with project name, "View" link, and single date picker for `estimatedDueDate` only; PATCH `/projects/:id` on save. Implementation note: the Popover must be added at the event render layer inside `MonthTab`/`WeekTab`/`AgendaTab`, not just in `CalendarView` — add `estimatedDueDate` to `CalendarEvent` type and `projectToEvents()` first | `CalendarView.tsx`, `calendarUtils.ts`, new `ProjectCalendarPopover.tsx` | ✅ |
| 0.14 | Individual client: add `clientType` toggle (Company / Individual) to create/edit dialogs; hide company type, industry, website when "Individual"; make `name` field optional for individuals | `CreateCustomerDialog.tsx`, `EditCustomerDialog.tsx`, `ClientDetailView.tsx` | ✅ |
| 0.15 | Add `roles:view/create/edit/delete` permissions; update `DEFAULT_ROLE_PERMISSIONS`; update `ADMIN_PANEL_PERMISSIONS` | `permissions.constants.ts` | ✅ |
| 0.16 | Update sidebar Roles item to `permission: 'roles:view'`; update `RolesController` guards | `AppSidebar.tsx`, `roles.controller.ts` | ✅ |
| 0.17 | Admin nav restructure (see detailed groups below) + extract Proposal Templates to `/admin/proposal-templates` + add admin routes to command palette | `AppSidebar.tsx`, new admin page, command palette | ✅ |
| 0.18 | Accept Proposal modal — show confirmation with total amount, prompt to set `invoicedValue`; `acceptProposal()` writes both `contractedValue` and `invoicedValue` on the project | `proposal-templates.service.ts`, new modal component | ✅ |

#### Phase 0.17 — New Admin Nav Groups (detailed)

```
People & Access
  Users, Teams, Roles, Permissions

Project Configuration
  Divisions (was: Service Categories)
  Job Types (was: Service Types — sub-view of Divisions)
  Service Items, Task Types, Work Codes

Financial Configuration  ← NEW GROUP
  Pay Rates (new)
  INDOT Pay Zones (new)
  Invoicing Settings (moved from Settings group)

Pipeline & Automation
  Pipeline, Automation (Workflows)

Proposals & Documents  ← NEW GROUP (previously buried in Invoicing Settings)
  Proposal Templates (extract from AdminQuoteSettingsView → own page)
  Intake Forms

Settings
  General, AI

Integrations
  QuickBooks

System
  Custom Fields, Form Options (Dropdown Options), Audit Logs, System
```

Command palette fix: pull from `adminNavGroups` and filter by user permissions. Static data change, no new API.

### Phase 1 — Rename: Division / JobType

| # | Task | Status |
|---|---|---|
| 1.1 | Add `@@map()` directives to Prisma schema; rename model names | ⬜ |
| 1.2 | Run `npx prisma migrate dev --name rename_service_category_to_division` (zero-change migration) | ⬜ |
| 1.3 | Rename backend directories, classes, exports, route paths | ⬜ |
| 1.4 | Update all backend service/controller/DTO references | ⬜ |
| 1.5 | Update frontend types, API clients, components, admin routes | ⬜ |
| 1.6 | Update sidebar label "Service Types" → "Job Types" | ⬜ |
| 1.7 | Smoke test: service item creation, cost breakdown creation, time entry dialog, admin pages | ⬜ |

### Phase 1.5 — Interstitial: PayGrade Model + Admin Restructure (schema, no full UI)

Do before Phase 2 (financials) because Phase 2 depends on `payGradeId` replacing `UserRate.type`.

| # | Task | Status |
|---|---|---|
| I.1 | Add `PayGrade` model to schema (with `code`, `isDefault`, `isActive`, `sortOrder`) | ⬜ |
| I.2 | Replace `UserRate.type String` with `UserRate.payGradeId FK` | ⬜ |
| I.3 | Run migration; seed 4 initial grades: Base Rate (isDefault), INDOT Pay 1, INDOT Pay 2, INDOT Pay 3 | ⬜ |
| I.4 | Migrate existing `UserRate` rows: `"internal"` → default PayGrade, `"billing"` → new "Billing" PayGrade | ⬜ |
| I.5 | Extract `ProposalTemplatesSection` from `AdminQuoteSettingsView` → `/admin/proposal-templates` page | ⬜ |
| I.6 | Implement admin nav restructure (Phase 0.17 groups) | ⬜ |

### Phase 2 — Financial Source of Truth

| # | Task | Status |
|---|---|---|
| 2.1 | Add `invoicedValue Float?` + `costBreakdownId String?` to `Project` + migration | ⬜ |
| 2.2 | Soft-deprecate `Project.estimatedRevenue` and `Project.endOfProjectValue` — add DB comment, remove from all UI reads | ⬜ |
| 2.3 | Add `CostBreakdown.benchmarkLockedAt DateTime?` + migration | ⬜ |
| 2.4 | Create `ProjectProfitabilityService.compute(projectId)` — full formula (revenue + addenda − labor − direct costs) | ⬜ |
| 2.5 | Update `TimeTrackingService` create/update/delete → call `recalculateProjectCost(projectId)` after each write | ⬜ |
| 2.6 | Create `GET /projects/:id/profitability` endpoint | ⬜ |
| 2.7 | Update `projects-reporting.service.ts` to use `ProjectProfitabilityService.compute()` | ⬜ |
| 2.8 | Update `dashboard.service.ts` revenue aggregation | ⬜ |
| 2.9 | Build `FinancialsTab` component: contracted value, invoiced value, labor cost by user/role, direct expenses, margin, proposed vs actual hours | ⬜ |
| 2.10 | `acceptProposal()` — write `contractedValue` + `invoicedValue` + set `benchmarkLockedAt` on breakdown | ⬜ |

### Phase 3 — Pay Rates + INDOT Zones (Admin UI)

| # | Task | Status |
|---|---|---|
| 3.1 | Add `IndotPayZone` model (with `name`, `counties String[]`, `payGradeId FK`) + migration | ⬜ |
| 3.2 | Backend: `PayGradeModule` — CRUD endpoints; `IndotPayZoneModule` — CRUD endpoints | ⬜ |
| 3.3 | Frontend: Pay Rates admin page — per-user rate grid with all PayGrades + effective date ranges | ⬜ |
| 3.4 | Frontend: INDOT Pay Zones admin page — zone name, county multi-select, grade assignment | ⬜ |
| 3.5 | Update `TimeTrackingService.createEntry()` — auto-select rate via pay grade lookup; store as `hourlyRate` snapshot; show source label in UI ("Filled from INDOT Pay 2") | ⬜ |
| 3.6 | Frontend: User rate form — show rate rows per PayGrade with effective dates | ⬜ |

### Phase 4 — Client Model (Small Schema Change)

| # | Task | Status |
|---|---|---|
| 4.1 | Add `Client.clientType String @default("COMPANY")` + make `Client.name String? @default("")` + migration | ⬜ |
| 4.2 | Create `getClientDisplayName(client)` helper: returns `name \|\| individualName \|\| "Unknown"` | ⬜ |
| 4.3 | Audit `qb-customer-sync.service.ts` — update all uses of `client.name` to use `getClientDisplayName()` | ⬜ |
| 4.4 | Update `CreateCustomerDialog` + `EditCustomerDialog` with Company/Individual toggle and conditional fields; rename `individualType` field label to **"Contact Type"** (e.g., Property Owner, Developer, Agent) — visible for both individual and company, but especially relevant for individuals | ⬜ |
| 4.5 | Update `ClientDetailView` display name and conditional field display | ⬜ |

### Phase 5 — Cost Breakdown as Work Authority

| # | Task | Status |
|---|---|---|
| 5.1 | Add `Task.estimatedHours`, `Task.costBreakdownLineId`, `Task.serviceItemId`, `Task.serviceItemSubtaskId` to schema + migration | ✅ |
| 5.2 | When `CostBreakdown.projectId` is set, auto-sync `ProjectServiceItem` rows from CB lines (`CostBreakdownService.linkToProject()`). **Also handle lead→project conversion:** when a lead converts to a project, set the lead's cost breakdown's `projectId` so the sync runs automatically | ✅ |
| 5.3 | `TimeEntryDialog`: subtasks grouped under service item headers (`ServiceSubtaskPicker` component with cmdk `CommandGroup` per service item) | ✅ |
| 5.4 | `TimeEntryDialog`: show budget/logged/remaining callout when subtask selected. `GET /time-tracking/subtask-budget` backend endpoint resolves user role server-side | ✅ |
| 5.5 | `TaskDialog`: service item picker filtered by project's CB lines when project selected; auto-populate `estimatedHours` from role estimate sum | ✅ |
| 5.6 | CB editor edit-mode "Add Service Item Line" picker: filtered by CB's `jobTypeId` via `serviceItemsApi.getAll(jobTypeId)` | ✅ |
| 5.7 | `Role.showInCostBreakdown` — roles filtered in CB editor; toggle in Roles admin page table column + edit dialog | ✅ |
| 5.8 | Performance sub-section on Financials tab: `ServiceItemPerformanceTable` in `ProjectFinancialsSummary` — proposed vs actual hours per service item × role | ✅ |

### Phase 6 — Addendum System

| # | Task | Status |
|---|---|---|
| 6.1 | Add `ProjectAddendum` + `ProjectAddendumLine` models + migration | ✅ |
| 6.2 | Backend: Addendum CRUD service + controller (`/projects/:id/addenda`) | ✅ |
| 6.3 | Update `ProjectProfitabilityService.compute()` to include approved addenda in revenue | ✅ |
| 6.4 | Frontend: `AddendumTab` component on `ProjectDetailView` | ✅ |

### Phase 7 — Comments + PTO

| # | Task | Status |
|---|---|---|
| 7.1 | Add `ProjectComment` model + `NotificationPreference.commentMention` + migration | ✅ |
| 7.2 | Backend: Comment CRUD + `@mention` parsing (extract `mentionedIds` from content on save) + notification creation | ✅ |
| 7.3 | Frontend: `CommentsSection` component on `ProjectDetailView` (new tab or section) | ✅ |
| 7.4 | Add `PtoPolicy` + `PtoRequest` models + migration | ✅ |
| 7.5 | Backend: PTO CRUD service + approval workflow + notification triggers | ✅ |
| 7.6 | Frontend: PTO request form (self-service) + approval inbox (manager) | ✅ |
| 7.7 | Show approved PTO on team calendar; PTO days in weekly timesheet view | ✅ |

### Phase 8 — Map + Remaining UX Polish

| # | Task | Status |
|---|---|---|
| 8.1 | Map filter by project status (`ProjectsMapView.tsx` — client-side filter bar over fetched project list) | ⬜ |
| 8.2 | Export bug: install symbol fonts in Docker container (Option A) or pre-process `<w:sym>` → Unicode (Option B) | ⬜ |
| 8.3 | Export bug: DOCX two-page overflow — audit template last N paragraphs, verify `setParaText()` preserves `<w:spacing>` | ⬜ |

---

## 7. Meeting Notes Cross-Reference

| # | Meeting Note | Phase | Status |
|---|---|---|---|
| 1 | Add invoiced value to project (modal at proposal acceptance) | Phase 0.18 | ⬜ |
| 2 | Long date format for proposals (January 15th, 2026) | Phase 0.1 | ⬜ |
| 3 | Proposal generation fails from CB page | Phase 0.2, 0.3 | ⬜ |
| 4 | Sort Job # column | Phase 0.4 | ⬜ |
| 5 | Sort Client column | Phase 0.5 | ⬜ |
| 6 | Remove cost segments from project creation | Phase 0.11 | ⬜ |
| 7 | Remove service items from project create/edit | Phase 0.12 | ⬜ |
| 8 | Labor cost affects profitability (time entries × user rates) | Phase 2.4–2.7 | ⬜ |
| 9 | Pay rate config — base rate + INDOT Pay 1/2/3 (fully configurable PayGrade model) | Phase 1.5, Phase 3 | ⬜ |
| 10 | County-INDOT rate linkage (IndotPayZone model) | Phase 3.1–3.4 | ⬜ |
| 11 | Cost breakdown as single source of truth for tasks/hours/service items | Phase 5 | ⬜ |
| 12 | Customer company name not required for individuals | Phase 4.1 | ⬜ |
| 13 | Individual vs company toggle — hide company type + industry + website | Phase 4.4 | ⬜ |
| 14 | Remove custom fields tab from ClientDetailView | Phase 0.9 | ⬜ |
| 15 | Rename "Mailing Address" → "Project Address" on leads | Phase 0.8 | ⬜ |
| 16 | Filter map by project status | Phase 8.1 | ⬜ |
| 17 | Rename "Budget" → "Financials" tab on project detail | Phase 0.7 | ⬜ |
| 18 | Addendum tab on project detail | Phase 6 | ✅ |
| 19 | Calendar popover: view project + edit due date only | Phase 0.13 | ⬜ |
| 20 | Performance reporting: proposed vs. actual hours per subtask per role | Phase 5.8 | ⬜ |
| 21 | PTO system | Phase 7.4–7.7 | ✅ |
| 22 | Comments with @mentions | Phase 7.1–7.3 | ✅ |
| 23 | Separate `roles:*` permissions | Phase 0.15–0.16 | ⬜ |
| 24 | Rename ServiceCategory → Division, ServiceType → JobType (frontend + backend) | Phase 1 | ⬜ |
| 25 | CB service items filtered by job type in edit-mode add-line picker | Phase 5.6 | ⬜ |
| 26 | Configurable roles on cost breakdown role estimates (`Role.showInCostBreakdown`) | Phase 5.7 | ⬜ |
| 27 | Direct expenses editable on CB page | Phase 0.10 | ⬜ |
| 28 | PDF export symbols missing (Wingdings/Symbol fonts) | Phase 8.2 | ⬜ |
| 29 | DOCX export overflows to 2 pages | Phase 8.3 | ⬜ |
| 30 | Admin navigation restructure + global search indexing | Phase 0.17 | ⬜ |

---

## 8. Export Bug Investigation

### 8.1 PDF Symbol Rendering

**Root cause:** `<w:sym>` elements in DOCX files reference symbol fonts (Wingdings, Symbol). The LibreOffice instance on the Docker container does not have these fonts, so symbols render as missing glyphs or empty boxes. `fillDocx()` does not process `<w:sym>` elements — they pass through unchanged in XML but LibreOffice can't render them.

**Three fix options:**

| Option | Effort | Quality |
|---|---|---|
| A. Install symbol fonts in Dockerfile | Low | High — preserves original symbols exactly |
| B. Pre-process `<w:sym>` → Unicode equivalents in `proposal-fill.util.ts` | Medium | Medium — accuracy depends on mapping table |
| C. Replace LibreOffice with Gotenberg (open-source Docker DOCX→PDF service) | High | High — full font support, well-maintained |

**Recommended:** Option A first. If font licensing is an issue, Option C (Gotenberg) long-term.

**Files changed for Option A:** `Dockerfile` or `docker-compose.yml` — add font installation step.

**Files changed for Option B:** `backend/src/proposal-templates/proposal-fill.util.ts` — add `processSymbolElements()` pass before `fillDocx()` call.

### 8.2 DOCX Two-Page Overflow

**Root cause (most likely):** The proposal template's page content fits exactly on one page in Word. When placeholder substitutions produce longer text than the placeholder (e.g., a long client address), the signing block is pushed to page 2. Less likely but possible: `setParaText()` (lines 480–492) drops `<w:spacing>` or `<w:beforeAutospacing>` attributes from `<w:pPr>` when replacing content in signing-block paragraphs.

**`setParaText()` behavior:** It preserves `<w:pPr>` from the first matching paragraph. If the replacement target has no `<w:pPr>`, none is added. Empty spacing paragraphs (common Word technique for vertical spacing) should survive if untouched — but an index mismatch in `applyParagraphOverrides` could accidentally target them.

**Fix approach:**
1. Audit the last N paragraphs of the template for tight vertical spacing.
2. Ensure no variable-length substitution touches signing-block paragraphs.
3. Verify `setParaText()` is not called on signing-block paragraphs due to an override index mismatch.
4. If the root cause is content length: ensure proposal service items / descriptions are truncated or wrapped appropriately in the template.

---

## 9. Cross-App Impact Matrix

| Change | Backend modules affected | Frontend components affected |
|---|---|---|
| Division/JobType rename | service-categories, service-types, cost-breakdown, projects, time-tracking, reports, settings | types.ts, all CB/project/time forms, admin pages |
| `UserRate.type` → `payGradeId FK` | time-tracking, reports, pay-grades (new) | UserRate form, TimeEntryDialog, admin pay rates page |
| `acceptProposal()` sets contractedValue + invoicedValue + benchmarkLockedAt | proposal-templates, projects | ProposalEditor (new modal), ProjectDetailView |
| `Project.totalCost` reactive from time entries | time-tracking | ProjectDetailView Financials tab, reports |
| Add `roles:*` permissions | permissions, roles | AppSidebar, admin layout, RolesController |
| PayGrade + IndotPayZone models | New modules: pay-grades, indot-pay-zones | New admin pages, UserRate form, TimeEntryDialog rate auto-fill |
| Client `clientType` + nullable `name` | clients, qb-sync | CreateCustomerDialog, EditCustomerDialog, ClientDetailView, QB sync helper |
| ProjectAddendum model | New module: addenda | ProjectDetailView new tab, profitability service |
| ProjectComment model | New module: comments | New CommentsSection component on ProjectDetailView |
| PtoPolicy + PtoRequest models | New module: pto | PTO request form, approval inbox, CalendarView |
| Role.showInCostBreakdown | roles | CostBreakdownEditor role estimate picker |
| Remove service items from project form | projects | CreateProjectDialog, EditProjectDialog, useCreateProjectForm hook |
| ProjectCostSegment UI removal | — (keep model) | CreateProjectDialog already removing; verify EditProjectDialog |
| Admin nav restructure | — | AppSidebar.tsx, command palette data source |

---

## 10. Risks & Open Questions

### Open Questions

1. **Addendum approval flow:** Who approves an addendum — PM only, CEO also? Is there an email notification to the client for addenda?
2. **Addendum tasks + time tracking:** Should addendum tasks create new `ProjectServiceItem` rows, or reuse the existing set? Time entries for addendum work — should labor cost be reported separately from base contract work?
3. **Calendar due-date edit scope:** Should editing `estimatedDueDate` cascade to shift task due dates proportionally?
4. **CB role estimates migration:** `CostBreakdownRoleEstimate.role` is a plain String today. When role estimates are filtered via `rolesApi`, existing string values won't match role IDs. Migration strategy needed (map old string values to role IDs, or keep as display-only legacy rows).
5. **DOCX template ownership:** Who manages proposal templates? If they add new symbol-font characters, PDF export will break again. Consider documenting a "safe characters" list or building a pre-flight check.
6. **PTO and crew availability:** Should approved PTO block a crew member from being assigned to field work on those dates? Auto-block or warning only?
7. **`Project.estimatedRevenue` / `endOfProjectValue` deprecation timing:** Some project records use these for historical context. Archive the values (copy to contractedValue) before dropping. Do NOT drop until confirmed safe.
8. **Lead → Project cost breakdown migration:** When a lead converts to a project, the lead's `CostBreakdown.projectId` should be set automatically. Currently there is no automatic migration — the CB stays only lead-scoped. The lead conversion service needs to find any breakdowns with `leadId = lead.id` and update `projectId = newProject.id`.
9. **Comment visibility on leads:** Should `ProjectComment` be extended to leads, or is a separate `LeadComment` model cleaner? Does the lead's linked project inherit comments or keep them separate?
10. **`@mention` parsing location:** Parse on server at save time (extract `mentionedIds` from content text). Client renders preview only.
11. **Performance metric granularity:** Start with project-level total (proposed hours vs actual hours), then drill to per-service-item per-role table. The bottleneck view will make the per-role breakdown actionable.

### Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Division/JobType rename breaks API consumers (external integrations, mobile) | Medium | Grep for any external API consumers before renaming routes; consider a `/settings/service-types` → `/settings/job-types` redirect for grace period |
| `UserRate.type` → `payGradeId` migration — existing "internal"/"billing" rows need mapping | Medium | Create PayGrade seeds first, then migrate in one transaction; verify all rows are mapped before dropping `type` column |
| `recalculateProjectCost()` performance — runs after every time entry write on large projects | Low-Medium | Index `TimeEntry.projectId`; consider debounced/async recalculation for bulk imports |
| INDOT pay grade lookup fails when project has no county | Medium | Fallback to default PayGrade (`isDefault = true`) rate; surface a warning in TimeEntryDialog |
| `Project.costBreakdownId` FK — some projects have 0 or 2+ breakdowns today | Medium | Add as optional pointer to the "primary" breakdown only; keep existing `costBreakdowns[]` relation untouched |
| Task model gains `costBreakdownLineId`/`serviceItemId` — creates conceptual split between project tasks and other entity tasks | Low-Medium | Only populate these when `entityType = 'PROJECT'`; all fields are nullable so existing tasks are unaffected |
| `TimeEntry.hourlyRate` auto-selected from INDOT zone — may be wrong if zone config is incorrect | Low | Auto-populate as pre-filled editable default; show source label ("Filled from INDOT Pay 2") so user can correct |
| `Client.name` made nullable — QB sync and other code assumes non-null | Medium | Create `getClientDisplayName(client)` helper before migration; audit all `client.name` usages; QB sync must be updated before migration runs |
| `ProjectCostSegment` data loss — some projects have real budget data in this table | High | **Do not drop** this table. Keep the model. Hide the UI. Write a migration guide for manually moving segment data to cost breakdown lines. |
| `@@map()` rename with no migration — Prisma client codegen changes break compiled backend if stale | Low | Force full Docker rebuild after schema rename; run `prisma generate` before deploy |
| Proposal template DOCX two-page issue may recur with new templates | Low | Document template guidelines: avoid content at lower-margin edge; add preview-PDF step before acceptance |

---

*Document generated from two-session architecture analysis. Update checkboxes as work is completed.*
