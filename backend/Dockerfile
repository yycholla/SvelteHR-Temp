# PostGraphile Backend Dockerfile
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache dumb-init curl

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S postgraphile -u 1001 -G nodejs

# Copy built application from builder stage
COPY --from=builder --chown=postgraphile:nodejs /app/dist ./dist
COPY --from=builder --chown=postgraphile:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=postgraphile:nodejs /app/package.json ./

# Switch to non-root user
USER postgraphile

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Start application with dumb-init for proper signal handling
CMD ["dumb-init", "node", "dist/server.js"]