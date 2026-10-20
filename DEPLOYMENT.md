# Impact Model – Deployment Package

| Part     | Folder      | Live URL                              |
|----------|-------------|---------------------------------------|
| Frontend | `frontend/` | https://hrapps.nestdigital.com:8085   |
| Backend  | `backend/`  | http://127.0.0.1:7000 (proxied via frontend /api) |

All API calls from the frontend go through the IIS `/api` reverse proxy to **port 7000**.
HRMS and CRM APIs are configured on `https://hrapps.nestdigital.com:8089`.

---

## 1. Frontend (port 8085)
Copy the contents of `frontend/` into the IIS site root for port 8085.
- `web.config` is included (React SPA routing + `/api` proxy to `127.0.0.1:7000`).
- Requires IIS **URL Rewrite** module (and ARR if the `/api` proxy rule is used).

## 2. Backend (port 7000)
Requirements: Node.js 18+ (20 LTS recommended).

```bash
cd backend
npm install             # full install (includes Prisma CLI needed below)
npx prisma generate
npx prisma db push      # creates the database + tables (first time only)
npm start               # runs on PORT from .env (7000)
```

To keep it running permanently (optional):
```bash
npm install -g pm2
pm2 start dist/index.js --name impact-model-backend
pm2 save
```

## 3. Database
- Currently **SQLite** – a single file created at `backend/prisma/dev.db` by `npx prisma db push`.
- No separate DB server needed. Back up this file regularly.
- Do **not** run the seed script on live (it inserts demo data).
- Employees are created automatically on first login from HRMS.

To use PostgreSQL / SQL Server / MySQL instead: change `provider` in
`prisma/schema.prisma`, set `DATABASE_URL` in `.env`, then re-run `npx prisma generate` and `npx prisma db push`.

## 4. Configuration (`backend/.env`)
| Key                  | Value                                         |
|----------------------|-----------------------------------------------|
| `PORT`               | `7000`                                        |
| `CORPORATE_API_URL`  | `https://hrapps.nestdigital.com:8089` (HRMS)  |
| `CRM_API_URL`        | `https://hrapps.nestdigital.com:8089/api/leads/opportunities` |
| `IMPACT_BASE_URL`    | `https://hrapps.nestdigital.com:8085` (frontend – CORS + email links) |
| `CORS_ORIGINS`       | Allowed frontend origins (comma-separated)    |
| `JWT_SECRET`         | **Change to a long random value before going live** |

## Notes
- The backend serves plain HTTP on port 7000 (127.0.0.1:7000). The IIS frontend reverse-proxies all `/api/*` traffic to port 7000.
- Only one process can listen on port 7000. Make sure port 7000 is free or change `PORT` in `.env` and `web.config` accordingly.
