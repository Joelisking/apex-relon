# QuickBooks Integration — System Audit

**Last updated:** 2026-03-20
**Scope:** Full QB integration — OAuth, customer sync, invoice flow, payment sync, expense sync, service item sync, webhooks, scheduling, RBAC, frontend

---

## TL;DR

The QuickBooks integration is **fully operational and hardened**. All 8 high/medium priority issues from the original audit have been resolved. The module has been fully refactored from two monolithic services into a clean, single-responsibility architecture. Two low-priority items remain open (workflow engine auto-invoice wiring, QB Time/TSheets).

---

## Module Structure

```
backend/src/quickbooks/
├── api/
│   └── qb-api.client.ts              # Standalone fetch wrapper for QB REST API
├── controllers/
│   ├── qb-connection.controller.ts   # GET connect, GET callback, DELETE disconnect, GET status
│   ├── qb-sync.controller.ts         # POST sync/{clients,payments,expenses,service-items}, GET sync/history
│   ├── qb-invoice.controller.ts      # POST invoices
│   └── qb-webhook.controller.ts      # POST webhook (HMAC-verified)
├── services/
│   ├── qb-token.service.ts           # Token management, auto-refresh, income account resolution
│   ├── qb-connection.service.ts      # OAuth flow, connection status, sync history
│   ├── qb-payment.service.ts         # Payment sync (paginated), revenue recalculation
│   ├── qb-invoice.service.ts         # Invoice creation from CRM Quote
│   ├── qb-customer-sync.service.ts   # Bidirectional customer sync (paginated)
│   ├── qb-expense-sync.service.ts    # Expense sync (paginated, ambiguity detection)
│   └── qb-item-sync.service.ts       # Bidirectional service item sync (paginated)
├── quickbooks-webhook.service.ts     # Webhook dispatcher: Customer, Invoice, Payment, Item
├── quickbooks-schedule.service.ts    # Cron: payments every 30min, customers every 2h
└── quickbooks.module.ts              # Registers all 9 services + 4 controllers
```

**Deleted (monoliths):** `quickbooks.service.ts`, `quickbooks-sync.service.ts`, `quickbooks.controller.ts`

---

## Database Models

### On the `Client` model
```prisma
qbCustomerId  String?   // QB Customer ID — primary sync key
```

### On the `Quote` model
```prisma
qbInvoiceId     String?   // QB Invoice ID
qbPaymentStatus String?   // "unpaid" | "paid" | "partial" | "voided"
```

### On the `ServiceItem` model
```prisma
qbItemId  String?   // QB Item ID — set after first sync to QB
```

### `QuickBooksConnection` model
Single-row table (single-tenant). Stores OAuth tokens for the connected QB company.

| Field | Purpose |
|---|---|
| `realmId` | Unique Intuit company identifier |
| `accessToken` | Bearer token for QB API calls |
| `refreshToken` | Used to obtain new access tokens |
| `tokenExpiry` | Auto-refresh triggered when < 5 min remaining |
| `companyName` | Display name fetched from QB |
| `connectedAt` | When the OAuth flow was completed |
| `lastSyncAt` | Updated after each sync run |
| `isActive` | Soft-disconnect flag |

### `QuickBooksSync` model
Append-only audit log for every sync event.

| Field | Values |
|---|---|
| `direction` | `QB_TO_CRM` or `CRM_TO_QB` |
| `entityType` | `Customer`, `Invoice`, `Payment`, `Expense`, `Item` |
| `status` | `success`, `error`, `skipped` |
| `externalId` | QB entity ID |
| `internalId` | CRM entity ID |
| `errorMessage` | Populated on failure or skip reason |

---

## API Routes

All routes are under `/quickbooks`. RBAC is enforced via the global `PermissionsGuard` + `@Permissions()` decorator.

| Method | Route | Auth | Permission | Purpose |
|---|---|---|---|---|
| GET | `/quickbooks/connect` | Public | — | Redirects to Intuit OAuth consent screen |
| GET | `/quickbooks/callback` | Public | — | Receives auth code, exchanges for tokens |
| DELETE | `/quickbooks/disconnect` | JWT | `quickbooks:manage` | Marks connection inactive |
| GET | `/quickbooks/status` | JWT | `quickbooks:manage` | Returns connection state + last sync time |
| POST | `/quickbooks/sync/clients` | JWT | `quickbooks:sync` | Bidirectional customer sync |
| POST | `/quickbooks/sync/payments` | JWT | `quickbooks:sync` | Pulls QB payments → updates quote payment status |
| POST | `/quickbooks/sync/expenses` | JWT | `quickbooks:sync` | Pulls QB Bills → creates CRM CostLog entries |
| POST | `/quickbooks/sync/service-items` | JWT | `quickbooks:sync` | Bidirectional service item sync |
| GET | `/quickbooks/sync/history` | JWT | `quickbooks:manage` | Returns last N sync log entries |
| POST | `/quickbooks/invoices` | JWT | `quickbooks:invoices` | Creates QB Invoice from a CRM Quote |
| POST | `/quickbooks/webhook` | Public (HMAC) | — | Receives real-time Intuit webhook events |

**Permissions defined in** `permissions.constants.ts`:
- `quickbooks:manage` — connect, disconnect, view status/history (Admin only)
- `quickbooks:sync` — trigger any sync (Admin only)
- `quickbooks:invoices` — create invoices (Admin only)

---

## Flow 1: OAuth Connect

```
User clicks "Connect QuickBooks Online"
  → Browser navigates to GET /quickbooks/connect
  → QbConnectionService builds Intuit authorization URL (scope: accounting)
  → Browser redirects to Intuit consent screen
  → User approves
  → Intuit redirects to GET /quickbooks/callback?code=...&realmId=...
  → Backend POSTs to Intuit token endpoint to exchange code for tokens
  → Backend fetches company info from QB companyinfo endpoint
  → QuickBooksConnection upserted in DB (realmId, tokens, companyName, isActive=true)
  → Backend redirects browser to /admin/quickbooks?connected=true
```

**Token refresh:** `QbTokenService.getValidAccessToken()` checks expiry before every QB API call. If expiry is within 5 minutes, it automatically refreshes and updates the DB record.

**Income account resolution:** `QbTokenService.getIncomeAccountRef(qbClient)` is called wherever a QB Item needs to be created. It checks `QB_INCOME_ACCOUNT_ID` env var first; if unset, queries QB for the first active Income-type account as a fallback. Used by both `QbInvoiceService` and `QbItemSyncService`.

---

## Flow 2: Bidirectional Customer Sync

Triggered by `POST /quickbooks/sync/clients` (manual button) or the 2-hour cron job.

### Direction 1: QB → CRM (`pullQbCustomers`)

```
Paginated query: SELECT * FROM Customer WHERE Active = true
  STARTPOSITION {n} MAXRESULTS 1000  (loop until page < 1000)
  For each QB Customer:
    1. Look for CRM client with matching qbCustomerId
    2. If not found, fall back to email match
    3. If matched and qbCustomerId missing → patch it onto the CRM client
    4. If no match → create new CRM Client:
         name = QB Customer DisplayName
         email = QB Customer PrimaryEmailAddr
         segment = 'SME' (default)
    5. Write QuickBooksSync log entry (QB_TO_CRM)
```

### Direction 2: CRM → QB (`pushCrmClients`)

```
Query CRM: clients WHERE qbCustomerId IS NULL LIMIT 100
  For each unlinked CRM Client:
    1. POST to QB /customer with DisplayName, email, phone, address
    2. Store returned QB Customer.Id as qbCustomerId
    3. Write QuickBooksSync log entry (CRM_TO_QB)
```

**Response:** `{ pulled: number, pushed: number }`

---

## Flow 3: Invoice Creation

Triggered when a user clicks "Send to QuickBooks" on a Quote.

```
POST /quickbooks/invoices  { quoteId }
  → Fetch Quote + lineItems + Client from DB
  → Verify Client.qbCustomerId is set (error if not synced)
  → For each line item:
      findOrCreateQbItem(qbClient, name, unitPrice):
        1. Query QB: SELECT * FROM Item WHERE Name = '{name}'
        2. If found → use existing QB Item.Id
        3. If not found → call getIncomeAccountRef(), POST to QB /item
             with Type: 'Service', Name, UnitPrice, IncomeAccountRef
           → Store QB Item.Id as ServiceItem.qbItemId
  → POST to QB /invoice:
       CustomerRef: { value: client.qbCustomerId }
       Line items: [{ Amount, Description, SalesItemLineDetail: { ItemRef } }]
       DueDate: quote.validUntil
  → Update Quote: qbInvoiceId, qbPaymentStatus = 'unpaid'
  → Write QuickBooksSync log entry
  → "Send to QB" button disabled in UI once qbInvoiceId is set
```

---

## Flow 4: Payment Status Sync

Triggered by `POST /quickbooks/sync/payments` (manual) or the 30-minute cron job.

```
Paginated query: SELECT * FROM Payment
  STARTPOSITION {n} MAXRESULTS 100  (loop until page < 100)
  For each QB Payment:
    → Find CRM Quote by qbInvoiceId matching payment's LinkedTxn
    → Update Quote.qbPaymentStatus = 'paid'
    → recalculateClientRevenue(clientId):
         SUM all quotes where qbPaymentStatus = 'paid'
         → Update Client.lifetimeRevenue
```

Also triggered by Payment webhook events (see Flow 6).

**Response:** `{ updated: number }`

---

## Flow 5: Expense Sync

Triggered by `POST /quickbooks/sync/expenses` (manual only — not scheduled due to matching fragility).

```
Paginated query: SELECT * FROM Bill
  STARTPOSITION {n} MAXRESULTS 100  (loop until page < 100)
  For each QB Bill line item (AccountBasedExpenseLineDetail):
    → Dedup key: '{billId}-{lineId}' checked against QuickBooksSync
    → If already synced → skip
    → If bill has CustomerRef:
        Find CRM Client by qbCustomerId
        Find active (non-closed) Projects for that client
        If exactly 1 active project → auto-assign CostLog to it
        If 0 active projects → log with projectId = null
        If >1 active projects → skip with status 'skipped',
          errorMessage: "multiple active projects — manual assignment required"
        Create CostLog: { projectId, amount, description, date }
        Update Project.totalCost += amount (if assigned)
    → Write QuickBooksSync log entry
```

> ⚠️ **Known limitation:** Expenses for clients with multiple active projects are flagged as `skipped` and require manual assignment. Long-term fix: support QB Classes as a project mapping mechanism.

**Response:** `{ created: number, skipped: number, errors: number }`

---

## Flow 6: Service Item Sync

Triggered by `POST /quickbooks/sync/service-items` (manual button).

### Direction 1: QB → CRM (`pullQbServiceItems`)

```
Paginated query: SELECT * FROM Item WHERE Type = 'Service' AND Active = true
  STARTPOSITION {n} MAXRESULTS 100  (loop until page < 100)
  For each QB Service Item:
    1. Look for CRM ServiceItem with matching qbItemId
    2. If not found, fall back to case-insensitive name match
       (if matched this way → patch qbItemId and log the linkage)
    3. If matched → update name, description, unitPrice from QB
    4. If no match → create new CRM ServiceItem with all QB fields + qbItemId
    5. Write QuickBooksSync log entry (QB_TO_CRM)
```

### Direction 2: CRM → QB (`pushCrmServiceItems`)

```
Query CRM: ServiceItems WHERE isActive = true AND qbItemId IS NULL LIMIT 100
  For each unlinked ServiceItem:
    1. Call getIncomeAccountRef()
    2. POST to QB /item:
         Type: 'Service'
         Name: serviceItem.name
         Description: serviceItem.description
         UnitPrice: serviceItem.unitPrice
         IncomeAccountRef: { value, name }
    3. Store returned QB Item.Id as qbItemId
    4. Write QuickBooksSync log entry (CRM_TO_QB)
```

**Response:** `{ pulled: number, synced: number, skipped: number }`

---

## Flow 7: Webhook (Real-Time Events)

Intuit POSTs to `POST /quickbooks/webhook` when QB entities change.

```
1. Verify HMAC-SHA256 signature against QB_WEBHOOK_VERIFIER_TOKEN
   (if token not set → skip verification with a warning, dev mode only)

2. Dispatch by entity type:

   Customer changed/created:
     → Re-fetch customer from QB
     → Find CRM Client by qbCustomerId
     → Patch email + phone from QB onto CRM Client

   Customer deleted:
     → Find CRM Client by qbCustomerId
     → Set Client.qbCustomerId = null (unlinks without deleting)

   Invoice changed:
     → Re-fetch invoice from QB
     → Find CRM Quote by qbInvoiceId
     → Derive status: Balance==0 → 'paid', Balance<TotalAmt → 'partial', else 'unpaid'
     → Update Quote.qbPaymentStatus

   Invoice deleted:
     → Find CRM Quote by qbInvoiceId
     → Set Quote.qbPaymentStatus = 'voided'

   Payment changed:
     → Trigger full QbPaymentService.syncPayments()

   Item changed/created:
     → Re-fetch item from QB
     → If item.Type !== 'Service' → skip (non-service items are ignored)
     → Find CRM ServiceItem by qbItemId
     → If found → update name, description, unitPrice
     → If not found → create new CRM ServiceItem
     → Write QuickBooksSync log entry

   Item deleted:
     → Find CRM ServiceItem by qbItemId
     → Set ServiceItem.qbItemId = null (unlinks without deleting)
     → Write QuickBooksSync log entry
```

---

## Flow 8: Scheduled Sync

Handled by `QuickBooksScheduleService` using `@nestjs/schedule`.

| Cron | Frequency | What runs |
|---|---|---|
| `*/30 * * * *` | Every 30 minutes | `QbPaymentService.syncPayments()` |
| `0 */2 * * *` | Every 2 hours | `QbCustomerSyncService.syncClients()` |

Both jobs check `QbConnectionService.getStatus()` first — if QB is disconnected, the job silently skips without logging errors. Each job is wrapped in try/catch so a failure doesn't prevent the next scheduled run.

> Expense sync and service item sync are **not scheduled** — expense matching requires human review for ambiguous cases, and service items change infrequently enough that manual sync is sufficient.

---

## Environment Variables

All documented in `backend/.env.example`.

| Variable | Required | Purpose |
|---|---|---|
| `QB_CLIENT_ID` | ✅ | Intuit OAuth app client ID |
| `QB_CLIENT_SECRET` | ✅ | Intuit OAuth app client secret |
| `QB_REDIRECT_URI` | ✅ | Must match exactly what's registered in the Intuit developer portal |
| `QB_ENVIRONMENT` | ✅ | `sandbox` or `production` |
| `QB_WEBHOOK_VERIFIER_TOKEN` | ✅ (prod) | HMAC secret from Intuit webhook settings |
| `QB_INCOME_ACCOUNT_ID` | ⚠️ Recommended | QB Income account ID for item creation. Falls back to a live API query if unset — set this to avoid latency and fragility |
| `FRONTEND_URL` | ✅ | Used in OAuth callback redirect to frontend |

---

## Frontend Integration Points

| Location | What it does |
|---|---|
| `frontend/app/(dashboard)/admin/quickbooks/page.tsx` | Admin page shell |
| `frontend/components/admin/QuickBooksView.tsx` | Thin orchestrator — assembles QB admin UI |
| `frontend/components/admin/quickbooks/QbConnectionCard.tsx` | Connection status, connect/disconnect UI |
| `frontend/components/admin/quickbooks/QbSyncActionsCard.tsx` | Manual sync buttons (Customers, Payments, Expenses, Service Items) |
| `frontend/components/admin/quickbooks/QbSyncHistoryCard.tsx` | Last 20 sync events table |
| `frontend/components/admin/quickbooks/qb-api.ts` | `qbFetch` utility + `QbStatus`/`SyncLog` interfaces |
| `frontend/components/quotes/QuotesTable.tsx` | "Send to QuickBooks" button per quote row |
| `frontend/components/quotes/QuoteViewDialog.tsx` | "Send to QuickBooks" in quote detail view |
| `frontend/lib/types.ts` | `Client.qbCustomerId`, `Quote.qbInvoiceId`, `Quote.qbPaymentStatus`, `ServiceItem.qbItemId` |
| `frontend/components/layout/AppSidebar.tsx` | QB nav item under Admin section |

The frontend polls `/quickbooks/status` every 30 seconds to keep the connection status badge live.

---

## What Works Today (End-to-End)

1. ✅ Connect QB account via OAuth 2.0
2. ✅ Bidirectional customer sync — paginated, email fallback matching, `qbCustomerId` as permanent link
3. ✅ Bidirectional service item sync — paginated, name fallback matching, `Type: 'Service'` enforced
4. ✅ Create QB Invoice from a CRM Quote — all line items synced as Service-type QB Items
5. ✅ Payment status reflected back on Quote and rolled up to `Client.lifetimeRevenue`
6. ✅ Expense sync with ambiguity detection — multi-project clients flagged as `skipped` for manual review
7. ✅ Real-time webhook events: Customer, Invoice, Payment, Item (all handled)
8. ✅ Scheduled automatic sync — payments every 30 min, customers every 2 hours
9. ✅ RBAC on all JWT-protected routes (`quickbooks:manage`, `quickbooks:sync`, `quickbooks:invoices`)
10. ✅ Income account resolved via env var with live API fallback — no hardcoded IDs
11. ✅ All QB env vars documented in `.env.example`
12. ✅ Full admin UI — connection card, 4 sync buttons, history table

---

## Remaining Open Items

### 🟢 Low Priority

**1. Workflow engine auto-invoice**
`QuickBooksModule` exports `QbInvoiceService` and `QbConnectionService` for consumption. The `WorkflowsModule` doesn't yet import them. Wiring a "Quote Accepted → Create QB Invoice" workflow action requires reading the workflow trigger/action registration pattern and adding a new action handler. Preconditions to check: QB connected, client has `qbCustomerId`, quote doesn't already have `qbInvoiceId`.

**2. QB Time / TSheets sync**
Referenced in `apex-relon-strategy.md`. Requires a separate OAuth scope (`com.intuit.quickbooks.timetracking`), a time entry model in the CRM schema, and a mapping between CRM projects and QB Time jobs. Not yet started.

**3. Expense manual assignment UI**
Expenses for clients with multiple active projects are logged as `skipped` with `status: 'skipped'` in `QuickBooksSync`. There is no UI yet to surface these for manual project assignment. A filter on the QB sync history table (or a dedicated "pending expenses" section in the admin view) would complete this flow.
