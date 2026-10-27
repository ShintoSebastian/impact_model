# IMPACT Model — Antigravity Prompt Library

> **Developer & Architect Prompt Catalog**  
> **Target Audience:** Developers, Technical Leads, and Antigravity AI Agents  
> **Purpose:** Pre-engineered, high-accuracy prompts for extending, modifying, testing, and deploying the IMPACT Model application.

---

## Index of Prompts

1. [Prompt 1: Understanding Existing Architecture](#prompt-1-understanding-existing-architecture)
2. [Prompt 2: Implementing a New Business Requirement](#prompt-2-implementing-a-new-business-requirement)
3. [Prompt 3: Updating Frontend Pages, Components, and Forms](#prompt-3-updating-frontend-pages-components-and-forms)
4. [Prompt 4: Adding or Modifying Backend REST APIs](#prompt-4-adding-or-modifying-backend-rest-apis)
5. [Prompt 5: Modifying Prisma Models and Database Schema Safely](#prompt-5-modifying-prisma-models-and-database-schema-safely)
6. [Prompt 6: Modifying Opportunity Registration & Review Workflows](#prompt-6-modifying-opportunity-registration--review-workflows)
7. [Prompt 7: Updating CRM & HRMS Integrations](#prompt-7-updating-crm--hrms-integrations)
8. [Prompt 8: Modifying Email Notifications & SMTP Templates](#prompt-8-modifying-email-notifications--smtp-templates)
9. [Prompt 9: Performing Bug Fixes and Regression Testing](#prompt-9-performing-bug-fixes-and-regression-testing)
10. [Prompt 10: Conducting Security & Segregation of Duties Audits](#prompt-10-conducting-security--segregation-of-duties-audits)
11. [Prompt 11: Generating Release Packages and Deployment Builds](#prompt-11-generating-release-packages-and-deployment-builds)

---

### Prompt 1: Understanding Existing Architecture

```markdown
Review the current IMPACT Model codebase and explain how the [SPECIFIC FEATURE, e.g. Review Board / Email Dispatcher / Lead Registration] is implemented.
1. Inspect the relevant files in `src/components/`, `src/types.ts`, and `server/src/index.ts`.
2. Trace the data flow from user interaction to backend database persistence.
3. List any dependencies, state variables, and API endpoints involved.
4. Do NOT make any changes to the code; provide a concise architectural breakdown with file and line references.
```

---

### Prompt 2: Implementing a New Business Requirement

```markdown
I need to implement the following new requirement in the IMPACT Model application:
Requirement: [DESCRIBE REQUIREMENT, e.g., "Add an 'Estimated Deal Value (USD)' field to the opportunity submission form and show it in the Review Board details panel."]

Instructions:
1. First inspect `server/prisma/schema.prisma`, `server/src/index.ts`, `src/types.ts`, and the affected frontend components.
2. Outline the exact implementation plan across database, backend API, and frontend UI.
3. Implement minimal, surgical changes that preserve all existing business rules (including Segregation of Duties).
4. Run `npx prisma db push` if the schema is updated, and verify both `npm run build` commands.
5. Provide a summary of all modified files, line numbers, and functions.
```

---

### Prompt 3: Updating Frontend Pages, Components, and Forms

```markdown
I need to update the frontend component `[COMPONENT NAME, e.g. EmployeePortal.tsx / StakeholderDashboard.tsx]`:
Requested Change: [DESCRIBE UI CHANGE, e.g., "Add validation to require phone numbers to have at least 10 digits."]

Instructions:
1. View the component code and understand its current state and props.
2. Apply the modification using Tailwind CSS and Lucide React icons, adhering to NeST Digital design standards.
3. Ensure no existing layout or responsive styling is broken.
4. Run `npm run build` in the root directory to confirm zero TypeScript compilation errors.
```

---

### Prompt 4: Adding or Modifying Backend REST APIs

```markdown
I need to [ADD / MODIFY] a backend endpoint in `server/src/index.ts`:
Endpoint: `[METHOD] /api/[PATH]`
Objective: [DESCRIBE API PURPOSE, e.g., "Export submissions as JSON report for HR analytics"]

Instructions:
1. Inspect the authentication middleware `authenticateToken` and ensure this endpoint is properly secured.
2. If role-based access is required, enforce it using `req.user.role`.
3. Use Prisma client to query or update the database safely.
4. Add robust error handling with appropriate HTTP status codes (400, 401, 403, 404, 500).
5. Run `npm run build` in `server/` to verify TypeScript types.
```

---

### Prompt 5: Modifying Prisma Models and Database Schema Safely

```markdown
I need to update the database schema in `server/prisma/schema.prisma`:
Schema Change: [DESCRIBE CHANGE, e.g., "Add an optional field 'clientIndustry' String? to the Submission model."]

Instructions:
1. Inspect `server/prisma/schema.prisma` and make the required model update.
2. Run `npx prisma generate` in `server/`.
3. Run `npx prisma db push` to synchronize SQLite without data loss.
4. Update `src/types.ts` and the backend endpoints in `server/src/index.ts` to support the new field.
5. Run `npm run build` in both client and server to verify type safety.
```

---

### Prompt 6: Modifying Opportunity Registration & Review Workflows

```markdown
I need to adjust the opportunity review workflow:
Workflow Change: [DESCRIBE CHANGE, e.g., "Allow reviewers to add a private internal review note visible only to other reviewers."]

CRITICAL GOVERNANCE CONSTRAINT:
- The Segregation of Duties policy MUST remain strictly intact: submitters can NEVER validate, reject, or approve their own leads.
- Keep the 4-step CRM pipeline stepper aligned: Lead Registered -> Opportunity Accepted -> Proposal In Progress -> Deal Won / Deal Lost.
- Verify that `isSelfSubmission` check is preserved in both frontend and backend.
```

---

### Prompt 7: Updating CRM & HRMS Integrations

```markdown
I need to update the integration logic for [HRMS API / CRM API]:
Integration Change: [DESCRIBE CHANGE, e.g., "Support a new CRM status 'Under Negotiation' and map it to Proposal In Progress."]

Instructions:
1. Inspect `server/src/index.ts` where `CORPORATE_API_URL` or `CRM_API_URL` are queried.
2. Update the mapping functions (`mapCorporateEmployeeData` or CRM stage progression).
3. Ensure graceful fallbacks exist if the external API returns an error or timeout.
4. Verify that diagnostic test endpoints (`/api/test-corporate-api` or `/api/test-crm-api`) remain functional.
```

---

### Prompt 8: Modifying Email Notifications & SMTP Templates

```markdown
I need to modify the email notification for `[NOTIFICATION TYPE, e.g. Submitter Confirmation / Reviewer Mailer / Clarification Request]`:
Requested Update: [DESCRIBE UPDATE, e.g., "Include the client website and assigned BU sales person in the email body."]

Instructions:
1. Inspect `buildReviewerEmailContent` or `buildSubmitterEmailContent` in `server/src/index.ts`.
2. Update both the HTML version and plain-text fallback string.
3. Verify that email audit logging in `EmailLog` records the updated subject and body.
4. Test in `src/components/EmailSimulator.tsx` so the in-app Outbox correctly parses and displays the new details.
```

---

### Prompt 9: Performing Bug Fixes and Regression Testing

```markdown
We encountered an issue: [DESCRIBE BUG, e.g., "When searching for an employee name with mixed case, the review list doesn't match."]

Instructions:
1. Inspect the relevant filtering and query code.
2. Identify the root cause without making assumptions.
3. Apply a targeted fix using case-insensitive normalization (`.toLowerCase().trim()`).
4. Perform regression testing on related search fields (Impact ID, Client Name, Status).
5. Run `npm run build` on both frontend and backend.
```

---

### Prompt 10: Conducting Security & Segregation of Duties Audits

```markdown
Conduct a thorough security and governance audit on the IMPACT Model codebase:
Audit Focus:
1. Segregation of Duties: Verify that a submitter cannot approve their own lead via direct URL `/review/:id`, direct REST API calls (`PATCH /api/submissions/:id`), or reviewer mailer notifications.
2. Authentication: Ensure all `/api/*` endpoints (except login and diagnostic tests) require valid JWT bearer tokens.
3. Input Sanitization: Ensure text areas and inputs prevent script injection.
4. Environment Secrets: Confirm zero hardcoded secrets exist in the source code.
Report findings and implement necessary fixes.
```

---

### Prompt 11: Generating Release Packages and Deployment Builds

```markdown
Compile and prepare a production release package for deployment to IIS and NSSM:
1. Run `npm run build` in root to generate `dist/` with `web.config`.
2. Run `npm run build` in `server/` to compile `server/dist/`.
3. Assemble the deployment package according to `DEPLOYMENT_GUIDE.md`.
4. Create a timestamped release zip archive in `release/`.
5. Verify that the zip contains `frontend/`, `backend/`, and `DEPLOYMENT.md` with zero sensitive credentials.
```
