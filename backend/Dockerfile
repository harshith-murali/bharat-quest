# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first so this layer caches across source changes.
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Drop dev dependencies from the tree we will copy forward.
RUN npm prune --omit=dev

# ─── Runtime stage ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# dumb-init reaps zombies and forwards SIGTERM so graceful shutdown works.
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
WORKDIR /app

# Run as a non-root user.
USER node

COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node package*.json ./

EXPOSE 3001

# Liveness probe. ECS/ALB should additionally poll /ready for readiness.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
