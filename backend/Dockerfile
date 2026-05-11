# ─── Spiro Rwanda Backend Dockerfile ─────────────────────────────────────────
# Multi-stage build: development stage for local dev, production stage for deploy

FROM node:20-alpine AS base
WORKDIR /app
COPY package.json ./

# ── Development Stage ─────────────────────────────────────────────────────────
FROM base AS development
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# ── Production Stage ──────────────────────────────────────────────────────────
FROM base AS production
RUN npm install --omit=dev
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
