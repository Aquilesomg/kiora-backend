# ── Etapa base ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# ── Etapa final ────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=base /app/node_modules ./node_modules
COPY . .

RUN chmod +x entrypoint.sh

USER appuser

EXPOSE 3002

ENTRYPOINT ["/app/entrypoint.sh"]
