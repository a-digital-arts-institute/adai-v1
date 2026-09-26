# Build with the repository root as context so canonical guard and editorial
# files are included. Dockerfile.dockerignore excludes credentials and data.
FROM mcr.microsoft.com/playwright:v1.63.0-noble AS build
WORKDIR /repo/worker
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY worker/package.json worker/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY worker/tsconfig.json ./
COPY worker/scripts ./scripts
COPY worker/src ./src
COPY src/utils/ssrf.ts src/utils/org-kinds.ts /repo/src/utils/
COPY claude/skills/relational-intelligence-protocol.md claude/skills/gatherer.md /repo/claude/skills/
RUN npm run build && test -f dist/main.js

FROM mcr.microsoft.com/playwright:v1.63.0-noble
WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY worker/package.json worker/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /repo/worker/dist ./dist
CMD ["node", "dist/main.js"]
