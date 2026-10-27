# IMPACT Model — Testing & Quality Assurance Guide

> **Test Strategy:** Functional, Integration, Security, and Regression Testing  
> **Audience:** QA Engineers, Developers, and Antigravity Automated Verification Agents

---

## 1. Quality Assurance Test Matrix

| Test Suite | Scope | Target Layer | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-01: Submitter Flow** | Lead creation & tracking | UI (`/submit`, `/home`) + API (`POST /api/submissions`) | Opportunity registered, `IM-YYYYMMDD-XXX` generated, visible in "My Opportunities". |
| **TC-02: Reviewer Decision (Validate)** | Validation to CRM | UI (`/reviewer`) + API (`PATCH /api/submissions/:id`) | Status updates to `Validated`, advances to `Lead Registered`, CRM webhook invoked. |
| **TC-03: Reviewer Decision (Reject)** | Rejection with reason | UI (`/reviewer`) + API (`PATCH /api/submissions/:id`) | Mandatory reason required; status updates to `Closed - Not Valid`. |
| **TC-04: Clarification Loop** | Query & employee response | UI (`/reviewer` & `/home`) | Bi-directional communication; submitter replies from `/home`. |
| **TC-05: Segregation of Duties** | Four-Eyes Principle enforcement | UI + API (`GET`, `PATCH`) | Submitter CANNOT validate self-leads; UI buttons disabled; API returns 403. |
| **TC-06: SLA Overdue Badging** | SLA monitoring | UI (`StakeholderDashboard.tsx`) | Leads > 7 working days old display amber `⚠️ SLA Warning Status` badge. |
| **TC-07: Post-Deal Won Rewards** | Employee Recognition | UI (`/reviewer`) + API (`POST /api/submissions/:id/reward`) | Tiers 1/2/3 granted; email dispatched; commendation recorded. |
| **TC-08: Authentication & Fallback** | Login resilience | API (`POST /api/auth/login`) | Authenticates via HRMS; falls back to local DB if HRMS unavailable. |
| **TC-09: Notification Audit** | SMTP and Outbox logging | UI (`/outbox`) + API (`GET /api/email-logs`) | All emails recorded in `EmailLog` table with status `SENT_TO_SMTP` or `QUEUED`. |

---

## 2. Step-by-Step Functional Test Procedures

### Test Case 1: Submitter Opportunity Registration
1. Log in as a submitter (e.g., `dummy.employee@nestgroup.net`).
2. Navigate to **Submit Opportunity** (`/submit`).
3. Fill in mandatory fields:
   - **Client Name:** `Acme Global Corp`
   - **Has Contact:** Toggle `Yes` → Enter contact name, phone, email.
   - **Opportunity Title:** `Cloud Migration Modernization`
   - **Detailed Description:** `Comprehensive cloud migration opportunity across 5 regions.`
4. Click **Submit Opportunity**.
5. **Verification:**
   - Redirects to `/home` with success notification.
   - Intelligence ID follows format: `IM-YYYYMMDD-XXX`.
   - Card appears in "My Opportunities" list with status `Opportunity Accepted` (or `Lead Registered`).
   - Automated confirmation email logged in `/outbox`.

---

### Test Case 2: Leadership Review & Validation
1. Log in as an assigned reviewer (e.g., `dummy.manager@nestgroup.net`).
2. Navigate to **Review Board** (`/reviewer`).
3. Locate the pending lead in the **Pending Actions** queue.
4. Click **Validate**.
5. Confirm the pre-action dialog: `✓ Yes, Validate Lead`.
6. **Verification:**
   - Status updates to `Validated`.
   - After CRM sync, status advances to `Lead Registered`.
   - Submitter receives validation notification.
   - Lead transitions from Pending queue to Reviewed History list.

---

### Test Case 3: Rejection with Mandatory Reason
1. Open a pending submission in the Review Board.
2. Click **Reject**.
3. Verify that the **Confirm Rejection** button is disabled until text is typed into the reason textarea.
4. Enter reason: `"Does not meet current strategic vertical focus."`
5. Click **Confirm Rejection** and accept confirmation modal.
6. **Verification:**
   - Status updates to `Closed - Not Valid`.
   - Reason is recorded in the submission and logged in `StatusHistory`.

---

### Test Case 4: Clarification Loop
1. As a reviewer, open a pending submission and click **Request Clarification**.
2. Enter query: `"Please provide expected budget timeline."` Click **Send Request**.
3. Status changes to `Clarification Requested`.
4. Log in as the submitter on `/home`.
5. Open the lead modal → Notice the blue clarification alert box with reply textarea.
6. Enter reply: `"Timeline is Q3 2026."` and submit.
7. **Verification:** Reviewer is notified; submission updates with clarification response.

---

## 3. Strict Security & Segregation of Duties Tests

### Test SOD-1: UI Button Enforcement on Self-Submissions
1. Log in as a user who is both a Submitter and a BU Head (e.g., `ajish@nestgroup.net`).
2. Submit a lead from `/submit`.
3. Note the generated ID (e.g. `IM-20261020-001`).
4. Navigate directly to `/review/IM-20261020-001`.
5. **Expected Result:**
   - The **"Validate"**, **"Reject"**, and **"Request Clarification"** buttons are **disabled** (`cursor-not-allowed`, slate grey styling).
   - Clicking the buttons does nothing.

### Test SOD-2: API Protection on Self-Submissions
1. Open Postman or terminal curl.
2. Send a `PATCH` request to `/api/submissions/:id` using the submitter's own JWT token:
   ```bash
   curl -X PATCH http://localhost:7000/api/submissions/IM-20261020-001 \
     -H "Authorization: Bearer <SUBMITTER_JWT_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"status": "Validated"}'
   ```
3. **Expected Result:**
   - Server returns **HTTP 403 Forbidden**.
   - Response body:
     ```json
     { "error": "Segregation of Duties: You cannot review, validate, or reject your own submission." }
     ```

### Test SOD-3: Review Board List Exclusion
1. While logged in as `ajish@nestgroup.net`, check the Review Board queue (`/reviewer`).
2. **Expected Result:** Leads submitted by `ajish@nestgroup.net` do **not** appear in the pending list and are excluded from the reviewer badge count.

---

## 4. Pre-Release Regression Checklist

Before deploying any update to production, verify all items:
- [ ] `npm run build` succeeds on frontend with 0 TypeScript/lint errors.
- [ ] `npm run build` succeeds on `server/` with 0 TypeScript errors.
- [ ] Segregation of Duties checks pass (SOD-1, SOD-2, SOD-3).
- [ ] All 4 CRM lifecycle stages render correctly in the stepper.
- [ ] Review SLA calculation correctly triggers at 7 working days.
- [ ] Submitter confirmation emails link to `/?redirect=/status/<ID>`.
- [ ] Reviewer notification emails link to `/?redirect=/review/<ID>`.
- [ ] Outbox simulator (`/outbox`) displays all email categories accurately.
- [ ] Database backup taken prior to deployment.
