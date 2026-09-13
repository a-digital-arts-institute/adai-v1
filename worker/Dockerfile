# A(DAI) intake worker — Playwright + Chromium image. Built and pushed with
# `just deploy-worker` (flyctl deploy --build-only --push); the main app
# spawns one machine per job from this image. No long-lived machines.
FROM mcr.microsoft.com/playwright:v1.55.0-noble

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund && npm i --no-save tsx typescript @types/node >/dev/null

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p . && npm uninstall --no-save tsx typescript @types/node >/dev/null 2>&1 || true

# ADAI_URL, DRAFT_ID, JOB_KIND, INTAKE_MODEL come from the spawner's env;
# WORKER_KEY and ANTHROPIC_API_KEY from the worker app's Fly secrets.
CMD ["node", "dist/main.js"]
