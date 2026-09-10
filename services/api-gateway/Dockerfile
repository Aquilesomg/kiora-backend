FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ── Etapa final ────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=base /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src
COPY --from=shared . /shared

RUN ln -s /app/node_modules /node_modules && npm ci --include=dev && npm run build && npm ci --omit=dev

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

# Usar node directamente para recibir SIGTERM limpiamente
CMD ["node", "dist/index.js"]
