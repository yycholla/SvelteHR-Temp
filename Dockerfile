# =============================================================================
# SvelteHR Frontend Dockerfile - Production Build
# =============================================================================
#
# This Dockerfile builds production-ready SvelteKit application.
# Development environment is handled by dev-containers folder.
# Secrets are managed via Kubernetes External Secrets Operator (Doppler).
#
# BuildKit cache mounts for faster incremental builds
# =============================================================================

# =============================================================================
# Stage 1: Dependencies - Production Dependencies
# =============================================================================
FROM node:22-alpine AS deps-prod

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install production dependencies with npm ci (faster, deterministic)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# =============================================================================
# Stage 2: Dependencies - All Dependencies (for build)
# =============================================================================
FROM node:22-alpine AS deps-all

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev) with BuildKit cache
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# =============================================================================
# Stage 3: Builder - Build the application
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Copy all dependencies from deps-all
COPY --from=deps-all /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build argument for NODE_ENV
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Build the application with Vite cache mount
RUN --mount=type=cache,target=/app/node_modules/.vite \
    npx vite build

# Verify build output exists (adapter-node outputs to build/ directory)
RUN test -d /app/build || \
    (echo "Build failed: build directory not found" && exit 1)

# =============================================================================
# Stage 4: Production Runtime
# =============================================================================
FROM node:22-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S svelte -u 1001

WORKDIR /app

# Copy production dependencies from deps-prod
COPY --from=deps-prod --chown=svelte:nodejs /app/node_modules ./node_modules

# Copy package files
COPY --from=builder --chown=svelte:nodejs /app/package.json ./package.json
COPY --from=builder --chown=svelte:nodejs /app/package-lock.json ./package-lock.json

# Copy built application (adapter-node outputs to build/ directory)
COPY --from=builder --chown=svelte:nodejs /app/build ./build

# Copy runtime config files (needed for adapter-node)
COPY --chown=svelte:nodejs svelte.config.js ./
COPY --chown=svelte:nodejs vite.config.ts ./

# Switch to non-root user
USER svelte

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application (adapter-node entry point)
CMD ["node", "build"]

# =============================================================================
# Build Instructions
# =============================================================================
#
# Production Build with BuildKit:
#   DOCKER_BUILDKIT=1 docker build --target production -t sveltehr-frontend:latest .
#   docker run -p 3000:3000 sveltehr-frontend:latest
#
# Cache Benefits:
#   - npm cache: Speeds up dependency installation by 50-70%
#   - Vite cache: Speeds up builds by 60-80% on incremental changes
#   - Separate dependency layers: Better cache invalidation granularity
#
# =============================================================================
