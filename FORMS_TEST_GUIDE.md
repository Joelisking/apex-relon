# Web-to-Lead Forms — Test Guide

## Prerequisites
- Backend running: `cd backend && npm run start:dev`
- Frontend running: `cd frontend && npm run dev`
- Logged in as CEO or ADMIN (needs `settings:manage` permission)

---

## 1. Admin — Create a Form

1. Go to **Admin → Lead Forms** (sidebar)
2. Click **New Form**
3. Step 1 — Fill in:
   - Name: `Website Contact Form`
   - Description: `General enquiry form`
   - Target Stage: pick any stage (e.g. "New")
   - Assign To: pick yourself
   - Leave Active: on
4. Click **Next**
5. Step 2 — Default fields should be pre-populated (Full Name, Email, Phone, Company, Message)
   - Add a field: click **Add Field**, set label `Project Budget`, type `Text`
   - Mark Email as Required (should already be on)
6. Click **Create**

**Expected:** Form appears in the list with 0 submissions, Active badge, and your name as assignee.

---

## 2. Admin — Copy Public Link

1. In the forms table, click the **link icon** (Copy Link) on your new form
2. **Expected:** Toast "Link copied" appears

---

## 3. Public Form — Load & Submit

1. Open a new incognito/private browser tab
2. Paste the copied link (e.g. `http://localhost:3000/forms/XXXX-XXXX-...`)
3. **Expected:** Clean centered form page loads with your form's name, no sidebar, no login required
4. Fill in:
   - Full Name: `Test User`
   - Email: `test@example.com`
   - Company: `Acme Corp`
   - Message: `Testing the form`
5. Click **Submit**
6. **Expected:** Success confirmation message appears

---

## 4. Verify Lead Created

1. Go to **Leads** in the main nav
2. Look for `Test User` / `Acme Corp`
3. **Expected:**
   - Lead exists in the target stage you set
   - Source = `Web Form`, Channel = `Website`
   - Assigned to the user you selected

---

## 5. Verify Notification

1. Check the bell icon (top right) while logged in as the assigned user
2. **Expected:** Notification "New lead from web form — Test User submitted 'Website Contact Form'"

---

## 6. Analytics

1. Go back to **Admin → Lead Forms**
2. Click the **chart icon** on the form
3. **Expected:**
   - Total Submissions: 1
   - Won Leads: 0 (0%)
   - Bar chart shows today's date with 1 submission

---

## 7. Embed Code

1. Click the **embed icon** on the form
2. Switch between **iFrame** and **JavaScript** tabs
3. Click **Copy Code** on each
4. **Expected:** Snippet contains your form's API key and the correct origin URL

---

## 8. Edit Form

1. Click the **pencil icon** on the form
2. Change the name to `Website Contact Form v2`
3. Toggle **Active** to off
4. Save

**Expected:** List updates with new name and Inactive badge.

---

## 9. Inactive Form — Public Link

1. Revisit the public form URL in the incognito tab (refresh)
2. **Expected:** Error message "Form not found or is no longer active"

---

## 10. Delete Form

1. Click the **trash icon** on the form
2. Confirm in the alert dialog
3. **Expected:** Form removed from list; submissions and lead remain (cascade doesn't delete leads)

---

## Edge Cases to Check

| Scenario | Expected |
|----------|----------|
| Submit with required field empty | Error: "Missing required fields: Full Name" |
| Invalid API key in URL (`/forms/bad-key`) | Error state on public page |
| Non-admin user visits Admin → Lead Forms | Nav item hidden (no `settings:manage` permission) |
| Submit form twice with same email | Two separate leads created (no dedup by design) |
