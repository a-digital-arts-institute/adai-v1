FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json db.sql ./
COPY src/ ./src/
COPY seed/*.json ./seed/

RUN npm run build
RUN DB_PATH=/app/seed.db node dist/seed-consolidated.js

# --- runtime image ---
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY db.sql entrypoint.sh ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/seed.db ./seed.db

VOLUME ["/data"]

EXPOSE 8080

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
