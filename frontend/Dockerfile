# ── Stage 1: Build ────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ── Stage 2: Serve static files ───────────────────────────
FROM node:20-alpine

RUN npm install -g serve

COPY --from=build /app/dist /app/dist

EXPOSE 5173

CMD ["serve", "-s", "/app/dist", "--listen", "tcp://0.0.0.0:5173"]
