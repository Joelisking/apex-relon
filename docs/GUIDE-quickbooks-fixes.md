# Claude Code Guide — QuickBooks Integration Fixes

**Purpose:** Fix all 10 documented gaps in the QuickBooks ↔ CRM integration.
**Source audit:** `quickbooks-sync-audit.md` (2026-03-20)
**Codebase:** NestJS backend (`backend/src/quickbooks/`), Next.js frontend (`frontend/`)

---

## Before You Start

1. Read the full audit document at the project root: `quickbooks-sync-audit.md`
2. Familiarize yourself with the module structure:
   ```
   backend/src/quickbooks/
   ├── quickbooks.module.ts
   ├── quickbooks.controller.ts
   ├── quickbooks.service.ts
   ├── quickbooks-sync.service.ts
   ├── quickbooks-webhook.service.ts
   └── dto/
   ```
3. Read the existing Prisma schema at `backend/prisma/schema.prisma` — specifically the `Client`, `Quote`, `ServiceItem`, `QuickBooksConnection`, and `QuickBooksSync` models.
4. Read `backend/src/app.module.ts` to understand how modules are registered and how `ScheduleModule` is already imported.
5. Read `backend/src/quickbooks/quickbooks.controller.ts` to see which guards are currently applied and how routes are structured.
6. Read `backend/src/quickbooks/quickbooks-sync.service.ts` fully — this is where the most critical fixes live.
7. Read `backend/src/quickbooks/quickbooks.service.ts` to understand how it correctly handles `QB_INCOME_ACCOUNT_ID` (this is the reference implementation for the fix in the sync service).
8. Read `frontend/components/admin/QuickBooksView.tsx` to understand the existing admin UI before adding the missing button.
9. Check how `PermissionsGuard` is used on other controllers in the project — search for `@UseGuards(PermissionsGuard)` and `@RequirePermissions` across the backend to understand the existing RBAC pattern.
10. Check `.env.example` at the project root to see what's already documented there.

---

## Fix 1 — Hardcoded Income Account in Service Item Sync

**Priority:** 🔴 Critical — deploy same day
**File:** `backend/src/quickbooks/quickbooks-sync.service.ts` (~line 277)

### Problem

There is a hardcoded `IncomeAccountRef: { value: '1', name: 'Services' }` in the service item sync logic. QuickBooks account IDs are company-specific. `'1'` is not guaranteed to map to anything valid. This will silently create items attached to the wrong GL account or fail outright.

### What to do

1. Open `backend/src/quickbooks/quickbooks.service.ts` and find the method that handles `QB_INCOME_ACCOUNT_ID` for invoice line item creation. It uses `process.env.QB_INCOME_ACCOUNT_ID` with a fallback that queries QB's API for the first Income-type account. This is the correct pattern.

2. Open `backend/src/quickbooks/quickbooks-sync.service.ts` and find the hardcoded `IncomeAccountRef: { value: '1', name: 'Services' }` (around line 277).

3. Replace the hardcoded value with the same pattern used in `quickbooks.service.ts`:
   - Check `process.env.QB_INCOME_ACCOUNT_ID` first.
   - If not set, query the QB API for an active Income account: `SELECT * FROM Account WHERE AccountType = 'Income' AND Active = true MAXRESULTS 1`
   - Use the returned account's `Id` and `Name` for `IncomeAccountRef`.
   - If neither the env var nor the API query yields a result, throw a clear error rather than using a fallback that could be wrong.

4. To avoid code duplication, consider extracting the income account resolution logic into a shared private method (or a utility on `QuickBooksService` that `QuickBooksSyncService` can call). If `QuickBooksSyncService` already injects `QuickBooksService`, add a method like `getIncomeAccountRef()` on `QuickBooksService` and call it from both places. If it doesn't inject it, add the injection.

5. Add a log warning when `QB_INCOME_ACCOUNT_ID` is not set and the fallback API query is being used, so operators know to configure it.

### Verification

- Confirm no other instances of hardcoded QB account IDs exist in the codebase. Search for `value: '1'` and `IncomeAccountRef` across all files.
- Ensure the new code path is covered: when env var is set, when env var is not set (API fallback), and when neither works (error thrown).

---

## Fix 2 — Add RBAC Permission Guards to QB Routes

**Priority:** 🔴 Critical — security gap
**File:** `backend/src/quickbooks/quickbooks.controller.ts`

### Problem

All JWT-protected QuickBooks routes bypass `PermissionsGuard`. Any authenticated user can trigger syncs, create invoices, or disconnect the QuickBooks connection regardless of their role.

### What to do

1. First, study the existing RBAC pattern in the project:
   - Search the backend for `@UseGuards(PermissionsGuard)` and `@RequirePermissions` (or whatever decorator the project uses for permission-based access).
   - Identify the permissions enum or constant file where permission strings are defined.
   - Note how other controllers combine `JwtAuthGuard` with `PermissionsGuard`.

2. Define new QB-specific permissions in the permissions enum/constants file. Use these permission strings (adjust naming to match the project's existing convention):
   - `quickbooks:manage` — connect, disconnect, view status
   - `quickbooks:sync` — trigger any sync operation, view sync history
   - `quickbooks:invoices` — create invoices in QB

3. Update `quickbooks.controller.ts` to apply `PermissionsGuard` alongside `JwtAuthGuard` on all JWT-protected routes:

   | Route | Permission |
   |---|---|
   | `DELETE /quickbooks/disconnect` | `quickbooks:manage` |
   | `GET /quickbooks/status` | `quickbooks:manage` |
   | `POST /quickbooks/sync/clients` | `quickbooks:sync` |
   | `POST /quickbooks/sync/payments` | `quickbooks:sync` |
   | `POST /quickbooks/sync/expenses` | `quickbooks:sync` |
   | `POST /quickbooks/sync/service-items` | `quickbooks:sync` |
   | `GET /quickbooks/sync/history` | `quickbooks:sync` |
   | `POST /quickbooks/invoices` | `quickbooks:invoices` |

4. Do NOT add guards to the two Public routes (`/quickbooks/connect` and `/quickbooks/callback`) — these are part of the OAuth flow and must remain unauthenticated. However, consider whether `/quickbooks/connect` should require authentication so that only admins can initiate the OAuth flow. If the project's OAuth pattern for other integrations requires auth on the connect route, follow that pattern.

5. Update the project's role/permission seed data or migration to assign these new permissions to the appropriate roles (likely Admin only for `quickbooks:manage` and `quickbooks:sync`, and Admin + Manager for `quickbooks:invoices`). Follow the existing pattern for how permissions are assigned to roles in this project.

### Verification

- Test that an authenticated user WITHOUT the new permissions gets a 403 on all protected QB routes.
- Test that the OAuth flow (`/connect` and `/callback`) still works.
- Test that the webhook endpoint still works (it uses HMAC, not JWT).

---

## Fix 3 — Set `QB_INCOME_ACCOUNT_ID` in Production `.env`

**Priority:** 🔴 Critical — operational fix
**Files:** `.env`, `.env.example`

### Problem

`QB_INCOME_ACCOUNT_ID` is not set. Every new QB item creation triggers a live API call to discover an income account at runtime. This adds latency and fragility to every item sync.

### What to do

1. This is a manual/operational step — you cannot programmatically determine the correct QB Income Account ID. Add a comment in `.env.example` explaining this:

   ```env
   # QuickBooks income account ID for service item sync.
   # Find this in QuickBooks Online → Chart of Accounts → look for your primary Income account.
   # If unset, the system queries QB's API at runtime (adds latency, fragile).
   QB_INCOME_ACCOUNT_ID=
   ```

2. Log a reminder or TODO that a project admin needs to:
   - Log into QuickBooks Online
   - Navigate to Chart of Accounts
   - Find the correct Income account
   - Copy its ID and set it in the production `.env`

---

## Fix 4 — Document All QB Environment Variables in `.env.example`

**Priority:** 🟢 Low effort, high value — do alongside Fix 3
**File:** `.env.example`

### Problem

None of the six QB environment variables are documented in `.env.example`. New developers have no reference.

### What to do

1. Open `.env.example` and add a clearly labeled QuickBooks section. Use this template:

   ```env
   # ─── QuickBooks Integration ───────────────────────────────────────────
   # Register an app at https://developer.intuit.com to obtain credentials.

   # OAuth app credentials (required)
   QB_CLIENT_ID=
   QB_CLIENT_SECRET=

   # Must match exactly what is registered in the Intuit developer portal (required)
   QB_REDIRECT_URI=http://localhost:3001/quickbooks/callback

   # "sandbox" or "production" (required)
   QB_ENVIRONMENT=sandbox

   # HMAC secret from Intuit webhook settings (required in production)
   QB_WEBHOOK_VERIFIER_TOKEN=

   # QuickBooks income account ID for service item sync (recommended).
   # Find in QB Online → Chart of Accounts → your primary Income account.
   # If unset, the system queries QB's API at runtime as a fallback.
   QB_INCOME_ACCOUNT_ID=
   ```

2. Make sure the `FRONTEND_URL` variable is also documented if it isn't already, since it's used in the OAuth callback redirect.

---

## Fix 5 — Add Scheduled Automatic Sync (Cron Jobs)

**Priority:** 🟡 Medium — prevents data drift
**Files:** `backend/src/quickbooks/quickbooks-sync.service.ts` (or a new dedicated scheduler file)

### Problem

All syncs are manual-only. `ScheduleModule` is imported in `app.module.ts` but no cron jobs are configured for QB. Data drifts silently between systems.

### What to do

1. Confirm `@nestjs/schedule` is installed and `ScheduleModule` is imported in `app.module.ts`. Verify by reading `app.module.ts` and `package.json`.

2. Create a new file: `backend/src/quickbooks/quickbooks-schedule.service.ts`. This keeps scheduling concerns separate from sync logic.

3. Implement the scheduler service:

   ```typescript
   import { Injectable, Logger } from '@nestjs/common';
   import { Cron, CronExpression } from '@nestjs/schedule';
   import { QuickBooksSyncService } from './quickbooks-sync.service';
   import { QuickBooksService } from './quickbooks.service';

   @Injectable()
   export class QuickBooksScheduleService {
     private readonly logger = new Logger(QuickBooksScheduleService.name);

     constructor(
       private readonly syncService: QuickBooksSyncService,
       private readonly qbService: QuickBooksService,
     ) {}

     @Cron(CronExpression.EVERY_30_MINUTES)
     async syncPayments() {
       if (!(await this.isConnected())) return;
       this.logger.log('Scheduled payment sync starting');
       try {
         await this.syncService.syncPayments();
       } catch (error) {
         this.logger.error('Scheduled payment sync failed', error.stack);
       }
     }

     @Cron(CronExpression.EVERY_2_HOURS)
     async syncCustomers() {
       if (!(await this.isConnected())) return;
       this.logger.log('Scheduled customer sync starting');
       try {
         await this.syncService.syncClients();
       } catch (error) {
         this.logger.error('Scheduled customer sync failed', error.stack);
       }
     }

     private async isConnected(): Promise<boolean> {
       // Check if there's an active QB connection before running.
       // Use whatever method QuickBooksService exposes to check connection status.
       // If no active connection, skip silently — don't spam error logs.
       const status = await this.qbService.getConnectionStatus();
       return status?.isActive === true;
     }
   }
   ```

4. Register `QuickBooksScheduleService` as a provider in `quickbooks.module.ts`.

5. Key design decisions:
   - **Payment sync every 30 minutes** — payments affect cash flow visibility and revenue rollup.
   - **Customer sync every 2 hours** — customer data changes less frequently.
   - **Always check `isConnected()` first** — if QB is disconnected, skip silently. Don't fill logs with errors.
   - **Wrap each sync in try/catch** — a failed scheduled sync must never crash the process or block the next run.
   - **Do NOT schedule expense sync automatically** — the expense-to-project matching is too fragile right now (see Fix 7). Keep it manual until that's resolved.

6. Consider adding a `lastScheduledSyncAt` field or updating `lastSyncAt` on `QuickBooksConnection` after each scheduled run so the admin UI reflects when the last automatic sync occurred.

### Verification

- Confirm cron jobs fire by checking logs after deployment.
- Confirm that when QB is disconnected, the cron jobs skip without errors.
- Confirm that a failing sync (e.g., expired token with no refresh) logs the error but doesn't prevent the next scheduled run.

---

## Fix 6 — Add Pagination to Payment Sync

**Priority:** 🟡 Medium — silent data loss on mature accounts
**File:** `backend/src/quickbooks/quickbooks-sync.service.ts`

### Problem

`syncPayments()` queries QB with `MAXRESULTS 100` and no pagination. Older payments are silently never fetched.

### What to do

1. Find the `syncPayments()` method in `quickbooks-sync.service.ts`.

2. Replace the single query with a paginated loop. QuickBooks Online uses `STARTPOSITION` for pagination (1-indexed):

   ```typescript
   async syncPayments() {
     const pageSize = 100;
     let startPosition = 1;
     let hasMore = true;

     while (hasMore) {
       const query = `SELECT * FROM Payment STARTPOSITION ${startPosition} MAXRESULTS ${pageSize}`;
       const response = await this.queryQb(query);

       const payments = response?.QueryResponse?.Payment ?? [];

       for (const payment of payments) {
         await this.processPayment(payment);
       }

       if (payments.length < pageSize) {
         hasMore = false;
       } else {
         startPosition += pageSize;
       }
     }
   }
   ```

3. Extract the per-payment processing logic into a private `processPayment()` method if it isn't already separated. This keeps the pagination loop clean.

4. Apply the same pagination pattern to ALL other QB queries that use `MAXRESULTS` without pagination. Check:
   - `pullQbCustomers()` — currently uses `MAXRESULTS 1000`. If there are more than 1000 QB customers, this silently drops them. Add pagination.
   - `syncExpenses()` — also uses `MAXRESULTS 100`. Add pagination.
   - Any other QB query methods.

5. Add a safety limit to prevent infinite loops — cap at a maximum number of iterations (e.g., 50 pages = 5000 records). Log a warning if the cap is hit.

### Verification

- Confirm that the paginated loop correctly fetches all payments (test with a QB sandbox that has >100 payments if possible).
- Confirm the safety limit prevents runaway loops.
- Confirm other query methods are also paginated.

---

## Fix 7 — Improve Expense-to-Project Matching

**Priority:** 🟡 Medium — incorrect data assignment
**File:** `backend/src/quickbooks/quickbooks-sync.service.ts`

### Problem

When a QB Bill has a `CustomerRef`, the expense is attached to "the most recently updated non-closed project" for that client. With multiple active projects, this is effectively random and will produce incorrect project cost data.

### What to do

1. **Short-term fix (implement now):** When a client has multiple active (non-closed) projects and no explicit project mapping exists, do NOT auto-assign the expense. Instead:
   - Create the `CostLog` entry with `projectId = null` (or a dedicated "unassigned" state).
   - Write the `QuickBooksSync` log entry with `status: 'needs_review'` (add this as a new valid status if it doesn't exist).
   - Log a warning identifying the client and the expense that needs manual assignment.

2. **Schema change:** Add a `projectId` field (nullable) to the sync log or create a lightweight `PendingExpenseAssignment` model so these unmatched expenses are surfaced in the admin UI. Alternatively, if the `CostLog` model already supports `projectId = null`, use that and add a filter in the frontend to show unassigned expenses.

3. **Frontend:** In the QuickBooks admin view or a project management view, add a section or notification that shows expenses pending project assignment. This lets a user manually assign them. The exact UI location depends on what makes sense in the existing admin layout.

4. **Long-term improvement (document as a TODO, don't implement now):** Support QB Classes or Sub-customers as a project mapping mechanism. QB Classes are specifically designed for this kind of categorization. When a Bill line item has a Class, match it to a CRM project by a `qbClassId` field on the `Project` model. This is a larger feature that needs its own design.

### Verification

- Confirm that expenses for clients with a single active project still auto-assign correctly.
- Confirm that expenses for clients with multiple active projects are flagged for manual review instead of being silently misassigned.
- Confirm the sync log reflects the `needs_review` status.

---

## Fix 8 — Add "Sync Service Items" Button to Frontend

**Priority:** 🟡 Medium — feature gap
**File:** `frontend/components/admin/QuickBooksView.tsx`

### Problem

`POST /quickbooks/sync/service-items` exists on the backend but has no corresponding UI button. Admins can only trigger it via direct API call.

### What to do

1. Open `frontend/components/admin/QuickBooksView.tsx`.

2. Find where the other sync buttons are rendered (there should be buttons for "Sync Clients", "Sync Payments", "Sync Expenses").

3. Add a new button following the exact same pattern as the existing sync buttons:
   - Label: "Sync Service Items" (or "Push Service Items to QB" to clarify the direction)
   - Endpoint: `POST /quickbooks/sync/service-items`
   - Same loading state, success/error toast, and disabled-while-syncing behavior as the other buttons.
   - Add a brief description or tooltip: "Pushes CRM service items to QuickBooks as inventory items."

4. Position it logically with the other sync buttons. If the UI groups syncs by direction (inbound vs outbound), place it in the outbound/push group.

5. Apply the same RBAC permission check on the frontend that other sync buttons use (if the frontend checks permissions before rendering buttons). The required permission should be `quickbooks:sync` per Fix 2.

### Verification

- Confirm the button appears in the admin UI when connected to QB.
- Confirm it triggers the correct endpoint and shows success/error feedback.
- Confirm it respects the same permission checks as other sync buttons.

---

## Fix 9 — Wire Up Workflow Engine for Auto-Invoice on Quote Acceptance

**Priority:** 🟢 Low — feature enhancement
**Files:** `backend/src/workflows/` (or wherever `WorkflowsModule` lives), `backend/src/quickbooks/quickbooks.module.ts`

### Problem

`QuickBooksModule` exports `QuickBooksService` but the `WorkflowsModule` doesn't consume it. Auto-creating a QB invoice when a Quote is accepted is not wired up.

### What to do

1. Read the `WorkflowsModule` code to understand how workflow triggers and actions are defined. Look for:
   - How triggers are registered (e.g., "Quote status changed to Accepted")
   - How actions are registered (e.g., "Send email", "Create task")
   - The pattern for adding new action types

2. Add a new workflow action: "Create QuickBooks Invoice"
   - Import `QuickBooksModule` in `WorkflowsModule`.
   - Register a new action handler that calls `QuickBooksService.createInvoice(quoteId)`.
   - The action should check that:
     - A QB connection is active.
     - The Quote's client has a `qbCustomerId` (is already synced to QB).
     - The Quote doesn't already have a `qbInvoiceId` (prevent duplicates).
   - If any precondition fails, the action should log the failure to the workflow execution log and continue (don't block the rest of the workflow).

3. The workflow action should be opt-in — don't automatically create invoices for all accepted quotes. This should be a configurable workflow that admins can enable and attach to the "Quote Accepted" trigger.

4. Add the action to whatever action registry or enum the workflow engine uses so it appears as an available action in the workflow builder UI.

### Verification

- Confirm the new action appears in the workflow builder.
- Confirm that creating a workflow with trigger "Quote Accepted" → action "Create QuickBooks Invoice" works end-to-end.
- Confirm that if the client isn't synced to QB, the action fails gracefully with a clear message in the workflow log.
- Confirm that if the quote already has a QB invoice, the action is skipped (no duplicate).

---

## Fix 10 — QB Time / TSheets Sync (Placeholder)

**Priority:** 🟢 Low — future feature, not yet started

### Problem

Referenced in `apex-relon-strategy.md` as a planned feature but not yet implemented.

### What to do

**Do not implement this now.** Instead:

1. Create a placeholder file: `backend/src/quickbooks/quickbooks-time.service.ts` with:

   ```typescript
   import { Injectable, Logger } from '@nestjs/common';

   /**
    * Placeholder for QuickBooks Time (TSheets) integration.
    *
    * Planned features:
    * - Sync CRM time entries to QB Time
    * - Pull QB Time entries into CRM for project costing
    *
    * Prerequisites:
    * - QB Time API access (separate OAuth scope: "com.intuit.quickbooks.timetracking")
    * - Time entry model in CRM schema
    * - Mapping between CRM projects and QB Time jobs/service items
    *
    * Reference: apex-relon-strategy.md
    */
   @Injectable()
   export class QuickBooksTimeService {
     private readonly logger = new Logger(QuickBooksTimeService.name);
     // Not yet implemented
   }
   ```

2. Do NOT register this in the module yet — it's just a documentation placeholder so future developers know it's planned and what the requirements are.

---

## Post-Fix Checklist

After completing all fixes, verify the following:

- [ ] **Build passes:** `npm run build` succeeds in both `backend/` and `frontend/` with no TypeScript errors.
- [ ] **Lint passes:** Run the project's linter — no new warnings from changed files.
- [ ] **Prisma schema:** If any schema changes were made (e.g., new status enum values for `QuickBooksSync.status`), generate and apply the migration: `npx prisma migrate dev --name qb-fixes`.
- [ ] **No hardcoded QB IDs remain:** Search the entire codebase for hardcoded QuickBooks account or entity IDs.
- [ ] **Env vars documented:** `.env.example` contains all six QB variables with descriptions.
- [ ] **RBAC coverage:** Every JWT-protected QB route has `PermissionsGuard` applied.
- [ ] **Existing tests pass:** Run the full test suite. If there are integration tests for QB flows, ensure they still pass with the refactored code.
- [ ] **Manual smoke test:** If a QB sandbox is available, test the OAuth flow, a manual customer sync, invoice creation, and the new service items sync button.
