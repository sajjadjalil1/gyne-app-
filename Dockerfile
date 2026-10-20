# syntax=docker/dockerfile:1
# Builds the API + doctor dashboard (apps/web) only. The patient app is built by EAS, not here.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
# Only the server workspaces; Expo and React Native stay out of the image.
RUN npm ci -w apps/web -w packages/core -w packages/db --include-workspace-root --no-audit --no-fund

FROM deps AS build
COPY apps/web apps/web
COPY packages packages
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate --schema packages/db/prisma/schema.prisma
# Build never talks to the database; these values only satisfy the config checks.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" AUTH_SECRET="build-time-placeholder-not-used-at-runtime" npm run build -w apps/web

FROM node:22-bookworm-slim AS run
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* \
  && npm i -g prisma@6.16.2 --no-audit --no-fund
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/packages/db/prisma ./packages/db/prisma
COPY deploy/migrate.sh deploy/start.sh ./deploy/
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["sh", "deploy/start.sh"]
