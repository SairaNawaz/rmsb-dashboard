# ── Stage 1: Build ────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
ARG VITE_ADMIN_EMAILS
ARG VITE_APP_NAME
ARG VITE_API_GATEWAY_URL
ENV VITE_ADMIN_EMAILS=$VITE_ADMIN_EMAILS
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_API_GATEWAY_URL=$VITE_API_GATEWAY_URL
RUN npm run build

# ── Stage 2: Serve static files ───────────────────────────
FROM node:20-alpine

RUN npm install -g serve

COPY --from=build /app/dist /app/dist

EXPOSE 5173

CMD ["serve", "-s", "/app/dist", "--listen", "tcp://0.0.0.0:5173"]
