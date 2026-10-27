# NeST Digital — IMPACT Model Master Specification & Architecture Template
> **Version:** 3.0 | **Generated for:** Antigravity AI Engineering & Corporate Governance  
> **Repository:** `ShintoSebastian/impact_model`  
> **Purpose:** This document is the master specification and prompt template for the NeST Digital IMPACT Portal. Any manager, senior lead, or developer can edit the business rules, roles, workflows, or SLA values in this template and feed it to Antigravity to automatically update the application.

---

## 1. Executive Summary & Objective
The **IMPACT Model Portal** is an enterprise opportunity identification, lead tracking, and employee recognition engine built for NeST Digital. It enables all employees to identify and register business leads, while routing reviews to designated leaders (BU Heads, Reporting Managers, Project Managers, HRBP, and Sales), ensuring strict corporate governance, CRM synchronization, and milestone-based employee recognition.

---

## 2. Core Stakeholders & Role Matrix

| Stakeholder Role | Access & Scope | Review Capability | Self-Review Allowed? |
| :--- | :--- | :--- | :--- |
| **Employee (Submitter)** | Personal Submissions (`/home`), Lead Registration (`/submit`) | View personal status & respond to clarifications | ❌ No |
| **Reviewer / PM / RM** | Review Board (`/reviewer`), Lead Decision Engine (`/review/:id`) | Validate, Reject, Request Clarification | ❌ No (Cannot review own leads) |
| **BU Head (Business Unit Head)** | Review Board (`/reviewer`), Full BU Visibility | Validate, Reject, Request Clarification for BU | ❌ Strictly No (Segregation of Duties) |
| **Admin / Executive Management** | Global Visibility, System Configurations, Database Viewer (`/db`) | Global validation & override capabilities | ❌ No (Cannot validate self-leads) |

---

## 3. Strict Governance: Segregation of Duties (Four-Eyes Principle)
To maintain corporate compliance and audit integrity:
* **The Rule:** A submitter **cannot** approve, validate, reject, or request clarification on their own submitted lead, even if they hold a leadership role (e.g., BU Head or Vice President).
* **Routing:** When a BU Head submits a lead, review responsibility shifts to their **Reporting Manager** (e.g., Nazneen Jehangir) or an independent reviewer.
* **System Safeguards:**
  * Self-submissions are filtered out from the Review Board pending queue (`GET /api/submissions?mode=review`).
  * The backend returns **HTTP 403 Forbidden** on any self-approval attempt.
  * In the UI, the **Validate**, **Reject**, and **Request Clarification** buttons are strictly disabled (`disabled={true}`) on self-submitted leads.

---

## 4. Lead Lifecycle & Pipeline Progression Stages

The platform features a standardized 4-step lifecycle stepper aligned with the live corporate CRM:

```
[ Step 1: Lead Registered ]
          │
          ▼
[ Step 2: Opportunity Accepted ]  ──► (Rejected ──► "Closed - Not Valid")
          │
          ▼
[ Step 3: Proposal In Progress ]  ──► (RFP Received, Commercial Phase, Negotiation)
          │
          ▼
[ Step 4: Final Outcome ]         ──► "Deal Won" (Eligible for Reward) OR "Deal Lost"
```

1. **Lead Registered:** Lead is submitted by the employee and pending leadership review.
2. **Opportunity Accepted:** Validated by the review team and pushed to the live CRM pipeline.
3. **Proposal In Progress:** Commercial proposal, RFP preparation, or customer negotiation active in CRM.
4. **Deal Won / Deal Lost:** Terminal deal stages synchronized from CRM webhooks.

---

## 5. Reviewer Routing Engine
When a lead is submitted, the system looks up the submitter in the Corporate HRMS API (`https://hrapps.nestdigital.com:8089`) and automatically resolves:
* **Reporting Manager (RM)**
* **Project Manager (PM)**
* **BU Head (Business Unit Head)**
* **HRBP (HR Business Partner)**
* **Assigned Sales Person**

Review notifications are sent to all designated reviewers **excluding** the submitter themselves.

---

## 6. Service Level Agreement (SLA) & Notification Policy
* **Review SLA Window:** 7 business days from submission timestamp.
* **SLA Breach Indicator:** If a lead is not reviewed within 7 working days, an amber warning badge (`⚠️ SLA Warning Status: Overdue by X days`) appears on the review board.
* **Automated Email Notifications (SMTP):**
  * **Submitter Confirmation:** Sent upon submission with a link to personal tracking (`/status/:id`).
  * **Review Request Mailer:** Sent to leadership with a deep link to `/review/:id`.
  * **Clarification Request / Response:** Bi-directional loop between reviewer and submitter.
  * **Status Update Mailers:** Sent on Validation, Rejection, Deal Won, and Deal Lost.

---

## 7. Employee Recognition & Reward Engine (Deal Won)
When a deal transitions to **Deal Won**, reviewers can initiate milestone recognition:
* 🥉 **Reward Tier 1 (Bronze):** Spot Recognition Award.
* 🥈 **Reward Tier 2 (Silver):** Excellence Award (Performance Bonus nomination).
* 🥇 **Reward Tier 3 (Gold):** Executive Leadership Award.

---

## 8. Technical Architecture & Tech Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **Backend** | Node.js, Express, TypeScript |
| **Database & ORM** | Prisma ORM with SQLite (Deployable to SQL Server / PostgreSQL) |
| **Authentication** | NeST Corporate HRMS API Authentication with fallback database |
| **Deployment Target** | Windows Server / IIS (Frontend on Port 8085, Backend on Port 7000) |

---

## 9. Instructions for Making Changes (How to Use This Template with Antigravity)

If any stakeholder wishes to modify the system:
1. **Edit the rules or fields directly in this document.** For example:
   * *Change SLA days from 7 to 5.*
   * *Add a new input field (e.g., Estimated Deal Value in USD).*
   * *Add a new reviewer role (e.g., Finance Controller).*
   * *Modify the reward tiers or email templates.*
2. **Share this updated document with the developer or paste it into Google Antigravity with the prompt:**
   > *"Update the IMPACT Model codebase to reflect the updated business rules specified in `IMPACT_MODEL_TEMPLATE.md`."*
3. Antigravity will automatically analyze the diff and update the frontend components, backend endpoints, database schema, and email templates.
