const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 8080;

const S1_URL = process.env.S1_SERVICE_URL || 'http://localhost:3001';
const S2_URL = process.env.S2_SERVICE_URL || 'http://localhost:3002';

app.use(cors());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', gateway: 'rmsb-api-gateway' });
});

// Route /s1/* → s1-device-management
app.use(
  '/s1',
  createProxyMiddleware({
    target: S1_URL,
    changeOrigin: true,
  })
);

// Route /s2/* → s2-capacity-planning
app.use(
  '/s2',
  createProxyMiddleware({
    target: S2_URL,
    changeOrigin: true,
  })
);

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`  /s1/* → ${S1_URL}`);
  console.log(`  /s2/* → ${S2_URL}`);
});
