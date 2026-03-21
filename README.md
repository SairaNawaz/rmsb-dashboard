# rmsb-dashboard

Platform repo for the RMSB platform. Contains the login shell, API gateway, and full platform orchestration.

---

## What is in this repo

```
rmsb-dashboard/
├── frontend/              ← Login + Dashboard shell (Vite + React + TypeScript)
├── api-gateway/           ← Express proxy routing requests to services
├── docker-compose.yml     ← Run full platform using pre-built images
├── docker-compose.dev.yml ← Override to build from local source
└── .env.example           ← Copy this to .env before first run
```

---

## All repositories

| Repo | Purpose | Ports |
|------|---------|-------|
| `rmsb-dashboard` ← **this repo** | Login shell + API gateway + orchestration | 5173 (UI) · 8080 (gateway) |
| `rmsb-s1-device-management` | Device management service | 3001 |
| `rmsb-s2-capacity-planning` | Capacity planning service | 3002 |

---

## Run the full platform

Requires Docker Desktop running.

```bash
git clone https://github.com/SairaNawaz/rmsb-dashboard.git
cd rmsb-dashboard
cp .env.example .env
docker compose up
```

Open http://localhost:5173 and log in with:
- `admin` / `password`
- `demo` / `demo`

To stop:
```bash
docker compose down
```

To reset the database (drops all data):
```bash
docker compose down -v
```

---

## Develop dashboard or gateway locally

```bash
git clone https://github.com/SairaNawaz/rmsb-dashboard.git
cd rmsb-dashboard
cp .env.example .env
npm install
npm run dev    # starts frontend (5173) + gateway (8080) together
```

For services to be available, run their containers separately or use the dev override below.

---

## Run full platform from local source

Clone this repo and any service repos as siblings inside the same folder:

```
AutomationInitiatives/
├── rmsb-dashboard/              ← this repo
├── rmsb-s1-device-management/
└── rmsb-s2-capacity-planning/
```

Then run:
```bash
cd rmsb-dashboard
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

---

## Database

Single PostgreSQL instance shared across all services. Each service owns and manages its own schema — schemas are created automatically when the service starts.

| Schema | Owner |
|--------|-------|
| `schema_s1` | rmsb-s1-device-management |
| `schema_s2` | rmsb-s2-capacity-planning |

Host port: `5433` (avoids conflicts with other local Postgres instances).

---

## Adding a new service (e.g. S3)

1. Create repo `rmsb-s3-your-service` — include its own `docker-compose.yml` and `src/db/migrate.js`
2. Add `s3` service to `docker-compose.yml` and `docker-compose.dev.yml` in this repo
3. Add a route in `api-gateway/src/index.js`
4. Add the service card to `frontend/src/pages/Dashboard.tsx`

---

## CI

On every push to `main`, GitHub Actions builds and pushes two images to ghcr.io:

| Image | Built from |
|-------|-----------|
| `ghcr.io/sairanawaz/rmsb-frontend:latest` | `./frontend` |
| `ghcr.io/sairanawaz/rmsb-api-gateway:latest` | `./api-gateway` |

---

## Environment variables

See [`.env.example`](.env.example) for all variables with descriptions.
