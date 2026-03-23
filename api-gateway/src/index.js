require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const pool = require('./db');
const migrate = require('./db/migrate');
const registryRouter = require('./routes/registry');
const usersRouter = require('./routes/users');
const graphRouter = require('./routes/graph');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', gateway: 'rmsb-api-gateway' });
});

// API routes
app.use('/api/registry', registryRouter);
app.use('/api/users', usersRouter);
app.use('/api/graph', graphRouter);

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
  const key = `${service.container_name}:${service.port}`;
  if (!proxyCache[key]) {
    proxyCache[key] = createProxyMiddleware({
      target: `http://${service.container_name}:${service.port}`,
      changeOrigin: true,
      pathRewrite: { [`^${service.path_prefix}`]: '' },
      on: {
        proxyReq: (proxyReq, req) => {
          if (req.body && Object.keys(req.body).length > 0) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
          }
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

// ─── Startup ──────────────────────────────────────────────────────────────────

async function start() {
  try {
    await migrate();
    await loadServices();
    // Reload every 30 s to pick up status changes without restart
    setInterval(loadServices, 30_000);
  } catch (err) {
    console.error('Startup error:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
  });
}

start();
