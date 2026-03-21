# api-gateway

Express API Gateway for ReactMicroServiceBoilerPlate.

## Routes

| Path | Target |
|------|--------|
| `/s1/*` | s1-device-management:3001 |
| `/s2/*` | s2-capacity-planning:3002 |
| `/health` | Gateway health check |

## Run locally

```bash
npm install
npm run dev
```

## Add a new service (e.g. s3)

1. Add `S3_SERVICE_URL` to `.env`
2. Add a new `app.use('/s3', createProxyMiddleware(...))` block in `src/index.js`
