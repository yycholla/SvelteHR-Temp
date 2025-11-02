# =============================================================================
# SvelteHR Frontend Dockerfile - Optimized for CI/CD
# =============================================================================
#
# This Dockerfile follows twelve-factor principles with BuildKit optimization:
# - Factor III: Config stored in environment via Doppler
# - Factor V: Strict separation of build/release/run
# - Factor X: Dev/prod parity through consistent containerization
# - Factor IX: Disposable processes with fast startup/shutdown
# - Factor XII: Admin processes as one-off commands
#
# BuildKit cache mounts for faster incremental builds
# =============================================================================

# =============================================================================
# Stage 1: Dependencies - Production Dependencies (most stable layer)
# =============================================================================
FROM node:22-alpine AS deps-prod

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install production dependencies with npm ci (faster, deterministic)
# If package-lock.json doesn't exist, CI will generate it first
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# =============================================================================
# Stage 2: Dependencies - All Dependencies (includes dev deps)
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

# Verify build output exists
RUN test -d /app/.svelte-kit/output || \
    (echo "Build failed: .svelte-kit/output directory not found" && exit 1)

# =============================================================================
# Stage 4: Runtime with Doppler (Factor V: Release/Run)
# =============================================================================
FROM node:22-alpine AS runtime

# Install Doppler CLI for production secrets management
RUN apk add --no-cache curl gnupg && \
    curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sh

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S svelte -u 1001

WORKDIR /app

# Copy production dependencies from deps-prod
COPY --from=deps-prod --chown=svelte:nodejs /app/node_modules ./node_modules

# Copy package files
COPY --from=builder --chown=svelte:nodejs /app/package.json ./package.json
COPY --from=builder --chown=svelte:nodejs /app/package-lock.json ./package-lock.json

# Copy built application from builder
COPY --from=builder --chown=svelte:nodejs /app/.svelte-kit/output ./.svelte-kit/output

# Copy runtime config files
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
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the application with optional Doppler configuration
CMD ["sh", "-c", "if [ -n \"$DOPPLER_TOKEN\" ]; then doppler configure set project mountainhr-frontend --scope / 2>/dev/null || true; doppler configure set config prd --scope / 2>/dev/null || true; doppler configure set token \"$DOPPLER_TOKEN\" --scope / 2>/dev/null || true; fi && node .svelte-kit/output/server/index.js"]

# =============================================================================
# Stage 5: Production without Doppler (for Docker Compose deployment)
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

# Copy built application (use consistent output directory)
COPY --from=builder --chown=svelte:nodejs /app/.svelte-kit/output ./.svelte-kit/output

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

# Start the application
CMD ["node", ".svelte-kit/output/server/index.js"]

# =============================================================================
# Stage 6: Development Override (Factor X: Dev/Prod Parity)
# =============================================================================
FROM node:22-alpine AS development

# Install Doppler CLI for development secrets management
RUN apk add --no-cache curl gnupg && \
    curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S svelte -u 1001

WORKDIR /app

# Change ownership of the app directory
RUN chown -R svelte:nodejs /app

# Switch to non-root user
USER svelte

# Copy package files
COPY --chown=svelte:nodejs package*.json ./

# Install all dependencies with cache mount
RUN --mount=type=cache,target=/home/svelte/.npm \
    npm ci

# Copy source code
COPY --chown=svelte:nodejs . .

# Generate SvelteKit files with Vite cache mount
RUN --mount=type=cache,target=/app/node_modules/.vite \
    npm run prepare

# Expose Vite dev server port
EXPOSE 5173

# Development environment
ENV NODE_ENV=development
ENV HOST=0.0.0.0
ENV PORT=5173

# Healthcheck for development mode (Vite dev server)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5173/ || exit 1

# Start development server with hot reload
# Note: Tilt will sync source files directly, so changes appear instantly
CMD ["sh", "-c", "if [ -n \"$DOPPLER_TOKEN\" ]; then doppler configure set project mountainhr-frontend --scope / 2>/dev/null || true; doppler configure set config dev --scope / 2>/dev/null || true; doppler configure set token \"$DOPPLER_TOKEN\" --scope / 2>/dev/null || true; fi && exec npm run dev -- --host 0.0.0.0 --port 5173"]

# =============================================================================
# Build Instructions & Usage
# =============================================================================
#
# Production Build with BuildKit (recommended):
#   DOCKER_BUILDKIT=1 docker build --target runtime -t sveltehr-frontend:latest .
#   docker run -p 3000:3000 --env-file .env sveltehr-frontend:latest
#
# Production without Doppler:
#   DOCKER_BUILDKIT=1 docker build --target production -t sveltehr-frontend:latest .
#
# Development Build:
#   DOCKER_BUILDKIT=1 docker build --target development -t sveltehr-frontend:dev .
#   docker run -p 5173:5173 -v $(pwd):/app --env-file .env sveltehr-frontend:dev
#
# With Doppler Token:
#   docker run -p 3000:3000 -e DOPPLER_TOKEN="your_token" sveltehr-frontend:latest
#
# Cache Benefits:
#   - npm cache: Speeds up dependency installation by 50-70%
#   - Vite cache: Speeds up builds by 60-80% on incremental changes
#   - Separate dependency layers: Better cache invalidation granularity
#
# =============================================================================
