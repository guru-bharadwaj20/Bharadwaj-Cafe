# syntax=docker/dockerfile:1

###############################################################################
# Stage 1 — build
#
# Installs the full dependency tree (devDependencies included, since tsc is
# one of them) and compiles TypeScript to dist/.
###############################################################################
FROM node:22-alpine AS build

WORKDIR /app

# mongodb-memory-server and redis-memory-server each run a postinstall hook that
# fetches a server binary — and redis-memory-server compiles Redis from source,
# which needs `make`, absent from this image. That failed the install outright:
#
#   /bin/sh: make: not found
#   npm error command failed
#
# Both are test-only, and this stage only runs tsc, so the fetch is skipped
# rather than papered over by installing a C toolchain that ships nothing.
ENV MONGOMS_DISABLE_POSTINSTALL=1 \
    REDISMS_DISABLE_POSTINSTALL=1

# Copied separately so the dependency layer is only rebuilt when the manifests
# change, not on every source edit.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY types ./types
COPY config ./config
COPY controllers ./controllers
COPY jobs ./jobs
COPY middleware ./middleware
COPY models ./models
COPY routes ./routes
COPY utils ./utils
COPY app.ts server.ts seeder.ts createAdmin.ts ./

RUN npm run build

###############################################################################
# Stage 2 — production dependencies only
#
# A separate install with --omit=dev, so the final image never carries
# TypeScript, ESLint, Vitest or the mongodb-memory-server binary.
###############################################################################
FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

###############################################################################
# Stage 3 — runtime
###############################################################################
FROM node:22-alpine AS runtime

# dumb-init gives the process a real init, so SIGTERM reaches Node and
# containers stop promptly instead of being killed after a timeout.
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps  --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

# Never run as root.
USER node

EXPOSE 5000

# Compose/orchestrators use this to gate traffic and restarts.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
