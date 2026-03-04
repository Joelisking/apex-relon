# Relon CRM — Workflow Automation Guide

Workflow Automation lets you define rules that run automatically in the background when things happen in the CRM. A rule watches for a **trigger** (an event), checks **conditions** against the entity involved, and if they match, executes one or more **actions**.

Rules run asynchronously — they never slow down the request that caused them.

---

## How It Works

```
Event occurs (e.g. lead created)
        ↓
System finds all active rules with matching trigger
        ↓
For each rule: evaluate conditions against the entity's data
        ↓
  Conditions met? → Execute actions → Log SUCCESS
  Conditions not met? → Skip → Log SKIPPED
  Action throws? → Log FAILED
```

Every execution (SUCCESS, SKIPPED, or FAILED) is recorded in the execution history log, visible per rule in Admin → Automation.

---

## Triggers

Triggers are the events that cause a rule to be evaluated. Each trigger is tied to a specific entity type.

### Real-time Triggers (fire immediately on mutation)

| Trigger | Fires when… | Entity type |
|---------|-------------|-------------|
| `LEAD_CREATED` | A new lead is added to the pipeline | Lead |
| `LEAD_UPDATED` | A lead's fields are changed (non-stage change) | Lead |
| `LEAD_STAGE_CHANGED` | A lead is moved to a different pipeline stage | Lead |
| `CLIENT_CREATED` | A new client record is created | Client |
| `CLIENT_UPDATED` | A client's fields are changed | Client |
| `PROJECT_CREATED` | A new project is created | Project |
| `PROJECT_UPDATED` | A project's fields are changed (non-status change) | Project |
| `PROJECT_STATUS_CHANGED` | A project's status changes (e.g. Planning → Active) | Project |
| `TASK_CREATED` | A new task is created | Task |
| `TASK_COMPLETED` | A task is marked as Done | Task |
| `TASK_UPDATED` | A task's fields are changed | Task |

> **Note:** `QUOTE_SENT`, `QUOTE_ACCEPTED`, and `QUOTE_REJECTED` appear in the UI builder but are not yet wired to the quotes service. Rules using these triggers will be stored but won't auto-fire yet.

### Cron Triggers (run daily at 8:00 AM)

| Trigger | What it scans |
|---------|---------------|
| `DAYS_SINCE_CONTACT` | All active leads (not Won/Lost) where `updatedAt` is older than N days. Configure N via the `days` field in conditions. |
| `TASK_DUE` | All incomplete tasks where `dueDate` falls today. |

---

## Conditions

Conditions filter which entities a rule acts on. If you add no conditions, the rule fires for **every** matching trigger event.

### Logic

- **AND** — all conditions must match
- **OR** — at least one condition must match

### Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `equals` | Exact match | `stage` equals `Won` |
| `not_equals` | Does not match | `urgency` not equals `Low` |
| `contains` | String contains substring | `notes` contains `urgent` |
| `greater_than` | Number comparison | `expectedValue` greater than `50000` |
| `less_than` | Number comparison | `expectedValue` less than `10000` |
| `is_empty` | Field is null/undefined/empty string | `assignedToId` is empty |
| `is_not_empty` | Field has a value | `email` is not empty |
| `in` | Value is one of a list (comma-separated in UI) | `stage` in `Won, Quoted` |

### Condition fields by entity type

Use these exact field names when writing conditions:

**Lead fields**
```
id, contactName, company, position, email, phone,
expectedValue, contractedValue, stage, urgency,
source, channel, notes, assignedToId, designerId, qsId,
clientId, serviceTypeId, aiRiskLevel, dealClosedAt
```

**Project fields**
```
id, name, status, contractedValue, endOfProjectValue,
riskStatus, notes, projectManagerId, designerId, qsId,
clientId, leadId, estimatedDueDate
```

**Client fields**
```
id, name, email, phone, segment, industry,
status, notes, accountManagerId
```

**Task fields**
```
id, title, description, status, priority,
dueDate, entityType, entityId, assignedToId, createdById
```

---

## Actions

Actions are what the rule does when conditions are met. A rule can have multiple actions — they run in order.

---

### `SEND_NOTIFICATION`

Sends an in-app notification (appears in the bell icon).

| Config field | Required | Description |
|---|---|---|
| `userId` | Optional | ID of the user to notify. If omitted, notifies the entity's `assignedToId`. |
| `title` | Optional | Notification title. Defaults to "Workflow Notification". |
| `message` | Required | Notification body. Supports `{{variables}}`. |

**Example config:**
```json
{
  "title": "High Priority Lead",
  "message": "New high-urgency lead from {{company}} — assigned to you."
}
```

> If neither `userId` nor `assignedToId` is present on the entity, the notification is skipped.

---

### `SEND_EMAIL`

Sends an email via the configured email provider (Resend in production).

| Config field | Required | Description |
|---|---|---|
| `to` | Required | Recipient email address. Supports `{{variables}}` e.g. `{{email}}`. |
| `subject` | Optional | Email subject. Supports `{{variables}}`. |
| `body` | Required | Plain-text email body. Supports `{{variables}}`. Line breaks are respected. |

**Example config:**
```json
{
  "to": "{{email}}",
  "subject": "Your quote has been accepted — {{company}}",
  "body": "Hi {{contactName}},\n\nThank you for accepting the quote. We will be in touch shortly."
}
```

> In development (no `RESEND_API_KEY`), emails are logged to the console instead of sent.

---

### `CREATE_TASK`

Creates a task linked to the entity that triggered the rule.

| Config field | Required | Description |
|---|---|---|
| `title` | Required | Task title. Supports `{{variables}}`. |
| `description` | Optional | Task description. |
| `priority` | Optional | `LOW`, `MEDIUM` (default), or `HIGH`. |
| `assignedToId` | Optional | User ID to assign. Falls back to entity's `assignedToId`. |
| `dueDays` | Optional | Number of days from now until due date (e.g. `3` = due in 3 days). |

**Example config:**
```json
{
  "title": "Follow up with {{company}}",
  "description": "Lead has been in Proposal stage for 7+ days without activity.",
  "priority": "HIGH",
  "dueDays": 2
}
```

---

### `UPDATE_FIELD`

Updates a specific field on the entity. Only fields on the allowlist can be updated — this prevents rules from corrupting critical data.

| Config field | Required | Description |
|---|---|---|
| `field` | Required | Field name to update (see allowlist below). |
| `value` | Required | New value to set. |

**Allowlist by entity type:**

| Entity | Updatable fields |
|--------|-----------------|
| Lead | `stage`, `urgency`, `source`, `channel`, `notes`, `assignedToId`, `designerId`, `qsId`, `expectedValue` |
| Client | `status`, `notes`, `assignedToId` |
| Project | `status`, `notes`, `riskStatus`, `assignedToId`, `designerId`, `qsId` |

Fields not on the allowlist are silently blocked and logged as a warning.

**Example config (escalate urgency):**
```json
{
  "field": "urgency",
  "value": "High"
}
```

**Example config (flag project at risk):**
```json
{
  "field": "riskStatus",
  "value": "At Risk"
}
```

---

### `ASSIGN_USER`

A shorthand action that sets `assignedToId` on the entity (equivalent to `UPDATE_FIELD` with `field: "assignedToId"`).

| Config field | Required | Description |
|---|---|---|
| `userId` | Required | The user ID to assign the entity to. |

---

## Template Variables

Both `SEND_NOTIFICATION`, `SEND_EMAIL`, and `CREATE_TASK` titles/bodies support `{{variable}}` interpolation. Variables are replaced with the corresponding field from the entity that triggered the rule.

**Syntax:** `{{fieldName}}`

**Common variables:**

For leads: `{{company}}`, `{{contactName}}`, `{{email}}`, `{{phone}}`, `{{stage}}`, `{{urgency}}`, `{{expectedValue}}`

For projects: `{{name}}`, `{{status}}`, `{{contractedValue}}`, `{{riskStatus}}`

For clients: `{{name}}`, `{{email}}`, `{{segment}}`

For tasks: `{{title}}`, `{{priority}}`, `{{status}}`

If a variable doesn't exist on the entity, it is replaced with an empty string.

---

## Testing a Rule

Every rule has a **Test** button (⋯ menu → Test Rule). The test dialog lets you:

1. Select an entity type (Lead / Project / Client / Task)
2. Optionally paste a real entity ID to test against actual data
3. Click **Run Test**

The test evaluates conditions and reports whether they would pass and which actions would execute — **without actually executing anything** and without writing to the execution log.

**Result states:**
- 🟢 **Conditions Met** — the rule would fire, lists which actions would run
- 🟡 **Conditions Not Met** — the rule would be skipped for this entity
- 🔴 **Error** — something went wrong (e.g. entity ID not found)

Leaving the entity ID blank tests against an empty context — useful for checking whether a rule with `is_empty` conditions works as expected.

---

## Execution History

Click **View Execution History** (⋯ menu) on any rule to see a log of every time it ran.

| Result | Meaning |
|--------|---------|
| `SUCCESS` | Conditions matched, all actions executed |
| `SKIPPED` | Conditions did not match |
| `FAILED` | Conditions matched but an action threw an error |

Each entry shows the entity type, entity ID, result, and timestamp. Failed executions include the error message in the details.

---

## Example Rules

### 1. Notify assignee when a high-urgency lead is created
- **Trigger:** `LEAD_CREATED`
- **Conditions:** `urgency` equals `High`
- **Actions:** `SEND_NOTIFICATION` — message: `"New high-urgency lead from {{company}} requires immediate attention."`

---

### 2. Auto-escalate stale leads
- **Trigger:** `DAYS_SINCE_CONTACT`
- **Conditions:** *(none — apply to all active leads older than N days)*
- Set `days: 7` in the conditions JSON
- **Actions:**
  1. `UPDATE_FIELD` — `urgency` → `High`
  2. `CREATE_TASK` — title: `"Chase {{company}} — no contact in 7 days"`, priority: `HIGH`, `dueDays: 1`

---

### 3. Flag a project at risk when status changes
- **Trigger:** `PROJECT_STATUS_CHANGED`
- **Conditions:** `status` equals `On Hold`
- **Actions:** `UPDATE_FIELD` — `riskStatus` → `At Risk`

---

### 4. Send a welcome email when a new client is created
- **Trigger:** `CLIENT_CREATED`
- **Conditions:** `email` is not empty
- **Actions:** `SEND_EMAIL`
  - `to`: `{{email}}`
  - `subject`: `Welcome to Relon — {{name}}`
  - `body`: `Hi {{name}},\n\nWelcome aboard. Your account is now active and a member of our team will be in touch shortly.`

---

### 5. Remind assignee when a task is due today
- **Trigger:** `TASK_DUE`
- **Conditions:** `priority` equals `HIGH`
- **Actions:** `SEND_NOTIFICATION` — message: `"Reminder: task '{{title}}' is due today."`

---

### 6. Auto-assign new leads from a specific source
- **Trigger:** `LEAD_CREATED`
- **Conditions:** `source` equals `Website`
- **Actions:** `ASSIGN_USER` — `userId`: `<paste a specific user's ID>`

---

## Tips

- **Order matters** when a rule has multiple actions — they execute sequentially. If one action fails, the rest are still attempted.
- **Deactivate, don't delete** rules you want to pause temporarily. Deleted rules lose their execution history.
- **`DAYS_SINCE_CONTACT` fires daily at 8AM.** If you create or activate such a rule at 9AM, it won't run until the next morning.
- **Condition field names are case-sensitive** and must match the database column names exactly (camelCase, e.g. `assignedToId` not `assigned_to_id`).
- A rule with **no conditions** will fire for every entity that matches the trigger — use this intentionally (e.g. "log every new lead") or add conditions to narrow scope.
- **Test before activating** any rule that sends emails or creates tasks, to avoid flooding users with automated messages.
