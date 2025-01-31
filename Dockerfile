# syntax=docker.io/docker/dockerfile:1

FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM deps AS app-deps
# Install main application dependencies
COPY package.json package-lock.json ./
RUN npm ci

# FROM deps AS script-deps
# WORKDIR /scripts
# COPY scripts/package.json scripts/package-lock.json ./
# RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=app-deps /app/node_modules ./node_modules
COPY . .

# Install Prisma CLI, run migrations, and build application
RUN --mount=type=secret,id=DATABASE_URL \
    DATABASE_URL=$(cat /run/secrets/DATABASE_URL) npm run db:deploy && \
    npm run build

# COPY --from=script-deps /scripts/node_modules ./scripts/node_modules

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone build
# COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# COPY --from=builder --chown=nextjs:nodejs /scripts ./scripts
# COPY --from=builder --chown=nextjs:nodejs /scripts/node_modules ./scripts/node_modules

WORKDIR /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
