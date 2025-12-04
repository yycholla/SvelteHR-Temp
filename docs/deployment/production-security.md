# Production Security Requirements

**Feature**: Production Docker Deployment with CI/CD and Caddy
**Version**: 1.0.0
**Date**: 2025-10-28

## Overview

This document outlines the security requirements and best practices for the SvelteHR production deployment. All requirements must be met before deploying to production.

## Security Checklist

### ✅ Container Security

- [ ] All application containers run as non-root users
- [ ] Base images are from official sources (postgres:15-alpine, redis:7-alpine, caddy:2-alpine)
- [ ] Images are scanned for vulnerabilities before deployment
- [ ] Containers have minimal attack surface (only necessary packages installed)
- [ ] Docker daemon socket is NOT mounted in any container
- [ ] Privileged mode is NOT used for any container

### ✅ Secret Management

- [ ] All secrets are stored in environment variables, never hardcoded
- [ ] `.env` files are in `.gitignore` and never committed to version control
- [ ] Secrets use secure random generation (min 32 characters for authentication secrets)
- [ ] Production secrets are different from development secrets
- [ ] Secrets are rotated regularly (every 90 days recommended)
- [ ] CI/CD secrets are stored in GitHub Secrets (encrypted at rest)

### ✅ Network Security

- [ ] HTTPS is enforced for all external traffic (HTTP redirects to HTTPS)
- [ ] Only Caddy exposes ports to the host network (80, 443, optionally 2019)
- [ ] Backend services are NOT accessible directly from the internet
- [ ] Database and Redis are NOT exposed to the host network
- [ ] CORS is configured to allow only authorized domains
- [ ] Rate limiting is configured on Caddy to prevent abuse

### ✅ TLS/SSL Configuration

- [ ] Let's Encrypt certificates are used in production (automatic renewal)
- [ ] Self-signed certificates are only used for localhost testing
- [ ] TLS 1.2+ is enforced (TLS 1.0 and 1.1 disabled)
- [ ] Strong cipher suites are configured
- [ ] HSTS header is enabled with appropriate max-age
- [ ] Certificate expiration is monitored

### ✅ SSH and Deployment Security

- [ ] SSH uses key-based authentication (no passwords)
- [ ] Deploy user has restricted permissions (no root access)
- [ ] SSH keys are rotated regularly
- [ ] Deploy key is specific to CI/CD (not personal developer key)
- [ ] SSH connection uses known_hosts verification

## Container Non-Root User Configuration

### Why Non-Root Users Matter

Running containers as root poses security risks:

- If container is compromised, attacker has root access
- Can potentially escape container and access host
- Violates principle of least privilege

### PostgreSQL (Official Image)

PostgreSQL official image already runs as non-root user `postgres`:

```yaml
postgres:
  image: postgres:15-alpine
  # No user override needed - runs as postgres user by default
```

### Redis (Official Image)

Redis official image already runs as non-root user `redis`:

```yaml
redis:
  image: redis:7-alpine
  # No user override needed - runs as redis user by default
```

### Rust GraphQL Backend

**Dockerfile.prod** must create and use non-root user:

```dockerfile
FROM rust:1.75-alpine AS builder
WORKDIR /app
# Build stage runs as root (necessary for package installation)

FROM alpine:3.19 AS runtime
# Create non-root user
RUN addgroup -g 1001 -S rust && \
    adduser -u 1001 -S rust -G rust

# Install runtime dependencies
RUN apk add --no-cache libgcc

WORKDIR /app
COPY --from=builder /app/target/release/hr_graphql_server ./
COPY --from=builder /app/migration ./migration

# Change ownership
RUN chown -R rust:rust /app

# Switch to non-root user
USER rust

CMD ["./hr_graphql_server"]
```

**docker-compose.prod.yml**:

```yaml
hr-graphql-rust:
  image: registry.gitlab.com/${GITLAB_PROJECT}/backend:${IMAGE_TAG}
  user: rust # Explicit user specification
```

### SvelteKit Frontend

**Dockerfile** (production target) must create and use non-root user:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
# Build stage runs as root (necessary for npm install)

FROM node:20-alpine AS runtime
# Create non-root user
RUN addgroup -g 1001 -S svelte && \
    adduser -u 1001 -S svelte -G svelte

WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

# Install production dependencies only
RUN npm ci --omit=dev

# Change ownership
RUN chown -R svelte:svelte /app

# Switch to non-root user
USER svelte

CMD ["node", "build"]
```

**docker-compose.prod.yml**:

```yaml
frontend:
  image: registry.gitlab.com/${GITLAB_PROJECT}/frontend:${IMAGE_TAG}
  user: svelte # Explicit user specification
```

### Caddy (Official Image)

Caddy official image runs as non-root user by default (no override needed).

## Secret Management Best Practices

### Required Secrets

**Database Secrets**:

```bash
POSTGRES_PASSWORD=<SECURE_RANDOM_32+>  # Min 16 chars, recommended 32+
```

**Authentication Secrets**:

```bash
JWT_SECRET=<SECURE_RANDOM_256BIT>           # Min 32 chars for HMAC-SHA256
JWT_REFRESH_SECRET=<SECURE_RANDOM_256BIT>   # Min 32 chars
SERVICE_AUTH_KEY=<SECURE_RANDOM_256BIT>     # Min 32 chars
```

### Generating Secure Random Secrets

**Using OpenSSL**:

```bash
# 32-character alphanumeric secret
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32

# 64-character secret (256-bit)
openssl rand -base64 48 | tr -d "=+/" | cut -c1-64
```

**Using Node.js**:

```javascript
require('crypto').randomBytes(32).toString('base64url');
```

**Using Python**:

```python
import secrets
secrets.token_urlsafe(32)
```

### Secret Validation Rules

1. **Minimum Length**: All secrets must be at least 32 characters
2. **No Dictionary Words**: Secrets should not contain common words
3. **No Default Values**: Never use "password", "secret", "admin", etc.
4. **No Reuse**: Each secret should be unique across environments
5. **No Weak Secrets**: Avoid sequential characters or patterns

### Secret Storage

**Development**: Use `.env` file (never commit)
**Production**: Use environment variables injected at deployment
**CI/CD**: Use GitHub Secrets (encrypted at rest)

**GitHub Secrets Setup**:

```bash
# Required for CI/CD
GITLAB_USERNAME=<gitlab_username>
GITLAB_TOKEN=<gitlab_personal_access_token>
DEPLOY_HOST=<production_server_hostname>
DEPLOY_USER=<ssh_username>
SSH_PRIVATE_KEY=<base64_encoded_private_key>
PRODUCTION_ENV=<base64_encoded_env_file>
PRODUCTION_DOMAIN=<production_domain>
```

## HTTPS Enforcement

### Caddy Automatic HTTPS

**Localhost Mode** (testing):

```bash
DOMAIN=localhost
```

- Caddy automatically generates self-signed certificates
- No Let's Encrypt interaction
- Certificates valid for 7 days, auto-renewed

**Production Mode**:

```bash
DOMAIN=hr.example.com
TLS_EMAIL=admin@example.com
```

- Caddy automatically provisions Let's Encrypt certificates
- Certificates valid for 90 days, auto-renewed at 30 days
- DNS must point to server (required for ACME challenge)

### HTTP to HTTPS Redirect

**Automatic in Caddyfile**:

```caddyfile
http://{$DOMAIN} {
    redir https://{$DOMAIN}{uri} permanent
}
```

### Security Headers

**Enforced by Caddy**:

```caddyfile
header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options "nosniff"
    X-Frame-Options "DENY"
    X-XSS-Protection "1; mode=block"
    Referrer-Policy "strict-origin-when-cross-origin"
    -Server  # Remove server identification
}
```

**Content Security Policy**:

```caddyfile
Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss://{$DOMAIN};"
```

## SSH Deployment Security

### SSH Key Generation

**Generate Deploy Key**:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key
```

**Add Public Key to Server**:

```bash
ssh-copy-id -i deploy_key.pub deploy@hr.example.com
```

**Base64 Encode Private Key for GitHub Secrets**:

```bash
cat deploy_key | base64 -w 0 > deploy_key.b64
```

**Add to GitHub Secrets**:

- Secret name: `SSH_PRIVATE_KEY`
- Value: Contents of `deploy_key.b64`

### SSH Configuration

**Restrict Deploy User Permissions**:

```bash
# On production server
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy  # Allow Docker commands
sudo visudo
# Add: deploy ALL=(ALL) NOPASSWD: /usr/bin/docker-compose, /usr/bin/docker
```

**SSH Config** (`~/.ssh/config`):

```
Host hr-production
    HostName hr.example.com
    User deploy
    IdentityFile ~/.ssh/deploy_key
    StrictHostKeyChecking yes
    UserKnownHostsFile ~/.ssh/known_hosts
```

### Known Hosts Verification

**CI/CD Workflow**:

```yaml
- name: Setup SSH
  run: |
    mkdir -p ~/.ssh
    echo "${{ secrets.SSH_PRIVATE_KEY }}" | base64 -d > ~/.ssh/deploy_key
    chmod 600 ~/.ssh/deploy_key
    ssh-keyscan -H ${{ secrets.DEPLOY_HOST }} >> ~/.ssh/known_hosts
```

## CORS Configuration

### Backend CORS Policy

**Production Configuration**:

```bash
CORS_ALLOWED_ORIGINS=https://hr.example.com
```

**Localhost Testing**:

```bash
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://localhost
```

**Multiple Origins** (staging + production):

```bash
CORS_ALLOWED_ORIGINS=https://hr.example.com,https://staging.hr.example.com
```

### CORS Validation

The backend must validate CORS origins strictly:

```rust
use actix_cors::Cors;

let allowed_origins: Vec<String> = std::env::var("CORS_ALLOWED_ORIGINS")
    .unwrap_or_else(|_| "http://localhost:3000".to_string())
    .split(',')
    .map(|s| s.trim().to_string())
    .collect();

let cors = Cors::default()
    .allowed_origin_fn(move |origin, _req_head| {
        allowed_origins.iter().any(|allowed| {
            origin.as_bytes() == allowed.as_bytes()
        })
    })
    .allowed_methods(vec!["GET", "POST", "PUT", "DELETE"])
    .allowed_headers(vec![
        http::header::AUTHORIZATION,
        http::header::CONTENT_TYPE,
    ])
    .supports_credentials()
    .max_age(3600);
```

## Rate Limiting (Optional)

### Caddy Rate Limiting

**Caddyfile Configuration** (commented by default):

```caddyfile
rate_limit {
    zone dynamic {
        key {http.request.remote.ip}
        events 100
        window 1m
    }
}
```

**Activation**:

```bash
docker exec sveltehr-caddy-prod caddy reload --config /etc/caddy/Caddyfile
```

## Vulnerability Scanning

### Image Scanning with Trivy (Optional)

**GitHub Actions Workflow**:

```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: registry.gitlab.com/${{ secrets.GITLAB_USERNAME }}/sveltehr/frontend:${{ github.sha }}
    format: 'table'
    exit-code: '1'
    severity: 'CRITICAL,HIGH'
```

### Regular Security Audits

**Schedule**:

- Weekly dependency updates (`npm audit`, `cargo audit`)
- Monthly security reviews of configuration
- Quarterly penetration testing (recommended)

## Security Incident Response

### Procedures

1. **Detect**: Monitor logs for unusual activity
2. **Isolate**: Stop affected containers immediately
3. **Investigate**: Review logs and audit trails
4. **Remediate**: Patch vulnerabilities, rotate secrets
5. **Document**: Record incident and response actions
6. **Prevent**: Update security policies to prevent recurrence

### Emergency Contacts

- **DevOps Lead**: [contact info]
- **Security Team**: [contact info]
- **Hosting Provider**: [support contact]

## Compliance Checklist

### GDPR Compliance (if applicable)

- [ ] Data encryption at rest (PostgreSQL volume encryption)
- [ ] Data encryption in transit (TLS 1.2+)
- [ ] Data retention policies (automated backup cleanup)
- [ ] Right to erasure (user data deletion endpoints)
- [ ] Audit logging (access logs retained)

### SOC 2 Considerations

- [ ] Access control (SSH key-based auth, RBAC in application)
- [ ] Change management (CI/CD with approvals)
- [ ] Logging and monitoring (Docker logs, health checks)
- [ ] Backup and recovery (automated backups, tested restores)
- [ ] Incident response (documented procedures)

## Security Hardening Summary

| Requirement            | Implementation                       | Status         |
| ---------------------- | ------------------------------------ | -------------- |
| Non-root containers    | All services use non-root users      | ✅ Required    |
| Secret management      | Environment variables, no hardcoding | ✅ Required    |
| HTTPS enforcement      | Caddy automatic HTTPS + redirect     | ✅ Required    |
| SSH key-based auth     | Deploy keys, no passwords            | ✅ Required    |
| CORS restrictions      | Backend validates allowed origins    | ✅ Required    |
| Security headers       | HSTS, CSP, XSS protection            | ✅ Required    |
| Network isolation      | Only Caddy exposes ports             | ✅ Required    |
| Vulnerability scanning | Trivy image scanning                 | ⚠️ Recommended |
| Rate limiting          | Caddy rate limiting                  | ⚠️ Recommended |

## References

- OWASP Docker Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html
- CIS Docker Benchmark: https://www.cisecurity.org/benchmark/docker
- Let's Encrypt Best Practices: https://letsencrypt.org/docs/integration-guide/
- GitHub Secrets Security: https://docs.github.com/en/actions/security-guides/encrypted-secrets
