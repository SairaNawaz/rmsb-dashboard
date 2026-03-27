# Jenkins CI/CD Setup

This guide covers installing and configuring Jenkins on the Oracle VM to build and deploy the dashboard as an alternative to GitHub Actions.

---

## How it works

```
Push to main
    │
    └── GitHub Webhook → Jenkins
            │
            ├── Stage 1: Checkout code
            ├── Stage 2: Build & push frontend image to GHCR
            ├── Stage 3: Build & push gateway image to GHCR
            └── Stage 4: SSH into VM → pull images → docker compose up -d
```

Jenkins deploys to `~/jenkins/rmsb-dashboard` on the VM (separate from the GitHub Actions deployment at `~/github-actions/rmsb-dashboard`).

---

## 1. Run Jenkins as a Docker container

```bash
mkdir -p ~/jenkins
cat > ~/jenkins/docker-compose.yml << 'EOF'
services:
  jenkins:
    image: jenkins/jenkins:lts
    container_name: jenkins
    restart: unless-stopped
    user: root
    ports:
      - 8090:8080
    environment:
      - JENKINS_OPTS=--prefix=/jenkins
    volumes:
      - jenkins_home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
      - /usr/bin/docker:/usr/bin/docker
volumes:
  jenkins_home:
EOF

cd ~/jenkins && docker compose up -d
```

---

## 2. Configure nginx

Add a `/jenkins` location block to your nginx config:

```nginx
location /jenkins {
    proxy_pass http://localhost:8090/jenkins;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Port 443;
}
```

Reload nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

Jenkins is now accessible at `https://your-domain/jenkins`.

---

## 3. Initial setup

1. Get the initial admin password:
   ```bash
   docker logs jenkins 2>&1 | grep -A3 "Please use the following"
   ```
2. Open `https://your-domain/jenkins` → enter the password
3. Select **Install suggested plugins**
4. Create your admin account

---

## 4. Install SSH Agent plugin

**Manage Jenkins → Plugins → Available** → search `SSH Agent` → install.

---

## 5. Add credentials

Go to **Manage Jenkins → Security → Credentials → Global → Add Credential**:

| Credential | Kind | ID | Notes |
|------------|------|----|-------|
| GitHub classic PAT | Secret text | `github-token` | Needs `write:packages` + `read:packages` + `repo` scopes — must be a **classic** token, not fine-grained |
| VM SSH key | SSH Username with private key | `vm-ssh-key` | Username: `ubuntu`, paste full private key content |

> Use a separate classic PAT for Jenkins GHCR pushing. Your existing fine-grained PAT can stay for GitHub Actions and the gateway deploy token.

---

## 6. Clone repo into Jenkins deploy folder

```bash
mkdir -p ~/jenkins
cd ~/jenkins
git clone https://github.com/SairaNawaz/rmsb-dashboard.git
cp ~/github-actions/rmsb-dashboard/.env ~/jenkins/rmsb-dashboard/.env
```

---

## 7. Create Jenkins pipeline job

1. **New Item** → name: `rmsb-dashboard` → **Pipeline** → OK
2. Under **Build Triggers** → check **GitHub hook trigger for GITScm polling**
3. Under **Pipeline** → Definition: `Pipeline script from SCM`
   - SCM: `Git`
   - Repository URL: `https://github.com/SairaNawaz/rmsb-dashboard.git`
   - Branch: `*/main`
   - Script Path: `Jenkinsfile`
4. Save

---

## 8. Set up GitHub webhook

Go to repo **Settings → Webhooks → Add webhook**:

| Field | Value |
|-------|-------|
| Payload URL | `https://your-domain/jenkins/github-webhook/` |
| Content type | `application/json` |
| Events | Just the push event |
| SSL verification | Enabled |

A green tick confirms Jenkins is reachable.

---

## Jenkinsfile

The `Jenkinsfile` at the root of the repo defines the pipeline. Key environment variables at the top:

| Variable | Description |
|----------|-------------|
| `OWNER` | GHCR owner (lowercase) |
| `DEPLOY_PATH` | Path to repo on VM (`jenkins/rmsb-dashboard`) |
| `VM_HOST` | VM IP address |
| `VITE_APP_NAME` | App name baked into frontend image |
| `VITE_API_GATEWAY_URL` | Gateway URL baked into frontend image |

See [switching-ci.md](switching-ci.md) to toggle between Jenkins and GitHub Actions.
