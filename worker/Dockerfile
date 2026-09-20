# A(DAI) intake worker — Playwright + Chromium image. Built and pushed with
# `just deploy-worker` (flyctl deploy --build-only --push); the main app
# spawns one machine per job from this image. No long-lived machines.
#
# The image tag MUST match the playwright version in package-lock.json: the
# image ships the browser builds for exactly that release, and a newer npm
# playwright looks for a build that is not there (launch fails, every page
# silently degrades to the plain-fetch fallback — no JS, no lazy images).

# ---- build: dev deps + tsc. No `|| true` anywhere near the compile: the
# previous single-stage build set NODE_ENV=production before installing
# typescript (a devDependency, so npm skipped it), `npx tsc` then fetched the
# unrelated `tsc` package, failed, and `|| true` shipped an image with no
# dist/ (Sept 2026: "Cannot find module '/app/dist/main.js'").
FROM mcr.microsoft.com/playwright:v1.63.0-noble AS build
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npx --no-install tsc -p . && test -f dist/main.js

# ---- runtime: production deps + compiled output only.
FROM mcr.microsoft.com/playwright:v1.63.0-noble
WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist

# ADAI_URL, DRAFT_ID, JOB_KIND, INTAKE_MODEL come from the spawner's env;
# WORKER_KEY and ANTHROPIC_API_KEY from the worker app's Fly secrets.
CMD ["node", "dist/main.js"]
