# syntax=docker.io/docker/dockerfile:1

FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml*  ./
RUN  corepack enable pnpm && pnpm i --frozen-lockfile

# Setup scripts runtime dependencies
FROM base AS scripts-deps
WORKDIR /scripts-runtime
RUN corepack enable pnpm && \
    pnpm add @prisma/client commander csv-parse tsx typescript zod

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable pnpm && \
    pnpm dlx prisma generate && \
    pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable pnpm

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone build
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Setup scripts runtime
WORKDIR /scripts-runtime
COPY --from=scripts-deps /scripts-runtime/node_modules ./node_modules
COPY scripts ./scripts

# Create script runner
RUN echo '#!/bin/sh\nNODE_PATH=/scripts-runtime/node_modules exec tsx "/scripts-runtime/scripts/$@"' > /usr/local/bin/run-script && \
    chmod +x /usr/local/bin/run-script

WORKDIR /app

COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
