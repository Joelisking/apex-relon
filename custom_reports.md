# Custom Report Builder — Implementation Spec

> **Status:** Not Started
> **Created:** 2026-02-26
> **Owner:** CEO / Admin only (RBAC-gated)

Mark subtasks done by changing `[ ]` to `[x]`.

---

## Overview

CEO or ADMIN users can describe a report in plain English. The AI compiles the request into a safe, structured query spec (never raw SQL). The backend validates and executes it against Prisma models. Results render in a dynamic table with toggleable chart types. Reports can be saved, re-run, promoted to shared templates, and exported to CSV.

### Key Design Decisions

| Decision   | Choice                                                              |
| ---------- | ------------------------------------------------------------------- |
| Input mode | Natural language only — user types a prompt, AI compiles            |
| Scheduling | Manual re-run only (no cron/email)                                  |
| Sharing    | Private to creator + CEO can promote to templates; others can clone |
| Charts     | Table always shown + user toggles between bar / line / pie          |

---

## Data Structures

### ReportQuerySpec (AI output → backend intermediate representation)

```ts
interface ReportQuerySpec {
  model:
    | 'Lead'
    | 'Project'
    | 'Client'
    | 'Activity'
    | 'CostLog'
    | 'User';
  select: string[]; // field names to include
  where: FilterCondition[]; // { field, operator, value }
  joins: string[]; // relation names to include
  groupBy?: string[]; // for aggregations
  aggregations?: Aggregation[]; // { field, function: 'count'|'sum'|'avg'|'min'|'max', alias }
  orderBy?: { field: string; dir: 'asc' | 'desc' }[];
  limit?: number;
  suggestedChart?: 'table' | 'bar' | 'pie' | 'line';
  suggestedTitle?: string;
  explanation?: string; // human-readable description of what the query does
}

interface FilterCondition {
  field: string;
  operator:
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'contains'
    | 'in'
    | 'notIn'
    | 'isNull'
    | 'isNotNull';
  value: any;
}

interface Aggregation {
  field: string;
  function: 'count' | 'sum' | 'avg' | 'min' | 'max';
  alias: string;
}
```

### Prisma Models (new)

```prisma
model CustomReport {
  id          String   @id @default(cuid())
  name        String
  description String?
  prompt      String               // original NL prompt from user
  querySpec   Json                  // validated ReportQuerySpec
  chartType   String   @default("table")  // last-used chart type
  isTemplate  Boolean  @default(false)
  createdById String
  createdBy   User     @relation("customReports", fields: [createdById], references: [id])
  runs        CustomReportRun[]
  lastRunAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model CustomReportRun {
  id         String       @id @default(cuid())
  reportId   String
  report     CustomReport @relation(fields: [reportId], references: [id], onDelete: Cascade)
  resultData Json                   // cached result snapshot
  rowCount   Int
  executionMs Int                   // query execution time
  runAt      DateTime     @default(now())
}
```

User model addition:

```prisma
// Add to User model
customReports  CustomReport[] @relation("customReports")
```

---

## Phase 1 — Schema & Data Layer

> Prisma schema changes, migration, and foundation services.

### Tasks

- [ ] **1.1** Add `CustomReport` model to `backend/prisma/schema.prisma`
- [ ] **1.2** Add `CustomReportRun` model to `backend/prisma/schema.prisma`
- [ ] **1.3** Add `customReports` relation to `User` model in schema
- [ ] **1.4** Run `npx prisma migrate dev --name add_custom_reports`
- [ ] **1.5** Verify migration succeeds and `npx prisma generate` completes

### Acceptance Criteria

- Both tables exist in the database
- Prisma Client types include `CustomReport` and `CustomReportRun`
- `User` has a `customReports` relation

---

## Phase 2 — Schema Descriptor Service

> Generates a structured description of queryable models/fields for the AI prompt.

### Tasks

- [ ] **2.1** Create `backend/src/custom-reports/` module directory
- [ ] **2.2** Create `schema-descriptor.service.ts` — builds a static map of:
  - Allowed models: `Lead`, `Project`, `Client`, `Activity`, `CostLog`
  - Per model: field name, type, description, whether it's a relation
  - Per model: available relations and their target model
- [ ] **2.3** Implement field blacklist — exclude sensitive fields:
  - `User.password`, `User.resetPasswordToken`, `User.resetPasswordExpires`, `User.emailVerificationToken`
  - `AISettings.*` (entire model excluded)
  - `AuditLog.*` (entire model excluded)
- [ ] **2.4** Add `getSchemaDescription(): string` method that formats the map into a prompt-friendly text block
- [ ] **2.5** Add unit test verifying blacklisted fields are excluded

### Acceptance Criteria

- Service returns a complete, accurate description of 5 queryable models
- No sensitive fields appear in the output
- Output is a well-formatted string suitable for inclusion in an AI prompt

---

## Phase 3 — AI Integration (Query Compiler)

> New AI capability: compile natural language → ReportQuerySpec.

### Tasks

- [ ] **3.1** Add `compileReportQuery` method to `AIProvider` interface in `backend/src/ai/interfaces/provider.interface.ts`:
  ```ts
  compileReportQuery(prompt: string, schemaDescription: string): Promise<ReportQuerySpec>;
  ```
- [ ] **3.2** Add `ReportQuerySpec` type (and sub-types) to `backend/src/ai/interfaces/provider.interface.ts`
- [ ] **3.3** Create prompt builder `buildReportQueryPrompt(userPrompt, schemaDescription)` in `backend/src/ai/prompts/index.ts`:
  - System message: "You are a report query compiler for a CRM system..."
  - Include the full schema description
  - Include the `ReportQuerySpec` JSON schema with clear field descriptions
  - Include 3-4 example prompt → spec pairs for few-shot learning
  - Emphasize: output ONLY valid JSON, use only fields from the schema, max 1000 rows
- [ ] **3.4** Implement `compileReportQuery` in `AnthropicProvider`
- [ ] **3.5** Implement `compileReportQuery` in `OpenAIProvider`
- [ ] **3.6** Implement `compileReportQuery` in `GeminiProvider`
- [ ] **3.7** Expose `compileReportQuery` in `AIService` with provider selection support
- [ ] **3.8** Test with sample prompts:
  - "Show me all projects with margin below 20%" → verify correct model, where clause, select fields
  - "Top 10 clients by lifetime revenue" → verify orderBy, limit, correct model
  - "Leads by stage with total value per stage" → verify groupBy + aggregation
  - "Cost breakdown by category for project X" → verify join + filter

### Acceptance Criteria

- All 3 providers implement the method
- AI returns valid `ReportQuerySpec` JSON for at least 4 common prompt patterns
- Prompt includes few-shot examples and schema description
- Invalid/ambiguous prompts return a spec with an `explanation` noting what was unclear

---

## Phase 4 — Query Executor Service

> The critical security/execution layer. Validates AI-generated specs and executes safe Prisma queries.

### Tasks

- [ ] **4.1** Create `query-executor.service.ts` in `backend/src/custom-reports/`
- [ ] **4.2** Implement **model whitelist validation** — reject any model not in `['Lead', 'Project', 'Client', 'Activity', 'CostLog']`
- [ ] **4.3** Implement **field whitelist validation** — for each model, maintain an explicit list of allowed fields. Reject any field not in the list.
- [ ] **4.4** Implement **operator validation** — only allow the defined operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `in`, `notIn`, `isNull`, `isNotNull`
- [ ] **4.5** Implement **relation validation** — only allow whitelisted joins (e.g., `Project.client`, `Lead.assignedTo`, `CostLog.project`)
- [ ] **4.6** Implement **role-based data scoping**:
  - CEO/ADMIN: no additional filters
  - (Future: if custom reports are ever opened to other roles, apply same scoping as existing report services)
- [ ] **4.7** Implement **spec → Prisma query builder**:
  - Map `select` → Prisma `select` object
  - Map `where` conditions → Prisma `where` object with proper nesting
  - Map `joins` → Prisma `include` object
  - Map `orderBy` → Prisma `orderBy` array
  - Map `limit` → Prisma `take` (cap at 1000)
  - Map `groupBy` + `aggregations` → Prisma `groupBy` with `_count`, `_sum`, `_avg`, `_min`, `_max`
- [ ] **4.8** Implement **query execution** with:
  - 10-second timeout
  - Row count capture
  - Execution time tracking (ms)
  - Error handling with user-friendly messages
- [ ] **4.9** Implement **result formatting** — normalize output into `{ columns: Column[], rows: any[], totalRows: number, executionMs: number }`
  ```ts
  interface Column {
    key: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'boolean';
  }
  ```
- [ ] **4.10** Write tests:
  - Valid spec → correct Prisma query shape
  - Invalid model → rejection
  - Blacklisted field in select → rejection
  - Blacklisted field in where → rejection
  - Row limit enforcement
  - groupBy + aggregation produces correct Prisma groupBy call

### Acceptance Criteria

- No raw SQL ever touches the database — everything goes through Prisma
- Every field, model, operator, and relation is validated against whitelists
- Sensitive fields are never queryable
- Queries are capped at 1000 rows and 10s execution time
- Results are returned in a consistent `{ columns, rows }` format

---

## Phase 5 — Custom Reports Module (CRUD + API)

> NestJS module wiring everything together with REST endpoints.

### Tasks

- [ ] **5.1** Create `custom-reports.module.ts` — imports `PrismaService`, `AiModule`, registers all services
- [ ] **5.2** Create DTOs:
  - `CompileReportDto` — `{ prompt: string }`
  - `SaveReportDto` — `{ name: string, description?: string, prompt: string, querySpec: object, chartType?: string }`
  - `RunReportDto` — (empty, or optional `{ overrideFilters?: FilterCondition[] }`)
- [ ] **5.3** Create `custom-reports.service.ts` with methods:
  - `compile(prompt, user)` → calls SchemaDescriptor + AIService → returns `{ querySpec, suggestedTitle, explanation }`
  - `save(dto, userId)` → creates `CustomReport` record
  - `findAll(userId)` → user's reports + all templates
  - `findOne(id, userId)` → single report (must be owner or template)
  - `run(id, userId)` → loads report → executes via QueryExecutor → saves `CustomReportRun` → returns results
  - `runSpec(querySpec, userId)` → execute without saving (for preview before save)
  - `delete(id, userId)` → soft check ownership, then delete
  - `promoteToTemplate(id)` → sets `isTemplate = true` (CEO only)
  - `demoteTemplate(id)` → sets `isTemplate = false` (CEO only)
  - `getTemplates()` → all reports where `isTemplate = true`
- [ ] **5.4** Create `custom-reports.controller.ts` with endpoints:

  | Method   | Path                              | Permission       | Handler                         |
  | -------- | --------------------------------- | ---------------- | ------------------------------- |
  | `POST`   | `/api/custom-reports/compile`     | `reports:custom` | Compile NL → query spec         |
  | `POST`   | `/api/custom-reports/run-preview` | `reports:custom` | Execute a spec without saving   |
  | `POST`   | `/api/custom-reports`             | `reports:custom` | Save a report                   |
  | `GET`    | `/api/custom-reports`             | `reports:custom` | List user's reports + templates |
  | `GET`    | `/api/custom-reports/templates`   | `reports:custom` | List template reports only      |
  | `GET`    | `/api/custom-reports/:id`         | `reports:custom` | Get single report               |
  | `POST`   | `/api/custom-reports/:id/run`     | `reports:custom` | Run saved report                |
  | `PATCH`  | `/api/custom-reports/:id/promote` | `reports:custom` | Promote to template (CEO only)  |
  | `PATCH`  | `/api/custom-reports/:id/demote`  | `reports:custom` | Demote template (CEO only)      |
  | `DELETE` | `/api/custom-reports/:id`         | `reports:custom` | Delete report                   |

- [ ] **5.5** Register `CustomReportsModule` in `app.module.ts`
- [ ] **5.6** Test all endpoints via manual API calls or Postman

### Acceptance Criteria

- All 10 endpoints functional
- Only CEO/ADMIN can access (via `reports:custom` permission)
- Only owner can delete their reports
- Only CEO can promote/demote templates
- Compile → preview → save → re-run flow works end-to-end

---

## Phase 6 — Permissions & RBAC

> Wire up the new permission and grant it to appropriate roles.

### Tasks

- [ ] **6.1** Add `reports:custom` to `PERMISSIONS` constant in `backend/src/permissions/permissions.constants.ts` under the Reports module
- [ ] **6.2** Add `reports:custom` to CEO default permissions (auto-granted, but good to be explicit)
- [ ] **6.3** Add `reports:custom` to ADMIN default permissions
- [ ] **6.4** Verify `PermissionsGuard` correctly blocks other roles from custom report endpoints
- [ ] **6.5** Add `reports:custom` to the admin permissions matrix UI so it appears in the role editor

### Acceptance Criteria

- CEO and ADMIN can access custom reports
- BDM, SALES, DESIGNER, QS are blocked by default
- Permission is visible and toggleable in the admin panel

---

## Phase 7 — Frontend: API Client Layer

> API functions for the frontend to call custom report endpoints.

### Tasks

- [ ] **7.1** Create `frontend/lib/api/custom-reports.ts` with:
  ```ts
  customReportsApi = {
    compile(prompt: string): Promise<CompileResult>,
    runPreview(querySpec: ReportQuerySpec): Promise<ReportResult>,
    save(dto: SaveReportDto): Promise<CustomReport>,
    list(): Promise<CustomReport[]>,
    getTemplates(): Promise<CustomReport[]>,
    get(id: string): Promise<CustomReport>,
    run(id: string): Promise<ReportResult>,
    promote(id: string): Promise<void>,
    demote(id: string): Promise<void>,
    delete(id: string): Promise<void>,
  }
  ```
- [ ] **7.2** Add TypeScript types for `CustomReport`, `CustomReportRun`, `ReportQuerySpec`, `ReportResult`, `CompileResult` in `frontend/lib/types.ts` or a new `frontend/lib/types/custom-reports.ts`
- [ ] **7.3** Create React Query hooks in `frontend/lib/hooks/use-custom-reports.ts`:
  - `useCustomReports()` — list
  - `useCustomReport(id)` — single
  - `useTemplates()` — template list
  - `useCompileReport()` — mutation
  - `useRunPreview()` — mutation
  - `useSaveReport()` — mutation
  - `useRunReport()` — mutation
  - `useDeleteReport()` — mutation
  - `usePromoteReport()` — mutation

### Acceptance Criteria

- All API functions correctly call backend endpoints with auth headers
- Types match backend DTOs exactly
- React Query hooks handle loading, error, and cache invalidation

---

## Phase 8 — Frontend: Report Builder UI

> The main interface for creating and running custom reports.

### Tasks

- [ ] **8.1** Create page: `frontend/app/(dashboard)/reports/custom/page.tsx` — renders `<CustomReportBuilder />`
- [ ] **8.2** Add "Custom Reports" navigation item to sidebar (under Reports section), visible only for roles with `reports:custom` permission
- [ ] **8.3** Create `frontend/components/reports/custom/CustomReportBuilder.tsx` — main layout:
  - Left: prompt input area + saved reports list
  - Right: results area (query preview → table → chart)
- [ ] **8.4** Create `ReportPromptInput.tsx`:
  - Large text input with placeholder: _"Describe the report you want..."_
  - Example prompt chips below: "Top clients by revenue", "Overdue projects", "Lead conversion by rep", "Cost breakdown by category"
  - "Compile" button → calls `compile` mutation
  - Loading state with skeleton
- [ ] **8.5** Create `QueryPreview.tsx`:
  - Renders `querySpec.explanation` as the primary description
  - Shows model being queried, number of filters, groupBy info, sort, limit
  - "Run Report" button + "Edit Prompt" button to go back
  - Human-readable filter display: "Where margin < 20% AND status = Completed"
- [ ] **8.6** Create `DynamicReportTable.tsx`:
  - Receives `{ columns, rows }` from execution result
  - Renders shadcn `Table` with sortable column headers
  - Handles all column types: string, number (formatted), date (formatted), boolean (Yes/No)
  - Pagination if > 50 rows (client-side)
  - Row count display
  - CSV export button (reuse existing `exportDataToCSV` utility)
- [ ] **8.7** Create `DynamicReportChart.tsx`:
  - Chart type toggle buttons: Bar | Line | Pie (using shadcn `ToggleGroup`)
  - Default to `suggestedChart` from AI
  - Uses Recharts `BarChart`, `LineChart`, `PieChart`
  - Auto-detects: first string column = category axis, first numeric column = value axis
  - For multiple numeric columns: show as grouped bars or multiple lines
  - Responsive container
- [ ] **8.8** Create `SaveReportDialog.tsx`:
  - Dialog with: name input, optional description textarea
  - Pre-fills name with `suggestedTitle` from AI
  - Save button → calls `save` mutation → navigates to saved report view
- [ ] **8.9** Create `SavedReportsList.tsx`:
  - Collapsible sidebar section showing user's saved reports
  - Each item: name, last run date, run/delete actions
  - Template badge for promoted reports
  - Click to load and re-run
- [ ] **8.10** Create `TemplateGallery.tsx`:
  - Grid of template cards
  - Each shows: name, description, "Use Template" button
  - Clicking "Use Template" loads the prompt into the input and auto-compiles

### Acceptance Criteria

- Full flow works: type prompt → see preview → run → view table → toggle chart → save → re-run
- Templates are visible and usable
- Saved reports list updates after save/delete
- CSV export works for any result set
- Chart toggles between bar, line, pie correctly
- Responsive layout works on desktop

---

## Phase 9 — Starter Templates (Seed Data)

> Pre-built report templates seeded into the database.

### Tasks

- [ ] **9.1** Add to `backend/prisma/seed.ts` (or a separate seed script) — create 6 template `CustomReport` records with `isTemplate: true`:

  | #   | Template Name           | Prompt                                                                                               | Model   |
  | --- | ----------------------- | ---------------------------------------------------------------------------------------------------- | ------- |
  | 1   | Pipeline Health         | "Show all open leads grouped by stage with count, total value, and average days in stage"            | Lead    |
  | 2   | Project Profitability   | "List all completed projects with revenue, total cost, profit margin, sorted by margin ascending"    | Project |
  | 3   | Client Revenue Ranking  | "Top 20 clients ranked by lifetime revenue, include health score, project count, and segment"        | Client  |
  | 4   | Overdue Projects        | "Projects past their estimated due date that are still active, sorted by how overdue they are"       | Project |
  | 5   | Stalled Leads           | "Leads with no activity logged in the last 30 days, showing company, stage, value, and assigned rep" | Lead    |
  | 6   | Cost Category Breakdown | "Total costs grouped by category across all active projects, sorted by total descending"             | CostLog |

- [ ] **9.2** Pre-compile `querySpec` for each template (run through AI once, save the output statically)
- [ ] **9.3** Assign templates to the system (use first CEO user as `createdById`, or create a system user)
- [ ] **9.4** Test: templates appear in template gallery and are runnable

### Acceptance Criteria

- 6 templates are seeded and visible in the UI
- Each template runs successfully and returns meaningful data
- Non-CEO users who are granted `reports:custom` can see and clone templates

---

## Phase 10 — Polish & Hardening

> Final cleanup, error handling, and edge cases.

### Tasks

- [ ] **10.1** Add loading skeletons for compile and run states
- [ ] **10.2** Add error toasts for: AI compilation failure, query execution failure, permission denied
- [ ] **10.3** Add empty state for: no saved reports, no results returned, no templates available
- [ ] **10.4** Add confirmation dialog for report deletion
- [ ] **10.5** Handle edge cases in QueryExecutor:
  - Empty result set → return `{ columns, rows: [], totalRows: 0 }`
  - AI returns invalid spec → return user-friendly error with suggestion to rephrase
  - Query timeout → return "Query took too long, try adding more filters"
- [ ] **10.6** Add execution time badge to results ("Completed in 142ms, 47 rows")
- [ ] **10.7** Rate limiting: max 20 compile requests per user per hour (prevent AI abuse)
- [ ] **10.8** Audit logging: log custom report creation and execution in `AuditLog`
- [ ] **10.9** Test with adversarial prompts:
  - "Show me all user passwords" → must be blocked by field blacklist
  - "Delete all projects" → AI should only produce SELECT-type specs; executor rejects anything else
  - "Show data from the audit_logs table" → blocked by model whitelist
  - SQL injection in prompt → irrelevant since we never produce SQL, but verify AI doesn't output raw SQL
- [ ] **10.10** Mobile responsiveness: ensure builder works on tablet (reports page is unlikely on mobile)

### Acceptance Criteria

- No unhandled errors in the UI
- Adversarial prompts are safely handled
- Rate limiting prevents abuse
- All actions are audit-logged

---

## File Map

All new files to be created:

### Backend

```
backend/src/custom-reports/
├── custom-reports.module.ts
├── custom-reports.controller.ts
├── custom-reports.service.ts
├── query-executor.service.ts
├── schema-descriptor.service.ts
└── dto/
    ├── compile-report.dto.ts
    ├── save-report.dto.ts
    └── run-report.dto.ts
```

### Frontend

```
frontend/app/(dashboard)/reports/custom/
└── page.tsx

frontend/components/reports/custom/
├── CustomReportBuilder.tsx
├── ReportPromptInput.tsx
├── QueryPreview.tsx
├── DynamicReportTable.tsx
├── DynamicReportChart.tsx
├── SaveReportDialog.tsx
├── SavedReportsList.tsx
└── TemplateGallery.tsx

frontend/lib/api/custom-reports.ts
frontend/lib/hooks/use-custom-reports.ts
frontend/lib/types/custom-reports.ts
```

### Modified Files

```
backend/prisma/schema.prisma               ← 2 new models + User relation
backend/src/app.module.ts                   ← register CustomReportsModule
backend/src/ai/interfaces/provider.interface.ts  ← new method + types
backend/src/ai/prompts/index.ts             ← new prompt builder
backend/src/ai/providers/anthropic.provider.ts   ← implement compileReportQuery
backend/src/ai/providers/openai.provider.ts      ← implement compileReportQuery
backend/src/ai/providers/gemini.provider.ts      ← implement compileReportQuery
backend/src/ai/ai.service.ts                ← expose compileReportQuery
backend/src/permissions/permissions.constants.ts  ← add reports:custom
backend/prisma/seed.ts                      ← template seed data
frontend/components/layout/Sidebar.tsx       ← add nav item (or equivalent)
frontend/lib/types.ts                        ← or new types file
```

---

## Progress Tracker

| Phase     | Description                 | Status      | Tasks Done |
| --------- | --------------------------- | ----------- | ---------- |
| 1         | Schema & Data Layer         | Not Started | 0/5        |
| 2         | Schema Descriptor Service   | Not Started | 0/5        |
| 3         | AI Integration              | Not Started | 0/8        |
| 4         | Query Executor Service      | Not Started | 0/10       |
| 5         | Custom Reports Module       | Not Started | 0/6        |
| 6         | Permissions & RBAC          | Not Started | 0/5        |
| 7         | Frontend: API Client        | Not Started | 0/3        |
| 8         | Frontend: Report Builder UI | Not Started | 0/10       |
| 9         | Starter Templates           | Not Started | 0/4        |
| 10        | Polish & Hardening          | Not Started | 0/10       |
| **Total** |                             |             | **0/66**   |
