# frontend

Vite + React shell for ReactMicroServiceBoilerPlate.

## Routes

| Path | Service |
|------|---------|
| `/s1` | S1 Device Management |
| `/s2` | S2 Capacity Planning |

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Add a new service (e.g. s3)

1. Add `src/api/s3.js`
2. Add `src/pages/S3YourService.jsx`
3. Register the route and nav link in `App.jsx`
