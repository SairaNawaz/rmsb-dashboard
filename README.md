# MultiService Process Dashboard

A self-hosted platform for running and managing microservices. Provides a service registry, an API gateway, role-based access control, and Docker orchestration — all from a single dashboard.

---

## What's in this repo

```
rmsb-dashboard/
├── frontend/               ← React + TypeScript + Vite (dashboard, settings, users)
├── api-gateway/            ← Express API gateway (registry, users, service routing)
├── docker-compose.yml      ← Production compose (image-based, Neon DB)
├── docker-compose.override.yml  ← Local dev override (gitignored, builds from source)
├── .env.example            ← Copy to .env and fill in Neon credentials
├── services/               ← Per-service compose fragments + env files (managed by CI)
├── Jenkinsfile             ← Jenkins CI/CD pipeline
└── docs/
    ├── server-setup.md
    └── jenkins-setup.md
```

---

## Architecture

```
Browser
  └── nginx (SSL termination)
        └── gateway :8080
              ├── /api/registry  ← service registry CRUD
              ├── /api/users     ← platform user management
              ├── /api/graph     ← Microsoft Graph proxy (org users)
              ├── /s1/*          ← proxied to s1 container
              ├── /s2/*          ← proxied to s2 container
              └── /*             ← dashboard frontend
```

- Database: Neon Serverless Postgres (each service gets its own Neon project)
- Services are served at subdirectory paths — no extra ports exposed
- The gateway discovers services from the `services` table and reloads every 30s
- Jenkins CI builds images, generates service fragments, and triggers deploys

---

## Roles

| Role | Access |
|------|--------|
| **SuperAdmin** | Everything — manage users, services, settings |
| **Admin** | Settings + Users (read-only) |
| **Viewer** | Dashboard only |

SuperAdmin emails are set via `ADMIN_EMAILS` in `.env`.

---

## Local Development

### Prerequisites

- Docker Desktop
- A Neon account with two projects: one for the dashboard, one for s1
- The [s1-device-management](https://github.com/SairaNawaz/s1-device-management) repo cloned as a sibling directory

### Directory layout

```
your-workspace/
├── rmsb-dashboard/
└── s1-device-management/
```

### Setup

```bash
cd rmsb-dashboard

# Configure environment
cp .env.example .env                    # fill in dashboard Neon creds

# Create the override file (or copy from a teammate)
# See docker-compose.override.example.yml for reference
```

### Run

```bash
docker compose up --build
```

Docker automatically merges `docker-compose.yml` + `docker-compose.override.yml`. This builds everything from source, connects to Neon, and puts all services on one network.

Open `http://localhost:8080`, go to Settings, register s1, and click Activate.

### How the override works

| File | Purpose | Committed |
|------|---------|-----------|
| `docker-compose.yml` | Production base — gateway + frontend as images | Yes |
| `docker-compose.override.yml` | Local dev — swaps images to builds, adds s1 | No (gitignored) |

On the server, the override file doesn't exist, so Docker uses images. Locally, it auto-loads and builds from source.

---

## Production Deployment (Jenkins)

Jenkins handles the full CI/CD:

1. **Service repo CI** (e.g. s1) — builds Docker image, pushes to GHCR, commits a compose fragment into this repo under `services/`, triggers dashboard deploy
2. **Dashboard CI** — builds gateway + frontend images, deploys to VM via SSH
3. **Deploy** — on the VM, Jenkins merges `docker-compose.yml` + `services/docker-compose.*.service.yml`, pulls images, runs `docker compose up -d`

See [Jenkins Setup](docs/jenkins-setup.md) for pipeline configuration.

---

## Adding a New Service

1. Use [rmsb-service-template](https://github.com/SairaNawaz/rmsb-service-template) to create a new repo
2. Register the service via the dashboard Settings page
3. Configure Jenkins CI in the new repo (see template README)
4. Push to main — CI builds the image, commits the fragment, triggers deploy
5. Activate the service from the dashboard Settings page
