# =============================================================================
# SvelteHR Frontend Dockerfile (Twelve-Factor Compliant)
# =============================================================================
# 
# This Dockerfile follows twelve-factor principles:
# - Factor III: Config stored in environment via Doppler
# - Factor V: Strict separation of build/release/run
# - Factor X: Dev/prod parity through consistent containerization
# - Factor IX: Disposable processes with fast startup/shutdown
# - Factor XII: Admin processes as one-off commands
# =============================================================================

# =============================================================================
# Stage 1: Build Stage (Factor V: Build)
# =============================================================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies (including Python for native modules if needed)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build argument for NODE_ENV (Factor III: Config)
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Build the application (Factor V: Build phase)
# Use direct vite build to avoid Doppler dependency during build
RUN npx vite build

# =============================================================================
# Stage 2: Production Runtime (Factor V: Release/Run)
# =============================================================================
FROM node:20-alpine AS runtime

# Create non-root user for security (Factor IX: Disposability)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S svelte -u 1001

# Set working directory
WORKDIR /app

# Install runtime dependencies only
COPY package*.json ./
RUN npm install --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=svelte:nodejs /app/build ./build
COPY --from=builder --chown=svelte:nodejs /app/package.json ./package.json

# Copy any additional runtime files
COPY --chown=svelte:nodejs svelte.config.js ./
COPY --chown=svelte:nodejs vite.config.ts ./

# Switch to non-root user
USER svelte

# Expose port (SvelteKit default: 3000 for production)
EXPOSE 3000

# Environment variables (Factor III: Config from environment)
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Health check (Factor IX: Disposability - quick health validation)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the application (Factor V: Run phase)
CMD ["node", "build/index.js"]

# =============================================================================
# Development Override Stage (Factor X: Dev/Prod Parity)
# =============================================================================
FROM node:20-alpine AS development

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S svelte -u 1001

WORKDIR /app

# Install all dependencies (including dev dependencies)
COPY package*.json ./
RUN npm install

# Copy source code
COPY --chown=svelte:nodejs . .

# Switch to non-root user
USER svelte

# Expose Vite dev server port
EXPOSE 5173

# Development environment
ENV NODE_ENV=development
ENV HOST=0.0.0.0
ENV PORT=5173

# Start development server with hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# =============================================================================
# Build Instructions & Usage
# =============================================================================
# 
# Production Build:
#   docker build --target runtime -t sveltehr-frontend:latest .
#   docker run -p 3000:3000 --env-file .env sveltehr-frontend:latest
# 
# Development Build:
#   docker build --target development -t sveltehr-frontend:dev .
#   docker run -p 5173:5173 -v $(pwd):/app --env-file .env sveltehr-frontend:dev
# 
# With Doppler (Recommended):
#   docker run -p 3000:3000 -e DOPPLER_TOKEN="your_token" sveltehr-frontend:latest
# 
# =============================================================================