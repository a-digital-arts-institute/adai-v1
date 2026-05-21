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

# Python + umap-learn ship in the runtime image so the daily GH Action can
# re-project the embedding space against the live /data/adai.db (the script
# is at /app/seed/_build/project_umap.py). Without this the UMAP scatter on
# /embed-space ignores any node added via the contributor API until the
# next deploy.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip python3-venv \
  && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/umap-venv \
  && /opt/umap-venv/bin/pip install --no-cache-dir 'numpy<2' umap-learn

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY db.sql entrypoint.sh SKILL.md ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/seed.db ./seed.db
# UMAP projection is read by /api/embed-space at runtime — the .bin and .json
# stay behind in the builder (their content is already baked into seed.db's
# node_embeddings table). The UMAP sidecar is the only embedding file that
# needs to ship; the daily cron writes a fresh version to
# /data/embeddings.umap2d.json which overrides this one when present.
COPY --from=builder /app/seed/embeddings.umap2d.json ./seed/embeddings.umap2d.json
# The UMAP projector script needs to run on the live machine.
COPY seed/_build/project_umap.py ./seed/_build/project_umap.py
COPY public ./public

VOLUME ["/data"]

EXPOSE 8080

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
