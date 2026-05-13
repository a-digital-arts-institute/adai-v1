FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json db.sql ./
COPY src/ ./src/
# seed/ includes the embedding sidecars (embeddings.bin, embeddings.json,
# embeddings.umap2d.json). They're plain files under seed/ but the glob
# `seed/*.json` would miss embeddings.bin, so we copy the whole directory.
# CLAUDE.md documents that the sidecars are committed intentionally; .gitignore
# carries a warning against re-ignoring them.
COPY seed/ ./seed/

RUN npm run build
# seed-consolidated.ts loads nodes/edges/signals AND chains embed:derive at
# the end (when seed/embeddings.bin is present), producing a fully-populated
# seed.db with STYLE_KIN + VISUALLY_AFFINE + AI suggestions baked in.
RUN DB_PATH=/app/seed.db node dist/seed-consolidated.js

# --- runtime image ---
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY db.sql entrypoint.sh ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/seed.db ./seed.db
# UMAP projection is read by /api/embed-space at runtime — the .bin and .json
# stay behind in the builder (their content is already baked into seed.db's
# node_embeddings table). The UMAP sidecar is the only embedding file that
# needs to ship.
COPY --from=builder /app/seed/embeddings.umap2d.json ./seed/embeddings.umap2d.json
COPY public ./public

VOLUME ["/data"]

EXPOSE 8080

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
