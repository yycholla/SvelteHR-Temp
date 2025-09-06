# TODO(human): Review and consolidate these environment configurations into a single Doppler-managed approach

## Current Environment Files Analysis

### .env:
# Private environment variables (server-side only)
PRIVATE_API_URL=http://localhost:8080

# Development configuration
NODE_ENV=development

### .env.http:
# SvelteHR Environment Configuration for HTTP (Development)
# Use this when both frontend and backend are on HTTP

# API Configuration - HTTP for development
PUBLIC_API_URL=http://100.71.207.7:8080/api/v2
PUBLIC_WS_URL=ws://100.71.207.7:8080/api/v1/ws

# Development
NODE_ENV=development

### .env.https:
# SvelteHR Environment Configuration for HTTPS (Production-like)
# Use this when both frontend and backend are on HTTPS

# API Configuration - HTTPS for production-like development
PUBLIC_API_URL=https://100.71.207.7:8443/api/v2
PUBLIC_WS_URL=wss://100.71.207.7:8443/api/v1/ws

# Development
NODE_ENV=development

### .env.local:
# Direct HTTPS Backend (No Proxy)
# Backend running HTTPS directly with self-signed certificates

PUBLIC_API_URL=https://100.71.207.7:8443/api/v2
PUBLIC_WS_URL=wss://100.71.207.7:8443/api/v1/ws

# Development
NODE_ENV=development

### .env.local.8443:
# SvelteHR Environment Configuration for Caddy port 8443

# API Configuration - Using Caddy HTTPS proxy on port 8443 (no sudo)
# Caddy handles HTTPS termination for Tailscale, proxies to HTTP backend
PUBLIC_API_URL=https://100.71.207.7:8443/api/v2
PUBLIC_WS_URL=wss://100.71.207.7:8443/api/v1/ws

# Development
NODE_ENV=development

### .env.localhost:
# SvelteHR Environment Configuration for Local Development
# Copy this to .env.local when accessing locally

# API Configuration - Using localhost for local development
PUBLIC_API_URL=http://localhost:8080/api/v2
PUBLIC_WS_URL=ws://localhost:8080/api/v1/ws

# Development
NODE_ENV=development

### .env.local.http-test:
# Temporary HTTP configuration for testing
# This bypasses HTTPS issues to verify the API connection works

PUBLIC_API_URL=http://100.71.207.7:8080/api/v2
PUBLIC_WS_URL=ws://100.71.207.7:8080/api/v1/ws

# Development
NODE_ENV=development

### .env.tailscale:
# SvelteHR Environment Configuration for Tailscale
# Copy this to .env.local when accessing via Tailscale

# API Configuration - Using Tailscale IP for remote access
PUBLIC_API_URL=http://100.71.207.7:8080/api/v2
PUBLIC_WS_URL=ws://100.71.207.7:8080/api/v1/ws

# Development
NODE_ENV=development

## TODO(human): Configuration Consolidation Analysis

Please review the above environment files and help me identify:

1. **Core Variables**: What are the essential environment variables that actually vary between deployments?
   - All files have NODE_ENV=development (this should vary)
   - All have PUBLIC_API_URL and PUBLIC_WS_URL with different values
   - One has PRIVATE_API_URL (server-side only)

2. **Deployment Types**: What are the real deployment scenarios vs development conveniences?
   - Local development (localhost)
   - Remote development (IP addresses)
   - Production (should be different)
   - Are the IP-specific files (100.71.207.7) just development convenience?

3. **Public vs Private Config**: 
   - PUBLIC_* vars are client-side (SvelteKit exposes these to browser)
   - PRIVATE_* vars are server-side only
   - NODE_ENV affects build behavior

4. **Twelve-Factor Compliant Variables**: What should be managed in Doppler?
   - API_BASE_URL (for both public and private)
   - WS_URL (WebSocket endpoint)
   - NODE_ENV (development/staging/production)
   - Any authentication keys or secrets

Please help me create a consolidated list of environment variables that should be managed through Doppler, eliminating the need for these 8 different files.