FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
COPY --from=shared . /shared
RUN ln -s /app/node_modules /node_modules && npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/dist ./dist
USER node
CMD ["node", "dist/index.js"]
