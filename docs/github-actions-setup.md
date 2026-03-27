# GitHub Actions CI/CD Setup

This guide covers setting up the GitHub Actions CI/CD pipeline for the dashboard repo.

---

## How it works

```
Push to main
    │
    ├── ci.yml  → Builds frontend + gateway Docker images → pushes to GHCR
    │
    └── deploy.yml  → SSHs into VM → pulls latest images → docker compose up -d
```

`deploy.yml` also triggers on:
- `docker-compose.yml` push (service activation from dashboard)
- `repository_dispatch: service-deploy` (dispatched by service repos after their CI)

---

## 1. Create GitHub Environment

Go to repo **Settings → Environments → New environment** → name it `production`.

---

## 2. Add Secrets

| Name | Value |
|------|-------|
| `VM_SSH_KEY` | Full contents of your VM's private SSH key (including `-----BEGIN` and `-----END` lines) |
| `DEPLOY_TOKEN` | Fine-grained PAT with **Contents: read+write** on this repo |
| `VITE_ADMIN_EMAILS` | Comma-separated SuperAdmin emails |

---

## 3. Add Variables

| Name | Value |
|------|-------|
| `VM_HOST` | VM public IP address |
| `VM_USER` | VM SSH username (e.g. `ubuntu`) |
| `DEPLOY_PATH` | Path to repo on VM (e.g. `github-actions/rmsb-dashboard`) |
| `VITE_APP_NAME` | App display name (baked into frontend at build time) |
| `VITE_API_GATEWAY_URL` | Full URL of your domain (e.g. `https://yourname.duckdns.org`) |

---

## 4. Add Repo-level Variable

Go to **Settings → Variables → Actions** (repo level, not environment):

| Name | Value |
|------|-------|
| `DEPLOY_ENV` | `production` |

---

## 5. Push to trigger

Push any change to `main` — CI builds and pushes images, then CD deploys to the VM.

Monitor progress under the **Actions** tab.

---

## Workflow files

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Builds `rmsb-frontend` and `rmsb-api-gateway` images, pushes to `ghcr.io/sairanawaz/` |
| `.github/workflows/deploy.yml` | SSHs into VM, pulls latest images, runs `docker compose up -d` |

---

## Notes

- `VITE_APP_NAME` and `VITE_API_GATEWAY_URL` are baked into the frontend image at build time — update the GitHub variable and trigger a new CI run to apply changes
- `docker-compose.yml` pushes skip CI image rebuild (via `paths-ignore`) but still trigger deploy
- The `[skip ci]` tag must NOT be used on `docker-compose.yml` commits — it would skip the deploy too
