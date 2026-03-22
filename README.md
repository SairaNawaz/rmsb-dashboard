# rmsb-dashboard

Platform hub for the RMSB platform. Provides the login shell, API gateway, service registry, and Docker orchestration.

---

## What is in this repo

```
rmsb-dashboard/
├── frontend/              ← Login + Dashboard shell (Vite + React + TypeScript)
├── api-gateway/           ← Express proxy + service registry API
├── docker-compose.yml     ← Run full platform using pre-built images
├── docker-compose.dev.yml ← Override to build from local source
└── .env.example           ← Copy to .env before first run
```

---

## Run the full platform

Requires Docker Desktop.

```bash
git clone https://github.com/SairaNawaz/rmsb-dashboard.git
cd rmsb-dashboard
cp .env.example .env
docker compose up
```

Open http://localhost:5173 and log in with:
- `admin` / `demo` — full access including Settings
- `user` / `demo` — dashboard view only

To stop:
```bash
docker compose down
```

To reset the database (drops all data):
```bash
docker compose down -v
```

---

## Develop locally

```bash
git clone https://github.com/SairaNawaz/rmsb-dashboard.git
cd rmsb-dashboard
cp .env.example .env
docker compose up postgres   # start DB only
npm install
npm run dev                  # frontend (5173) + gateway (8080)
```

---

## Service Registry

Services are registered via the dashboard — no manual code changes needed.

**To add a new service:**
1. Log in as `admin` → go to **Settings**
2. Click **Register Service** and fill in the details
3. Click **Sync Compose** — `docker-compose.yml` is updated automatically
4. Run `docker compose up` to start the new service
5. Click **Activate** in Settings to make it live on the dashboard

---

## Database

Single PostgreSQL instance shared across all services. Each service owns its own schema and is responsible for creating it on startup.

Host port: `5433` (avoids conflicts with local Postgres instances).

---

## CI

On every push to `main`, GitHub Actions builds and pushes two images:

| Image | Built from |
|-------|-----------|
| `ghcr.io/sairanawaz/rmsb-frontend:latest` | `./frontend` |
| `ghcr.io/sairanawaz/rmsb-api-gateway:latest` | `./api-gateway` |

---

## Environment variables

See [`.env.example`](.env.example) for all variables.
