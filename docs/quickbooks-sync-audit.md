# QuickBooks Customer Sync — Audit & Flow Documentation

**Audited:** 2026-03-20
**Scope:** Customer/client bidirectional sync, invoice flow, payment status, expense sync, webhook handling

---

## TL;DR

The QuickBooks integration is **substantially built**. OAuth, bidirectional customer sync, invoice creation, payment status polling, expense sync, and webhook handling are all implemented and wired up. There are **10 gaps** documented at the bottom — the most critical are a hardcoded income account ID in service item sync, no RBAC on QB routes, and no scheduled/automatic sync.

---

## Module Structure

```
backend/src/quickbooks/
├── quickbooks.module.ts          # NestJS module, exports QuickBooksService
├── quickbooks.controller.ts      # All REST endpoints under /quickbooks
├── quickbooks.service.ts         # OAuth, token management, invoice creation, payment sync
├── quickbooks-sync.service.ts    # Bidirectional customer/expense/service-item sync
├── quickbooks-webhook.service.ts # Intuit webhook receiver + HMAC verification
└── dto/
    ├── qb-callback.dto.ts        # OAuth callback query params
    └── qb-create-invoice.dto.ts  # Invoice creation request body
```

Registered in `backend/src/app.module.ts` (lines 38, 80).

---

## Database Models

### On the `Client` model (`schema.prisma` ~line 180)
```prisma
qbCustomerId  String?   // QuickBooks Customer ID — the primary sync key
```

### On the `Quote` model (`schema.prisma` ~line 584)
```prisma
qbInvoiceId     String?   // QuickBooks Invoice ID
qbPaymentStatus String?   // "unpaid" | "paid" | "partial" | "voided"
```

### On the `ServiceItem` model (`schema.prisma` ~line 927)
```prisma
qbItemId  String?   // QB Item ID — set after first push to QB
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
| `errorMessage` | Populated on failure |

---

## API Routes

All routes are under `/quickbooks`. Auth is `JwtAuthGuard` unless noted.

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/quickbooks/connect` | Public | Redirects browser to Intuit OAuth consent screen |
| GET | `/quickbooks/callback` | Public | Receives auth code from Intuit, exchanges for tokens |
| DELETE | `/quickbooks/disconnect` | JWT | Marks connection inactive |
| GET | `/quickbooks/status` | JWT | Returns connection state + last sync time |
| POST | `/quickbooks/sync/clients` | JWT | Runs bidirectional customer sync |
| POST | `/quickbooks/sync/payments` | JWT | Pulls QB payments → updates quote payment status |
| POST | `/quickbooks/sync/expenses` | JWT | Pulls QB Bills → creates CRM CostLog entries |
| POST | `/quickbooks/sync/service-items` | JWT | Pushes CRM ServiceItems → QB Items |
| GET | `/quickbooks/sync/history` | JWT | Returns last N sync log entries |
| POST | `/quickbooks/invoices` | JWT | Creates a QB Invoice from a CRM Quote |
| POST | `/quickbooks/webhook` | Public (HMAC) | Receives real-time Intuit webhook events |

---

## Flow 1: OAuth Connect

```
User clicks "Connect QuickBooks Online"
  → Browser navigates to GET /quickbooks/connect
  → Backend builds Intuit authorization URL (scope: accounting)
  → Browser redirects to Intuit consent screen
  → User approves
  → Intuit redirects to GET /quickbooks/callback?code=...&realmId=...
  → Backend POSTs to Intuit token endpoint to exchange code for tokens
  → Backend fetches company info from QB companyinfo endpoint
  → QuickBooksConnection upserted in DB (realmId, tokens, companyName, isActive=true)
  → Backend redirects browser to /admin/quickbooks?connected=true
```

**Token refresh:** `getValidAccessToken()` checks token expiry before every QB API call. If expiry is within 5 minutes, it automatically refreshes using the stored refresh token and updates the DB record.

---

## Flow 2: Bidirectional Customer Sync

Triggered by `POST /quickbooks/sync/clients` (manual button in admin UI).

### Direction 1: QB → CRM (`pullQbCustomers`)

```
Query QB: SELECT * FROM Customer WHERE Active = true MAXRESULTS 1000
  For each QB Customer:
    1. Look for CRM client with matching qbCustomerId
    2. If not found, fall back to email match
    3. If matched and qbCustomerId is missing → patch it onto the CRM client
    4. If no match at all → create new CRM Client with:
         name = QB Customer DisplayName
         email = QB Customer PrimaryEmailAddr
         segment = 'SMB' (default)
         industry = 'Surveying' (default)
    5. Write QuickBooksSync log entry (direction: QB_TO_CRM)
```

### Direction 2: CRM → QB (`pushCrmClients`)

```
Query CRM: SELECT clients WHERE qbCustomerId IS NULL LIMIT 100
  For each unlinked CRM Client:
    1. POST to QB /customer with DisplayName, email, phone, address
    2. Store returned QB Customer.Id as qbCustomerId on CRM client
    3. Write QuickBooksSync log entry (direction: CRM_TO_QB)
```

**Match key:** `qbCustomerId` on the `Client` model is the permanent link between a CRM customer and a QB Customer entity.

---

## Flow 3: Invoice Creation

Triggered when a user clicks "Send to QuickBooks" on a Quote (in `QuotesTable` or `QuoteViewDialog`).

```
POST /quickbooks/invoices  { quoteId }
  → Fetch Quote + lineItems + Client from DB
  → Verify Client.qbCustomerId is set (error if not — must sync customers first)
  → For each line item:
      Call findOrCreateQbItem(name):
        1. Query QB: SELECT * FROM Item WHERE Name = '{name}'
        2. If found → use existing QB Item.Id
        3. If not found → look up income account (QB_INCOME_ACCOUNT_ID env var,
           or query QB for first Income account as fallback)
           → POST to QB /item to create it
           → Store QB Item.Id as ServiceItem.qbItemId
  → POST to QB /invoice:
       CustomerRef: { value: client.qbCustomerId }
       Line items: [{ Amount, Description, SalesItemLineDetail: { ItemRef } }]
       DueDate: quote.validUntil
  → Update Quote: qbInvoiceId = returned QB Invoice.Id, qbPaymentStatus = 'unpaid'
  → Write QuickBooksSync log entry
  → Button is disabled in UI once qbInvoiceId is set (prevents duplicate invoices)
```

---

## Flow 4: Payment Status Sync

Triggered by `POST /quickbooks/sync/payments`.

```
Query QB: SELECT * FROM Payment MAXRESULTS 100
  For each QB Payment:
    → Find CRM Quote by qbInvoiceId matching payment's LinkedTxn
    → Update Quote.qbPaymentStatus = 'paid'
    → Call recalculateClientRevenue(clientId):
         SUM all quotes where qbPaymentStatus = 'paid' for this client
         → Update Client.lifetimeRevenue
```

Also triggered by webhook events (see Flow 6).

---

## Flow 5: Expense Sync

Triggered by `POST /quickbooks/sync/expenses`.

```
Query QB: SELECT * FROM Bill MAXRESULTS 100
  For each QB Bill line item (AccountBasedExpenseLineDetail):
    → Dedup key: '{billId}-{lineId}' checked against QuickBooksSync
    → If already synced → skip
    → If bill has a CustomerRef:
        Find CRM Client by qbCustomerId
        Find most recently updated non-closed Project for that client
        Create CostLog: { projectId, amount, description, date }
        Update Project.totalCost += amount
    → Write QuickBooksSync log entry
```

> ⚠️ **Gap:** If a client has multiple active projects the expense gets attached to the most recently updated one — not necessarily the correct one.

---

## Flow 6: Webhook (Real-Time Events)

Intuit POSTs to `POST /quickbooks/webhook` when QB entities change.

```
1. Verify HMAC-SHA256 signature against QB_WEBHOOK_VERIFIER_TOKEN
   (if token not set → skip verification with a warning, dev mode only)

2. Dispatch by entity type:

   Customer changed/created:
     → Re-fetch customer from QB
     → Find matching CRM Client by qbCustomerId
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
     → Trigger full syncPayments() run
```

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `QB_CLIENT_ID` | ✅ | Intuit OAuth app client ID |
| `QB_CLIENT_SECRET` | ✅ | Intuit OAuth app client secret |
| `QB_REDIRECT_URI` | ✅ | Must match exactly what's registered in the Intuit developer portal |
| `QB_ENVIRONMENT` | ✅ | `sandbox` or `production` |
| `QB_WEBHOOK_VERIFIER_TOKEN` | ✅ (prod) | HMAC secret from Intuit webhook settings |
| `QB_INCOME_ACCOUNT_ID` | ⚠️ Recommended | QB account ID for income. Falls back to a live API query if unset |
| `FRONTEND_URL` | ✅ | Used in OAuth callback redirect to frontend |

> ⚠️ **None of these are documented in `.env.example`.**

**Current `.env` state:** Production credentials are active (`QB_ENVIRONMENT=production`). Sandbox credentials are commented out. `QB_INCOME_ACCOUNT_ID` is not set.

---

## Frontend Integration Points

| Location | What it does |
|---|---|
| `frontend/app/(dashboard)/admin/quickbooks/page.tsx` | Admin page shell |
| `frontend/components/admin/QuickBooksView.tsx` | Full QB admin UI: connect, disconnect, sync buttons, history table |
| `frontend/components/quotes/QuotesTable.tsx` | "Send to QuickBooks" button per quote row |
| `frontend/components/quotes/QuoteViewDialog.tsx` | "Send to QuickBooks" in quote detail view |
| `frontend/lib/types.ts` | `Client.qbCustomerId`, `Quote.qbInvoiceId`, `Quote.qbPaymentStatus`, `ServiceItem.qbItemId` |
| `frontend/components/layout/AppSidebar.tsx` | QB nav item under Admin section |

The frontend polls `/quickbooks/status` every 30 seconds to keep the connection status badge live.

---

## Gaps & Issues

### 🔴 High Priority

**1. Hardcoded income account in service item sync**
`quickbooks-sync.service.ts` ~line 277:
```ts
IncomeAccountRef: { value: '1', name: 'Services' }
```
QB account IDs are company-specific integers. `'1'` is not guaranteed to be valid. This will silently fail or attach items to the wrong account in production. Fix: use `QB_INCOME_ACCOUNT_ID` env var here, same as `quickbooks.service.ts` does.

**2. No RBAC permission guard on QB routes**
All JWT-protected QB routes bypass the `PermissionsGuard`. Any authenticated user can trigger syncs, create invoices, or disconnect QB regardless of their role. Should gate behind permissions like `quickbooks:sync`, `quickbooks:manage`.

**3. `QB_INCOME_ACCOUNT_ID` not set in `.env`**
Every new QB item creation triggers an extra live API call to find an income account. Set this once to avoid the overhead and fragility.

### 🟡 Medium Priority

**4. No scheduled/automatic sync**
All syncs are manual. The `ScheduleModule` is already imported in `app.module.ts` but no cron jobs are configured for QB. Payment status and customer sync should run automatically (e.g., every hour).

**5. Payment sync limited to 100 records**
`syncPayments()` uses `MAXRESULTS 100` with no pagination. Older payments on a mature QB account will never be fetched.

**6. Expense-to-project matching is fragile**
Expenses are attached to "the most recently updated non-closed project" for a customer. With multiple active projects this will be wrong. Needs a more explicit mapping mechanism.

**7. "Sync Service Items" button missing in frontend**
`POST /quickbooks/sync/service-items` is implemented on the backend but there is no UI button in `QuickBooksView.tsx`. The only way to trigger it is via direct API call.

### 🟢 Low Priority

**8. `QB_INCOME_ACCOUNT_ID` not in `.env.example`**
None of the six QB environment variables are documented in `.env.example`. Any new developer setting up the project would have no reference.

**9. No workflow engine integration**
`QuickBooksModule` exports `QuickBooksService` for future use, but the `WorkflowsModule` doesn't yet consume it. Auto-creating a QB invoice when a Quote is accepted (workflow trigger) is not wired up.

**10. QB Time / TSheets sync not started**
Referenced in `apex-relon-strategy.md` as a planned feature (time entries sync to QB Time). Not yet implemented.

---

## What Works Today (End-to-End)

1. ✅ Connect QB account via OAuth 2.0 (production credentials active)
2. ✅ Manual bidirectional customer sync — new CRM customers pushed to QB, new QB customers pulled into CRM, `qbCustomerId` set as the permanent link
3. ✅ Create QB invoice from a CRM Quote — requires customer to be synced first
4. ✅ Payment status reflected back on Quote (`qbPaymentStatus`) and rolled up to `Client.lifetimeRevenue`
5. ✅ Real-time webhook events update customer email/phone and invoice payment status
6. ✅ Expense sync creates CostLog entries and updates project cost totals
7. ✅ Full admin UI with connection status, sync history, and manual sync triggers
8. ✅ "Send to QuickBooks" button on every Quote in the quotes table and detail view
