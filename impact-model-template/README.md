# IMPACT Model — Enterprise Opportunity & Lead Governance Portal

> **Production Template & Handover Package**  
> **Target Platform:** NeST Digital Enterprise Portal  
> **Architecture:** Decoupled React 19 SPA + Node.js / Express REST Backend + Prisma ORM with SQLite (Deployable to IIS & Windows Services via NSSM)

---

## 1. Project Overview

The **IMPACT Model Portal** is an enterprise-grade web application designed for NeST Digital employees and leaders. It enables employees across all business units to register sales leads and client opportunities, routes approvals through an automated multi-stakeholder governance matrix, tracks opportunities through a 4-step CRM-aligned pipeline, and facilitates milestone-based employee recognition.

### Key Capabilities
- **Opportunity Submission:** Dynamic registration form with validation, contact person details, and automatic `IM-YYYYMMDD-XXX` intelligence ID generation.
- **Automated Stakeholder Resolution:** Auto-fetches employee reporting hierarchy from the Corporate HRMS API:
  - Reporting Manager (RM)
  - Project Manager (PM)
  - Business Unit Head (BU Head)
  - HR Business Partner (HRBP)
  - Assigned BU Sales Person
- **Strict Segregation of Duties (Four-Eyes Principle):** A submitter is strictly blocked from reviewing, validating, or rejecting their own lead across the UI, backend API, and notification dispatcher—even if they hold a BU Head or senior executive role.
- **Leadership Review Board:** Dedicated queue with SLA overdue indicators (7-day review threshold), pre-action confirmation dialogs, rejection workflows with mandatory reasoning, and bi-directional clarification queries.
- **Live CRM Synchronization:** Stepper aligned with CRM pipeline stages (`Lead Registered` → `Opportunity Accepted` → `Proposal In Progress` → `Deal Won` / `Deal Lost`).
- **Milestone Recognition & Rewards:** Tiered awards (Spot Bronze, Performance Silver, Executive Gold) initiated upon Deal Won milestones.
- **Enterprise Notification Hub:** Automated SMTP mailers with deep links to status tracking and audit logging in the internal Outbox Simulator.

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript 5.7, Vite 8, Tailwind CSS, Lucide React, HTML5, Vanilla CSS |
| **Backend** | Node.js (v18+ / v20 LTS), Express 4.21, TypeScript, tsx, CORS |
| **Database & ORM** | Prisma ORM 5.22, SQLite (zero-config, swappable to SQL Server / PostgreSQL) |
| **Authentication** | Corporate HRMS API (`https://hrapps.nestdigital.com:8089`) with fallback DB & JWT session management |
| **Hosting & Serving** | Microsoft IIS (Port 8085 with URL Rewrite & Reverse Proxy) + NSSM Windows Service (Port 7000) |

---

## 3. Project Directory Structure

```text
impact-model-template/
├── .env.example               # Root reference environment configuration
├── .gitignore                 # Standard exclusions (node_modules, dist, *.db)
├── .oxlintrc.json             # Linter rules configuration
├── index.html                 # SPA entry template
├── package.json               # Frontend dependencies & scripts
├── package-lock.json          # Deterministic dependency tree
├── tsconfig.json              # TypeScript root configuration
├── tsconfig.app.json          # Frontend client TypeScript configuration
├── tsconfig.node.json         # Build tool TypeScript configuration
├── vite.config.ts             # Vite configuration with proxy settings
├── public/                    # Static assets & IIS configuration
│   ├── favicon.svg            # Portal icon
│   ├── icons.svg              # SVG sprites
│   ├── nest_icon.png          # NeST logo asset
│   └── web.config             # IIS URL Rewrite & /api reverse proxy rules
├── src/                       # Frontend Source Code
│   ├── main.tsx               # Client entry point
│   ├── App.tsx                # Master routing, state sync & data loading
│   ├── App.css                # Global animations & styling
│   ├── index.css              # Design tokens, typography, and Tailwind utilities
│   ├── types.ts               # Core TypeScript interfaces & ROLE_MAP definitions
│   ├── utils.ts               # Shared helpers (formatDateTime, triggerMailer, API_BASE_URL)
│   ├── assets/                # Visual brand assets (logos, background images)
│   ├── context/               # React Contexts
│   │   ├── AuthContext.tsx    # Authentication state, token storage, and session hooks
│   │   └── ToastContext.tsx   # Global notification toasts
│   ├── utils/                 # Utility helpers
│   │   └── exportUtils.ts     # Excel & PDF export generators for review records
│   └── components/            # Reusable Views and UI Components
│       ├── DashboardLayout.tsx      # Executive navigation header, profile dropdown, tabs
│       ├── HomeView.tsx             # Submitter dashboard, "My Opportunities", tracker
│       ├── EmployeePortal.tsx       # Lead registration form & validation
│       ├── StakeholderDashboard.tsx # Review board, decision engine, SLA badges, rewards
│       ├── EmailSimulator.tsx       # Internal email hub, notification logs, filters
│       ├── DbViewer.tsx             # Database inspector & admin diagnostics
│       └── LoginScreen.tsx          # Corporate HRMS login screen & fallback
├── server/                    # Backend Source Code
│   ├── .env.example           # Backend environment configuration template
│   ├── package.json           # Backend dependencies (express, prisma, nodemailer)
│   ├── tsconfig.json          # Backend TypeScript compiler configuration
│   ├── prisma/
│   │   └── schema.prisma      # Prisma schema (Employee, Submission, EmailLog, etc.)
│   └── src/
│       └── index.ts           # REST API endpoints, HRMS auth, CRM sync, SMTP mailer
├── README.md                  # This document
├── PROJECT_ARCHITECTURE.md    # System architecture, data flow, and database models
├── ANTIGRAVITY_MASTER_PROMPT.md # Reusable AI system prompt for Antigravity sessions
├── ANTIGRAVITY_PROMPT_LIBRARY.md# 11 Developer prompt templates for future enhancements
├── DEPLOYMENT_GUIDE.md        # IIS, NSSM, and database deployment manual
└── TESTING_GUIDE.md           # Functional, security, and regression testing guide
```

---

## 4. Prerequisites

Before setting up the project locally or on a server, ensure the following are installed:
1. **Node.js:** v18.0.0 or higher (v20 LTS recommended).
2. **npm:** v9.0.0 or higher.
3. **Git:** Installed and available on system PATH.
4. **Network Access:** Access to the internal network if testing live Corporate HRMS (`https://hrapps.nestdigital.com:8089`) or SMTP relay (`10.45.0.12:25`).

---

## 5. Local Development Setup

### Step 1: Install Dependencies
Open a terminal in the root folder and install frontend dependencies:
```bash
npm install
```

Open a second terminal (or navigate to `server/`) and install backend dependencies:
```bash
cd server
npm install
```

### Step 2: Configure Environment Variables
In the `server/` directory, create a `.env` file from `.env.example`:
```bash
cd server
cp .env.example .env
```
*(On Windows PowerShell, use: `Copy-Item .env.example .env`)*

Verify the default values:
- `PORT=7000`
- `DATABASE_URL="file:./dev.db"`
- `JWT_SECRET="your-secure-random-secret"`
- `EMAIL_SEND_ENABLED=false` *(keep `false` during local testing to view emails in the in-app Email Simulator)*

### Step 3: Initialize the SQLite Database
In `server/`, generate the Prisma client and push the schema to SQLite:
```bash
cd server
npx prisma generate
npx prisma db push
```
This automatically creates the SQLite database file at `server/prisma/dev.db` with all tables (`Employee`, `Submission`, `StatusHistory`, `EmailLog`, `Notification`).

### Step 4: Run the Application Locally

#### Terminal 1 — Start the Backend (Port 7000):
```bash
cd server
npm run dev
```
The server will start listening at `http://localhost:7000`.

#### Terminal 2 — Start the Frontend (Port 5173 / Localhost):
```bash
npm run dev
```
The frontend will launch at `http://localhost:5173`. Open your browser and navigate to the local URL.

---

## 6. Default Test Accounts (Fallback Mode)

When the Corporate HRMS API is unreachable or during offline development, the application uses local auto-provisioning with the following accounts:

| Username / Email | Role | Designation & Access |
| :--- | :--- | :--- |
| `dummy.employee@nestgroup.net` | `employee` | Standard Submitter (Home, Submit, Tracker) |
| `dummy.manager@nestgroup.net` | `reviewer` | Reporting Manager / Reviewer (Review Board) |
| `dummy.buhead@nestgroup.net` | `reviewer` | BU Head — Engineering (Review Board) |
| `ajish@nestgroup.net` | `reviewer` | BU Head — HR Group (Review Board) |
| `admin` (or any admin email) | `admin` | Global Administrator (All views + Database Inspector `/db`) |

*Default password in fallback mode: Any password accepted or corporate password.*

---

## 7. Production Build Commands

### Build Frontend Bundle:
```bash
npm run build
```
Generates production-optimized static files in `dist/` with `web.config` ready for IIS.

### Build Backend Bundle:
```bash
cd server
npm run build
```
Compiles TypeScript backend source into vanilla JavaScript in `server/dist/`.

---

## 8. Working with Antigravity

This template is configured for Google Antigravity AI engineering:
1. Open this directory as your active workspace in Antigravity.
2. Review [`PROJECT_ARCHITECTURE.md`](PROJECT_ARCHITECTURE.md) to understand the component and API relationships.
3. Use the [`ANTIGRAVITY_MASTER_PROMPT.md`](ANTIGRAVITY_MASTER_PROMPT.md) and [`ANTIGRAVITY_PROMPT_LIBRARY.md`](ANTIGRAVITY_PROMPT_LIBRARY.md) when requesting modifications, adding integrations, or modifying workflows.
