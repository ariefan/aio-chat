# =============================================================================
# Jenny BPJS Chatbot POC - Next.js 16 Dockerfile
# =============================================================================
# Multi-stage build for optimized production deployment
# Target: dokploy on genai.technosmart.id
# =============================================================================

# Base stage - Node.js with Alpine Linux
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat curl
RUN corepack enable pnpm

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/ui/package.json ./packages/ui/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/eslint-config/node_modules ./packages/eslint-config/node_modules
COPY --from=deps /app/packages/typescript-config/node_modules ./packages/typescript-config/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source code
COPY . .

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
WORKDIR /app/apps/web
RUN pnpm build

# Production runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]

# =============================================================================
# Required Environment Variables (set in dokploy):
# =============================================================================
# DATABASE_URL - PostgreSQL connection string
# NEXTAUTH_SECRET - Random secret for NextAuth
# NEXTAUTH_URL - https://genai.technosmart.id
# TELEGRAM_BOT_TOKEN - Telegram bot token from BotFather
# OPENROUTER_API_KEY - OpenRouter API key for Gemma model
# (Optional) TOGETHERAI_API_KEY - TogetherAI fallback
# =============================================================================
