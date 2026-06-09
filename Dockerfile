FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json db.sql ./
COPY src/ ./src/
# seed/ includes the embedding sidecars (embeddings.bin, embeddings.json).
# They're plain files under seed/ but the glob `seed/*.json` would miss
# embeddings.bin, so we copy the whole directory. CLAUDE.md documents that the
# sidecars are committed intentionally; .gitignore carries a warning against
# re-ignoring them.
COPY seed/ ./seed/

RUN npm run build
# seed-consolidated.ts loads nodes/edges/signals AND chains embed:derive at
# the end (when seed/embeddings.bin is present), producing a fully-populated
# seed.db with STYLE_KIN + VISUALLY_AFFINE + AI suggestions baked in.
RUN DB_PATH=/app/seed.db node dist/seed-consolidated.js

# --- runtime image ---
FROM node:22-slim

WORKDIR /app

# Production mode: enables the immutable long-cache for `?v=`-busted static
# assets (src/index.ts ASSET_CACHE_CONTROL) and Express's prod defaults. Dev
# (npm run dev) leaves NODE_ENV unset → no-cache, so edits are picked up live.
ENV NODE_ENV=production

# curl + ca-certificates at runtime: curl for entrypoint/health warm-ups,
# ca-certificates for Litestream's HTTPS connection to R2.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Litestream — continuous WAL replication of /data/adai.db to Cloudflare R2.
# Single static binary. ca-certificates (installed above) is required at runtime
# for the HTTPS connection to R2. See litestream.yml + entrypoint.sh for wiring.
ARG LITESTREAM_VERSION=0.3.13
RUN curl -fsSL "https://github.com/benbjohnson/litestream/releases/download/v${LITESTREAM_VERSION}/litestream-v${LITESTREAM_VERSION}-linux-amd64.tar.gz" -o /tmp/litestream.tar.gz \
  && tar -C /usr/local/bin -xzf /tmp/litestream.tar.gz litestream \
  && rm /tmp/litestream.tar.gz

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY db.sql entrypoint.sh SKILL.md ./
COPY litestream.yml /etc/litestream.yml
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/seed.db ./seed.db
# The embedding sidecars (.bin/.json) stay behind in the builder — their content
# is already baked into seed.db's node_embeddings table, and nothing at runtime
# reads them directly.
COPY public ./public

# Pre-compress static JS/CSS/SVG into .br/.gz siblings so the server ships them
# with zero per-request CPU (src/index.ts negotiates Content-Encoding). Stdlib
# (node:zlib) only — no extra dependency or binary in the runtime image.
COPY scripts/precompress.mjs ./scripts/precompress.mjs
RUN node scripts/precompress.mjs public/field

VOLUME ["/data"]

EXPOSE 8080

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
