require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');
const pool = require('./db');
const migrate = require('./db/migrate');
const registryRouter = require('./routes/registry');
const usersRouter = require('./routes/users');
const graphRouter = require('./routes/graph');

const HOST_ENV_PATH = '/app/.env.host';
const DOCKER_SOCK   = '/var/run/docker.sock';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', gateway: 'rmsb-api-gateway' });
});

// API routes — express.json() scoped here only, so proxy routes keep their body stream intact
app.use('/api/registry', express.json(), registryRouter);
app.use('/api/users', express.json(), usersRouter);
app.use('/api/graph', express.json(), graphRouter);

// ─── Dynamic proxy routing ────────────────────────────────────────────────────

let activeServices = [];
const proxyCache = {};

async function loadServices() {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM services WHERE status = 'active'"
    );
    activeServices = rows;
    const labels = rows.map((s) => s.path_prefix).join(', ') || 'none';
    console.log(`Loaded ${rows.length} active service(s): ${labels}`);
  } catch (err) {
    console.error('Failed to load services from registry:', err.message);
  }
}

function getProxy(service) {
  const key = service.name;
  if (!proxyCache[key]) {
    proxyCache[key] = createProxyMiddleware({
      target: `http://${service.name}:3000`,
      changeOrigin: true,
      pathRewrite: { [`^${service.path_prefix}`]: '' },
      on: {
        error: (err, req, res) => {
          console.error(`Proxy error [${service.name}]:`, err.message);
          res.status(502).json({ error: `Service "${service.display_name}" is unavailable` });
        },
      },
    });
  }
  return proxyCache[key];
}

// Forward any request whose path matches a registered service prefix
app.use((req, res, next) => {
  const service = activeServices.find((s) => req.path.startsWith(s.path_prefix));
  if (!service) return next();
  getProxy(service)(req, res, next);
});

// Fallback → dashboard frontend (in Docker, gateway is the single entry point)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://frontend:5173';
app.use(createProxyMiddleware({
  target: FRONTEND_URL,
  changeOrigin: true,
  on: { error: (err, req, res) => res.status(502).json({ error: 'Frontend unavailable' }) },
}));

// ─── Startup env sync ─────────────────────────────────────────────────────────
// On startup, write any service DB credentials that are missing from the host
// .env file (happens when the volume mount wasn't present on the previous run),
// then restart the affected service containers so they pick up the new values.

function dockerPost(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ socketPath: DOCKER_SOCK, path, method: 'POST' }, (res) => {
      res.resume();
      res.on('end', resolve);
    });
    req.on('error', reject);
    req.end();
  });
}

async function syncServiceCredsToEnv() {
  if (!fs.existsSync(HOST_ENV_PATH)) return;

  const { rows } = await pool.query(
    `SELECT name, container_name, db_user, db_password FROM services WHERE db_user IS NOT NULL`
  );

  let content = fs.readFileSync(HOST_ENV_PATH, 'utf8');
  const toRestart = [];

  for (const svc of rows) {
    const envKey = svc.name.toUpperCase();
    if (!content.includes(`${envKey}_DB_USER=`)) {
      content += `\n# ${svc.name} service DB credentials (auto-provisioned)\n${envKey}_DB_USER=${svc.db_user}\n${envKey}_DB_PASSWORD=${svc.db_password}\n`;
      toRestart.push(svc.container_name);
    }
  }

  if (toRestart.length === 0) return;

  fs.writeFileSync(HOST_ENV_PATH, content, 'utf8');
  console.log(`Wrote missing DB credentials for: ${toRestart.join(', ')}`);

  for (const name of toRestart) {
    try {
      await dockerPost(`/containers/${name}/restart`);
      console.log(`Restarted ${name} with provisioned DB credentials`);
    } catch (e) {
      console.warn(`Could not restart ${name}: ${e.message}`);
    }
  }
}

// ─── Startup ──────────────────────────────────────────────────────────────────

async function start() {
  try {
    await migrate();
    await loadServices();
    // Reload every 30 s to pick up status changes without restart
    setInterval(loadServices, 30_000);
    // Write any missing service DB credentials to host .env and restart affected containers
    syncServiceCredsToEnv().catch((err) => console.warn('Credential sync failed:', err.message));
  } catch (err) {
    console.error('Startup error:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
  });
}

start();
