const express = require('express');
const router = express.Router();
const pool = require('../db');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

// Project root is two levels up from api-gateway/src/
const COMPOSE_PATH = path.resolve(__dirname, '../../../docker-compose.yml');

// ─── GitHub API helper ────────────────────────────────────────────────────────

function githubRequest(method, apiPath, token, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: apiPath,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'rmsb-api-gateway',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Per-service DB provisioning ──────────────────────────────────────────────

// Path to host .env file, mounted into the container at /app/.env.host
const HOST_ENV_PATH = '/app/.env.host';

async function provisionServiceDB(service) {
  const { name, schema_name } = service;
  const db_user = `svc_${name}`;
  const db_password = crypto.randomBytes(16).toString('hex');

  // Create schema
  await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema_name}"`);

  // Create DB user (skip if already exists)
  try {
    await pool.query(`CREATE USER "${db_user}" WITH PASSWORD '${db_password}'`);
  } catch (err) {
    if (err.code === '42710') {
      // Role already exists — update password in case it changed
      await pool.query(`ALTER USER "${db_user}" WITH PASSWORD '${db_password}'`);
    } else {
      throw err;
    }
  }

  // Grant database-level access to the service user
  const dbName = process.env.DB_NAME;
  await pool.query(`GRANT CONNECT, CREATE ON DATABASE "${dbName}" TO "${db_user}"`);
  await pool.query(`REVOKE ALL ON SCHEMA "${schema_name}" FROM PUBLIC`);
  await pool.query(`GRANT USAGE, CREATE ON SCHEMA "${schema_name}" TO "${db_user}"`);
  await pool.query(`GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA "${schema_name}" TO "${db_user}"`);
  await pool.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "${schema_name}" TO "${db_user}"`);
  await pool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA "${schema_name}" GRANT ALL ON TABLES    TO "${db_user}"`);
  await pool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA "${schema_name}" GRANT ALL ON SEQUENCES TO "${db_user}"`);

  // Persist credentials in services table
  await pool.query(
    `UPDATE services SET db_user = $1, db_password = $2 WHERE name = $3`,
    [db_user, db_password, name]
  );

  // Append per-service env vars to the host .env file so docker compose picks them up
  const envKey = name.toUpperCase();
  const envBlock = `\n# ${name} service DB credentials (auto-provisioned)\n${envKey}_DB_USER=${db_user}\n${envKey}_DB_PASSWORD=${db_password}\n`;
  try {
    // Remove any existing entry for this service before appending
    if (fs.existsSync(HOST_ENV_PATH)) {
      let content = fs.readFileSync(HOST_ENV_PATH, 'utf8');
      // Strip previous block for this service if re-activating
      content = content.replace(
        new RegExp(`\\n# ${name} service DB credentials.*?\\n${envKey}_DB_PASSWORD=[^\\n]*\\n`, 's'),
        ''
      );
      fs.writeFileSync(HOST_ENV_PATH, content + envBlock, 'utf8');
    }
  } catch (e) {
    console.warn(`Could not update host .env file: ${e.message}`);
  }

  return { db_user, db_password };
}

// ─── Auto-sync: commit updated docker-compose.yml to GitHub then deploy ───────

async function syncCompose() {
  const token = process.env.DEPLOY_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token) {
    console.warn('DEPLOY_TOKEN not set — skipping compose sync');
    return;
  }
  if (!repo) {
    console.warn('GITHUB_REPO not set — skipping compose sync');
    return;
  }

  const { rows } = await pool.query(
    `SELECT * FROM services WHERE status = 'active' ORDER BY registered_at ASC`
  );
  const yaml = generateComposeYaml(rows);

  // Write locally so docker compose up picks it up on the current VM process
  fs.writeFileSync(COMPOSE_PATH, yaml, 'utf8');

  // Commit to GitHub so the deploy workflow gets it via git pull
  const [owner, repoName] = repo.split('/');
  const filePath = 'docker-compose.yml';

  let sha;
  try {
    const existing = await githubRequest('GET', `/repos/${owner}/${repoName}/contents/${filePath}`, token);
    sha = existing.sha;
  } catch (e) {
    // File doesn't exist yet — will be created
  }

  await githubRequest('PUT', `/repos/${owner}/${repoName}/contents/${filePath}`, token, {
    message: 'chore: sync docker-compose.yml from service registry',
    content: Buffer.from(yaml).toString('base64'),
    ...(sha ? { sha } : {}),
  });

  console.log(`docker-compose.yml committed to ${repo} (${rows.length} active services)`);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /registry — list all services
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM services ORDER BY registered_at ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /registry/next-id — preview the next auto-assigned service ID
router.get('/next-id', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(MAX(CAST(substring(name FROM 2) AS int)), 0) + 1 AS next
       FROM services WHERE name ~ '^s[0-9]+$'`
    );
    res.json({ name: `s${rows[0].next}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /registry — register a new service
router.post('/', async (req, res) => {
  const { display_name, description, icon, repo_url, branch } = req.body;

  try {
    // Auto-assign next service ID (s1, s2, s3 ...)
    const { rows: counter } = await pool.query(
      `SELECT COALESCE(MAX(CAST(substring(name FROM 2) AS int)), 0) + 1 AS next
       FROM services WHERE name ~ '^s[0-9]+$'`
    );
    const name = `s${counter[0].next}`;
    const path_prefix = `/${name}`;
    const container_name = `rmsb-${name}`;
    const schema_name = `schema_${name}`;

    const { rows } = await pool.query(
      `INSERT INTO services
         (name, display_name, description, icon, path_prefix,
          container_name, schema_name, repo_url, branch)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        name, display_name, description || null, icon || '🔧', path_prefix,
        container_name, schema_name, repo_url || null, branch || 'main',
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /registry/:id — update a service status
// Triggers compose sync+commit+deploy whenever status changes
router.patch('/:id', async (req, res) => {
  const { status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE services SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Service not found' });
    res.json(rows[0]);

    // Fire-and-forget: provision DB then sync compose
    (async () => {
      try {
        if (status === 'active') {
          await provisionServiceDB(rows[0]);
          console.log(`DB provisioned for ${rows[0].name}`);
        }
        await syncCompose();
      } catch (err) {
        console.error('Post-activation task failed:', err.message);
      }
    })();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /registry/:id — remove a service, clean up DB + .env, re-sync compose
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM services WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Service not found' });
    const svc = rows[0];

    await pool.query('DELETE FROM services WHERE id = $1', [req.params.id]);
    res.status(204).end();

    // Fire-and-forget: clean up DB schema/user, .env, then sync compose
    (async () => {
      try {
        // Drop schema and all its objects
        await pool.query(`DROP SCHEMA IF EXISTS "${svc.schema_name}" CASCADE`);

        // Drop the dedicated DB user
        const db_user = `svc_${svc.name}`;
        await pool.query(`DROP USER IF EXISTS "${db_user}"`);

        // Remove credentials from host .env file
        const envKey = svc.name.toUpperCase();
        try {
          if (fs.existsSync(HOST_ENV_PATH)) {
            let content = fs.readFileSync(HOST_ENV_PATH, 'utf8');
            content = content.replace(
              new RegExp(`\\n# ${svc.name} service DB credentials.*?\\n${envKey}_DB_PASSWORD=[^\\n]*\\n`, 's'),
              ''
            );
            fs.writeFileSync(HOST_ENV_PATH, content, 'utf8');
          }
        } catch (e) {
          console.warn(`Could not update host .env file: ${e.message}`);
        }

        console.log(`Cleaned up DB and .env for ${svc.name}`);
        await syncCompose();
      } catch (err) {
        console.error('Post-delete cleanup failed:', err.message);
      }
    })();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Compose YAML generator ───────────────────────────────────────────────────

function generateComposeYaml(services) {
  const serviceBlocks = services
    .map((svc) => {
      const envKey = svc.name.toUpperCase();
      return `
  ${svc.name}:
    image: ghcr.io/\${GHCR_OWNER}/rmsb-${svc.name}-api:\${TAG:-latest}
    container_name: ${svc.container_name}
    environment:
      PORT: 3000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: \${POSTGRES_DB}
      DB_SCHEMA: ${svc.schema_name}
      DB_USER: \${${envKey}_DB_USER}
      DB_PASSWORD: \${${envKey}_DB_PASSWORD}
    depends_on:
      postgres:
        condition: service_healthy`;
    })
    .join('\n');

  const gatewayEnvRoutes = services
    .map(
      (svc) =>
        `      ${svc.name.toUpperCase()}_SERVICE_URL: http://${svc.name}:3000`
    )
    .join('\n');

  const gatewayDeps = services
    .map((svc) => `      ${svc.name}:\n        condition: service_started`)
    .join('\n');

  return `# ─────────────────────────────────────────────────────────
# docker-compose.yml  —  PRODUCTION / CI  (image-based)
# Auto-generated by the service registry — do not edit manually.
# To regenerate: activate or deactivate a service from the dashboard.
# ─────────────────────────────────────────────────────────
services:
  postgres:
    image: postgres:16-alpine
    container_name: rmsb-postgres
    environment:
      POSTGRES_USER: \${POSTGRES_USER}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: \${POSTGRES_DB}
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER} -d \${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10
${serviceBlocks}

  api-gateway:
    image: ghcr.io/\${GHCR_OWNER}/rmsb-api-gateway:\${TAG:-latest}
    container_name: rmsb-api-gateway
    ports:
      - "8080:8080"
    volumes:
      - ./.env:/app/.env.host
    environment:
      PORT: 8080
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: \${POSTGRES_USER}
      DB_PASSWORD: \${POSTGRES_PASSWORD}
      DB_NAME: \${POSTGRES_DB}
      ADMIN_EMAILS: \${ADMIN_EMAILS}
      DEPLOY_TOKEN: \${DEPLOY_TOKEN}
      GITHUB_REPO: \${GITHUB_REPO}
      GHCR_OWNER: \${GHCR_OWNER}
      FRONTEND_URL: http://frontend:5173
${gatewayEnvRoutes}
    depends_on:
      postgres:
        condition: service_healthy
${gatewayDeps}

  frontend:
    image: ghcr.io/\${GHCR_OWNER}/rmsb-frontend:\${TAG:-latest}
    container_name: rmsb-frontend
    environment:
      VITE_API_GATEWAY_URL: http://localhost:8080
    depends_on:
      - api-gateway

volumes:
  postgres_data:
`;
}

module.exports = router;
module.exports.syncCompose = syncCompose;
