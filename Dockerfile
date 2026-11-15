# syntax=docker/dockerfile:1

# ---- deps: install all dependencies (dev included) ----
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Install scripts are not needed: better-sqlite3 ships prebuilt binaries,
# and esbuild resolves its platform package without its postinstall.
RUN npm ci --ignore-scripts

# ---- build: compile the Nuxt app; also used to run unit/API tests ----
FROM deps AS build
COPY . .
RUN npx nuxt prepare && npx nuxt build

# ---- runtime: minimal production image ----
FROM node:24-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    NUXT_DATABASE_PATH=/data/fitness.db
WORKDIR /app
COPY --from=build --chown=node:node /app/.output ./.output
COPY --from=build --chown=node:node /app/server/db/migrations ./server/db/migrations
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", ".output/server/index.mjs"]

# ---- e2e: Playwright runner (browsers preinstalled); version must match package.json ----
FROM mcr.microsoft.com/playwright:v1.65.1-noble AS e2e
WORKDIR /e2e
RUN npm init -y >/dev/null && npm install --ignore-scripts --no-audit --no-fund @playwright/test@1.65.1
COPY playwright.config.ts ./
COPY e2e ./e2e
CMD ["npx", "playwright", "test"]
