# IMPACT Model — Production Deployment & Operations Guide

> **Target Environment:** Windows Server / Microsoft IIS + NSSM Windows Service  
> **Topology:** Decoupled Architecture (IIS Frontend on Port 8085, Node.js Backend Service on Port 7000)

---

## 1. Production Architecture Summary

```text
End User Browser
      │
      ▼ (HTTPS Port 8085)
Microsoft IIS Web Server
      │
      ├── Static Asset Serving (HTML, JS, CSS, Assets)
      │
      └── URL Rewrite & ARR Reverse Proxy Rule (/api/*)
            │
            ▼ (HTTP Port 7000 - 127.0.0.1)
Node.js Express Backend (Managed by NSSM Windows Service)
      │
      ├── SQLite Database (prisma/dev.db)
      ├── Corporate HRMS API (https://hrapps.nestdigital.com:8089)
      ├── Corporate CRM API (https://hrapps.nestdigital.com:8089)
      └── Corporate SMTP Relay (10.45.0.12:25)
```

---

## 2. Server Prerequisites

Ensure the Windows Server instance has the following installed:
1. **Node.js:** v18.0.0+ (v20 LTS recommended). Download from [nodejs.org](https://nodejs.org).
2. **Microsoft IIS:** Enabled with standard features.
3. **IIS URL Rewrite Module 2.1:** Download from Microsoft.
4. **IIS Application Request Routing (ARR) 3.0:** Needed to proxy `/api/*` to `127.0.0.1:7000`.
   - *Enable ARR Proxy:* Open IIS Manager → Application Request Routing Cache → Server Proxy Settings → Check **Enable proxy** → Apply.
5. **NSSM (Non-Sucking Service Manager):** Download from [nssm.cc](https://nssm.cc/) to run Node.js as a resilient Windows Service.

---

## 3. Frontend Deployment to IIS (Port 8085)

### Step 1: Prepare the Frontend Build
On your build machine or server:
```bash
npm install
npm run build
```
This generates the optimized bundle in `dist/`.

### Step 2: Configure the IIS Website
1. Open **IIS Manager** (`inetmgr`).
2. Right-click **Sites** → **Add Website...**
   - **Site name:** `ImpactModel-Frontend`
   - **Physical path:** `C:\inetpub\wwwroot\impact-model\frontend` (copy contents of `dist/` here)
   - **Port:** `8085` (or desired HTTPS port with SSL certificate attached)
3. Ensure the folder permissions allow `IIS_IUSRS` Read & Execute access.

### Step 3: Verify `web.config`
Ensure [`web.config`](public/web.config) is present in the website root (`C:\inetpub\wwwroot\impact-model\frontend\web.config`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Reverse Proxy API traffic to Port 7000 -->
        <rule name="ReverseProxyToBackend" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:7000/api/{R:1}" />
        </rule>
        
        <!-- React SPA Client-Side Routing Fallback -->
        <rule name="ReactSPA" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".webp" mimeType="image/webp" />
      <mimeMap fileExtension=".mp4" mimeType="video/mp4" />
    </staticContent>
  </system.webServer>
</configuration>
```

---

## 4. Backend Deployment via NSSM (Port 7000)

### Step 1: Prepare Backend Directory
1. Create a dedicated backend directory on the server:  
   `C:\Services\impact-model-backend`
2. Copy the following files from `server/` to `C:\Services\impact-model-backend`:
   - `dist/` (compiled JavaScript from `npm run build`)
   - `prisma/` (`schema.prisma`)
   - `package.json` and `package-lock.json`
   - `.env` (configured with production values)
3. Open a Command Prompt in `C:\Services\impact-model-backend` and install dependencies:
   ```cmd
   npm install --production
   npx prisma generate
   npx prisma db push
   ```

### Step 2: Install the Windows Service Using NSSM
1. Open an Administrator Command Prompt.
2. Run NSSM install:
   ```cmd
   nssm.exe install ImpactModelBackend
   ```
3. A GUI window will appear. Fill in the tabs:
   - **Application Tab:**
     - **Path:** `C:\Program Files\nodejs\node.exe` (path to Node executable)
     - **Startup directory:** `C:\Services\impact-model-backend`
     - **Arguments:** `dist/index.js`
   - **Details Tab:**
     - **Display name:** `NeST IMPACT Model Backend API`
     - **Description:** `REST API and SMTP Notification Service for IMPACT Model`
     - **Startup type:** Automatic
   - **I/O Tab:**
     - **Output (stdout):** `C:\Services\impact-model-backend\logs\stdout.log`
     - **Error (stderr):** `C:\Services\impact-model-backend\logs\stderr.log`
4. Click **Install service**.

### Step 3: Start and Verify the Service
```cmd
nssm.exe start ImpactModelBackend
```
Check status:
```cmd
nssm.exe status ImpactModelBackend
```
Open a browser on the server and test: `http://127.0.0.1:7000/api/employees` (should return 401 Unauthorized if auth is active, confirming the API is listening).

---

## 5. Database Management (SQLite)

### File Location
The database is a single file located at:
`C:\Services\impact-model-backend\prisma\dev.db`

### Backup Procedure
To backup SQLite safely while the service is running:
```cmd
copy C:\Services\impact-model-backend\prisma\dev.db C:\Backups\impact_db_%date:~-4,4%%date:~-7,2%%date:~-10,2%.db
```
Schedule this daily using Windows Task Scheduler.

### Restore Procedure
1. Stop the service: `nssm stop ImpactModelBackend`
2. Replace `dev.db` with the backup file.
3. Start the service: `nssm start ImpactModelBackend`

---

## 6. Updating the Application (Safe Upgrade Procedure)

### Updating the Frontend (Zero Backend Downtime):
1. Build new frontend files: `npm run build`
2. Overwrite files in `C:\inetpub\wwwroot\impact-model\frontend`
3. Users receive the updated UI on next page load or refresh.

### Updating the Backend:
1. Compile backend code: `cd server && npm run build`
2. Stop the Windows service: `nssm stop ImpactModelBackend`
3. Copy new files from `server/dist/` to `C:\Services\impact-model-backend\dist/`
4. If schema changed: run `npx prisma generate && npx prisma db push`
5. Start the Windows service: `nssm start ImpactModelBackend`
6. Verify logs in `logs/stdout.log` and `logs/stderr.log`.

---

## 7. Troubleshooting Common Issues

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **HTTP 502.5 / 502.3 Bad Gateway on `/api/*`** | Node.js service is stopped or port 7000 is blocked. | Verify backend service is running: `nssm status ImpactModelBackend`. Check `logs/stderr.log`. |
| **HTTP 404 Not Found on deep links (`/review/:id` or `/status/:id`)** | IIS URL Rewrite module missing or `web.config` not applied. | Install URL Rewrite 2.1 in IIS. Verify `web.config` is in the site root. |
| **CORS Policy Error in browser console** | Request origin not listed in backend `.env`. | Add frontend URL to `CORS_ORIGINS` in `.env` (e.g., `https://hrapps.nestdigital.com:8085`). Restart backend service. |
| **Emails stuck in 'QUEUED' or 'FAILED'** | `EMAIL_SEND_ENABLED=false` or SMTP relay unreachable. | In `.env`, ensure `EMAIL_SEND_ENABLED=true` and `SMTP_HOST=10.45.0.12` on port 25 is reachable from the server network. |
| **Port 7000 Conflict** | Another process is using port 7000. | Check using `netstat -ano \| findstr :7000`. Terminate conflicting process or change `PORT` in `.env` and `web.config`. |
