# Claude Code Guide — Service Item Sync Fixes (Follow-Up)

**Purpose:** Fix and harden the QuickBooks Service Item sync. Separate from the main QB fixes guide which is already in progress.
**Context:** CRM `ServiceItem` records sync to QuickBooks as Service-type items (Sales & Get Paid → Products & Services → Service). Two issues need attention.

---

## Before You Start

1. Read `backend/src/quickbooks/quickbooks-sync.service.ts` — find the `findOrCreateQbItem()` method (or whatever method handles creating new QB Items during invoice creation and during the `POST /quickbooks/sync/service-items` endpoint).
2. Read `backend/src/quickbooks/quickbooks.service.ts` — check if invoice creation also calls into item creation and whether it sets `Type` explicitly.
3. Read the `ServiceItem` model in `backend/prisma/schema.prisma` (~line 927) to understand what fields exist on the CRM side.
4. Read `backend/src/quickbooks/quickbooks-webhook.service.ts` to see which entity types are already handled in the webhook dispatcher — you'll need to add `Item` handling.
5. Read the existing `pullQbCustomers()` method in `quickbooks-sync.service.ts` as a reference for how inbound sync is structured — the service item pull should follow the same pattern.

---

## Fix A — Explicitly Set `Type: 'Service'` on Item Creation

**Priority:** 🔴 High — items may be created as the wrong type
**File:** `backend/src/quickbooks/quickbooks-sync.service.ts`

### Problem

When creating a new QuickBooks Item via the API, the code may not be explicitly setting `Type: 'Service'` on the request payload. QuickBooks has multiple item types (Service, Inventory, NonInventory, Bundle, Group) and the API default behavior can vary. If the type isn't set explicitly, items could be created as the wrong type, which affects how they appear in the QB UI and how they behave on invoices (Inventory items require quantity on hand, asset accounts, etc.).

### What to do

1. Find every code path that creates a QB Item — this includes:
   - `findOrCreateQbItem()` (called during invoice creation)
   - The handler for `POST /quickbooks/sync/service-items` (bulk push of CRM ServiceItems)
   - Any other method that POSTs to the QB `/item` endpoint

2. In each of those code paths, verify the request payload sent to QB's API. Look for the body object that gets POSTed. It should look something like:

   ```typescript
   {
     Name: serviceItem.name,
     Type: 'Service',              // ← Verify this is present
     IncomeAccountRef: { value: accountId, name: accountName },
     // possibly Description, UnitPrice, etc.
   }
   ```

3. If `Type: 'Service'` is missing from any of these payloads, add it. This ensures the item appears under the correct category in QuickBooks (Products & Services → Service) and matches what the client expects to see when they manually create a service item through the QB UI.

4. If the code currently sets a different type (e.g., `'NonInventory'`), change it to `'Service'` — the client has confirmed they are using Service-type items.

5. Also verify that `Description` is being passed if it exists on the CRM `ServiceItem` model. QB Service items support a description field that appears on invoices, and it should be synced if available.

### Verification

- After the fix, trigger a service item sync (via `POST /quickbooks/sync/service-items` or by creating an invoice that forces item creation).
- Log into QuickBooks Online → Sales & Get Paid → Products & Services.
- Confirm the newly created items show as type "Service" (not "Inventory" or "Non-inventory").
- Confirm the name and description match what's in the CRM.

---

## Fix B — Add Bidirectional Service Item Sync (QB → CRM Pull)

**Priority:** 🟡 Medium — currently one-way only
**Files:** `backend/src/quickbooks/quickbooks-sync.service.ts`, `backend/src/quickbooks/quickbooks.controller.ts`, `backend/src/quickbooks/quickbooks-webhook.service.ts`, `frontend/components/admin/QuickBooksView.tsx`

### Problem

Service item sync is CRM → QB only. If someone on the team creates a new Service directly in QuickBooks (Products & Services → New → Service), it never comes back into the CRM. This means:

- Service items created in QB can't be used on CRM quotes.
- The two systems drift apart over time.
- Users who manage their service catalog in QB have to manually duplicate everything in the CRM.

### What to do

#### Step 1: Add the pull method in the sync service

1. In `quickbooks-sync.service.ts`, add a new method `pullQbServiceItems()`. Model it on `pullQbCustomers()` — same structure, different entity.

2. The method should:

   ```
   Query QB: SELECT * FROM Item WHERE Type = 'Service' AND Active = true STARTPOSITION {n} MAXRESULTS 100
     (paginate using the same pattern as other QB queries)

     For each QB Service Item:
       1. Look for CRM ServiceItem with matching qbItemId
       2. If not found, fall back to exact name match (case-insensitive)
       3. If matched and qbItemId is missing → patch qbItemId onto the CRM ServiceItem
       4. If matched → update CRM ServiceItem fields from QB:
            - name (from QB Item Name)
            - description (from QB Item Description, if the CRM model has this field)
            - unitPrice (from QB Item UnitPrice, if the CRM model has this field)
       5. If no match at all → create new CRM ServiceItem with:
            - name = QB Item Name
            - description = QB Item Description
            - unitPrice = QB Item UnitPrice
            - qbItemId = QB Item Id
       6. Write QuickBooksSync log entry (direction: QB_TO_CRM, entityType: Item)
   ```

3. **Only pull Service-type items.** The `WHERE Type = 'Service'` filter in the query is critical — don't pull Inventory, NonInventory, or Bundle items into the CRM.

4. Handle the case where a QB item name conflicts with an existing CRM ServiceItem that was manually created. The name-based fallback match handles this — it links them rather than creating a duplicate. Log when this linkage happens so it's auditable.

#### Step 2: Update the sync endpoint to be bidirectional

1. The existing `POST /quickbooks/sync/service-items` endpoint currently only pushes. Update it to run both directions:
   - First, pull QB Service items into CRM (`pullQbServiceItems`)
   - Then, push unlinked CRM ServiceItems to QB (existing `pushCrmServiceItems` logic)

   This matches how `POST /quickbooks/sync/clients` handles bidirectional customer sync.

2. Alternatively, if you prefer separate endpoints, add a new endpoint `POST /quickbooks/sync/service-items/pull`. But the bidirectional approach in a single call is more consistent with the existing customer sync pattern.

#### Step 3: Add webhook handling for Item events

1. Open `quickbooks-webhook.service.ts` and find the entity type dispatcher (where it handles `Customer`, `Invoice`, `Payment` events).

2. Add handling for `Item` events:

   ```
   Item changed/created:
     → Re-fetch item from QB
     → If item Type !== 'Service' → skip (we only care about Service items)
     → Find matching CRM ServiceItem by qbItemId
     → If found → update name, description, unitPrice from QB
     → If not found → create new CRM ServiceItem
     → Write QuickBooksSync log entry

   Item deleted:
     → Find CRM ServiceItem by qbItemId
     → Set ServiceItem.qbItemId = null (unlink without deleting, same pattern as customer deletion)
     → Write QuickBooksSync log entry
   ```

3. Make sure the webhook handler filters on `Type = 'Service'` after re-fetching the item. The webhook event doesn't include the item type — you need to fetch it and check.

#### Step 4: Update the frontend sync button

1. In `frontend/components/admin/QuickBooksView.tsx`, the service items sync button (added by the previous guide) should already point to `POST /quickbooks/sync/service-items`. Since the endpoint now runs bidirectional sync, update the button label and tooltip:
   - Label: "Sync Service Items" (not "Push Service Items to QB")
   - Tooltip/description: "Syncs service items in both directions — pulls new QB services into the CRM and pushes CRM service items to QB."

### Verification

- **Pull test:** Create a new Service item directly in QuickBooks (Products & Services → New → Service). Trigger the sync. Confirm it appears in the CRM.
- **Push test:** Create a new ServiceItem in the CRM that doesn't exist in QB. Trigger the sync. Confirm it appears in QB as a Service-type item.
- **Linkage test:** Create a Service item in both systems with the same name but not yet linked. Trigger the sync. Confirm they get linked (qbItemId set) rather than duplicated.
- **Webhook test:** Edit a Service item's description in QB. Confirm the webhook updates the CRM record.
- **Delete test:** Delete a Service item in QB. Confirm the CRM record is unlinked (qbItemId set to null) but not deleted.
- **Type filter test:** Create an Inventory-type item in QB. Confirm it does NOT get pulled into the CRM.

---

## Interaction with Main Fixes Guide

- **Fix 1 (hardcoded income account):** If that fix hasn't landed yet, the push direction of service item sync is still broken. Fix A here ensures the type is correct but the income account issue is the more critical problem. Both fixes need to ship together.
- **Fix 8 (missing frontend button):** If the button was already added by the previous guide, just update its label per Step 4 above. If not, add it fresh with the bidirectional label.
- **Fix 2 (RBAC):** The updated sync endpoint should be gated behind the `quickbooks:sync` permission, same as other sync routes. If RBAC was already applied by the previous guide, no change needed.
