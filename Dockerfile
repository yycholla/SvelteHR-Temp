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

RUN apk update

# Install build dependencies (including Python for native modules if needed)
RUN apk add --no-cache \
  python3 \
  make \
  g++ \
  openssh-server \
  && ln -sf python3 /usr/bin/python


RUN mkdir -p /var/run/sshd
EXPOSE 22

CMD ["/usr/sbin/sshd", "-D"]
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
# Stage 2: Production Runtime with Doppler (Factor V: Release/Run)
# =============================================================================
FROM node:20-alpine AS runtime

# Install Doppler CLI for production secrets management
RUN apk add --no-cache curl gnupg && \
  curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sh

# Create non-root user for security (Factor IX: Disposability)
RUN addgroup -g 1001 -S nodejs && \
  adduser -S svelte -u 1001

# Set working directory
WORKDIR /app

# Install runtime dependencies only
COPY package*.json ./
RUN npm install --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=svelte:nodejs /app/.svelte-kit/output ./.svelte-kit/output
COPY --from=builder --chown=svelte:nodejs /app/package.json ./package.json
COPY --from=builder --chown=svelte:nodejs /app/package-lock.json ./package-lock.json

# Copy any additional runtime files needed by adapter
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
# Configure Doppler for production if token provided, then start app
CMD ["sh", "-c", "if [ -n \"$DOPPLER_TOKEN\" ]; then doppler configure set project mountainhr-frontend --scope / 2>/dev/null || true; doppler configure set config prd --scope / 2>/dev/null || true; doppler configure set token \"$DOPPLER_TOKEN\" --scope / 2>/dev/null || true; fi && node .svelte-kit/output/server/index.js"]

# =============================================================================
# Stage 3: Production without Doppler (for Docker Compose deployment)
# =============================================================================
FROM node:20-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
  adduser -S svelte -u 1001

# Set working directory
WORKDIR /app

# Install runtime dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=svelte:nodejs /app/.svelte-kit/output ./.svelte-kit/output
COPY --from=builder --chown=svelte:nodejs /app/package.json ./package.json
COPY --from=builder --chown=svelte:nodejs /app/package-lock.json ./package-lock.json

# Copy any additional runtime files needed by adapter
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

# Start the application directly (no Doppler)
CMD ["node", ".svelte-kit/output/server/index.js"]

# =============================================================================
# Development Override Stage (Factor X: Dev/Prod Parity)
# =============================================================================
FROM node:20-alpine AS development

# Install Doppler CLI for development secrets management
RUN apk add --no-cache curl gnupg && \
  curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
  adduser -S svelte -u 1001

WORKDIR /app

# Change ownership of the app directory to svelte user
RUN chown -R svelte:nodejs /app

# Switch to non-root user before installing dependencies
USER svelte

# Install all dependencies (including dev dependencies)
COPY --chown=svelte:nodejs package*.json ./
RUN npm install

# Copy source code
COPY --chown=svelte:nodejs . .

# Generate SvelteKit files
RUN npm run prepare

# Expose Vite dev server port
EXPOSE 5173

# Development environment
ENV NODE_ENV=development
ENV HOST=0.0.0.0
ENV PORT=5173

# Start development server with hot reload
# Configure Doppler project and token if provided, then start dev server
CMD ["sh", "-c", "if [ -n \"$DOPPLER_TOKEN\" ]; then doppler configure set project mountainhr-frontend --scope / 2>/dev/null || true; doppler configure set config dev --scope / 2>/dev/null || true; doppler configure set token \"$DOPPLER_TOKEN\" --scope / 2>/dev/null || true; fi && npm run dev -- --host 0.0.0.0 --port 5173"]

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
