# Server Setup

This guide covers provisioning and configuring the Oracle Cloud VM that hosts the dashboard.

---

## 1. Provision Oracle Cloud VM

- Shape: `VM.Standard.A1.Flex` (Always Free ARM)
- Recommended: 2 OCPU / 12 GB RAM (leave headroom for Jenkins or other services)
- OS: Ubuntu 22.04
- Open ports in Security List: `22` (SSH), `80` (HTTP), `443` (HTTPS)

> Oracle Always Free ARM allocation is 4 OCPU / 24 GB total shared across all instances. Split evenly if running two VMs.

---

## 2. SSH into the VM

```bash
chmod 400 /path/to/private-key.key
ssh -i /path/to/private-key.key ubuntu@<PUBLIC_IP>
```

---

## 3. Install Docker and nginx

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin nginx
sudo usermod -aG docker $USER
newgrp docker
```

---

## 4. Open firewall ports

```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

---

## 5. Set up a free domain (DuckDNS)

1. Go to [duckdns.org](https://www.duckdns.org) and sign in with GitHub
2. Create a subdomain (e.g. `yourname.duckdns.org`) and point it to your VM's public IP
3. Copy your DuckDNS token — you'll need it for SSL

Verify it works:
```bash
curl "https://www.duckdns.org/update?domains=yoursubdomain&token=YOUR_TOKEN&ip="
# Should return: OK
```

---

## 6. Install acme.sh and issue SSL certificate

```bash
# Install acme.sh
curl https://acme-install.netlify.app/acme.sh -o acme.sh && chmod +x acme.sh && ./acme.sh --install && rm acme.sh

# Download DuckDNS API hook
mkdir -p ~/.acme.sh/dnsapi
curl -o ~/.acme.sh/dnsapi/dns_duckdns.sh \
  https://raw.githubusercontent.com/acmesh-official/acme.sh/master/dnsapi/dns_duckdns.sh
chmod +x ~/.acme.sh/dnsapi/dns_duckdns.sh

# Issue cert
export DuckDNS_Token=YOUR_DUCKDNS_TOKEN
~/.acme.sh/acme.sh --issue --dns dns_duckdns -d yoursubdomain.duckdns.org --server letsencrypt

# Install cert
sudo mkdir -p /etc/ssl/yoursubdomain.duckdns.org
sudo chown $USER /etc/ssl/yoursubdomain.duckdns.org
~/.acme.sh/acme.sh --install-cert -d yoursubdomain.duckdns.org \
  --cert-file /etc/ssl/yoursubdomain.duckdns.org/cert.pem \
  --key-file /etc/ssl/yoursubdomain.duckdns.org/key.pem \
  --fullchain-file /etc/ssl/yoursubdomain.duckdns.org/fullchain.pem \
  --reloadcmd "sudo systemctl reload nginx"
```

> acme.sh auto-renews the cert via cron. The `--reloadcmd` ensures nginx reloads on renewal.

---

## 7. Configure nginx

Create `/etc/nginx/sites-available/dashboard`:

```nginx
server {
    listen 443 ssl;
    server_name yoursubdomain.duckdns.org;

    ssl_certificate /etc/ssl/yoursubdomain.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/ssl/yoursubdomain.duckdns.org/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name yoursubdomain.duckdns.org;
    return 301 https://$host$request_uri;
}
```

Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/dashboard
sudo nginx -t && sudo systemctl reload nginx
```

---

## 8. Clone repo and configure

```bash
mkdir -p ~/github-actions
cd ~/github-actions
git clone https://github.com/SairaNawaz/rmsb-dashboard.git
cd rmsb-dashboard
cp .env.example .env
nano .env  # fill in all values — see .env.example for reference
```

Key values to set in `.env`:

| Variable | Value |
|----------|-------|
| `ADMIN_EMAILS` | Your email |
| `VITE_ADMIN_EMAILS` | Your email |
| `VITE_API_GATEWAY_URL` | `https://yoursubdomain.duckdns.org` |
| `VITE_APP_NAME` | Your app display name |
| `DEPLOY_TOKEN` | GitHub PAT (Contents read+write on this repo) |
| `GITHUB_REPO` | `SairaNawaz/rmsb-dashboard` |
| `GHCR_OWNER` | `sairanawaz` |

---

## 9. Start the platform

```bash
docker compose pull
docker compose up -d
```

---

## 10. Set yourself as SuperAdmin

```bash
docker exec -it rmsb-postgres psql -U admin -d rmsb_db \
  -c "INSERT INTO platform_users (email, display_name, role)
      VALUES ('you@example.com', 'Your Name', 'SuperAdmin')
      ON CONFLICT (email) DO UPDATE SET role = 'SuperAdmin';"
```
