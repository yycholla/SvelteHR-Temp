# Hasura Security Improvements Needed

## Critical Security Issues

### 1. Hardcoded Secrets
- JWT_SECRET is hardcoded in source code
- HASURA_ADMIN_SECRET is hardcoded
- Database passwords are hardcoded

**Fix**: Use environment variables from Doppler
```typescript
const JWT_SECRET = process.env.JWT_SECRET;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;
```

### 2. No JWT Configuration in Hasura
- Missing HASURA_GRAPHQL_JWT_SECRET environment variable
- JWT verification happening in Node.js instead of Hasura
- No automatic role extraction

**Fix**: Configure Hasura JWT
```yaml
HASURA_GRAPHQL_JWT_SECRET: |
  {
    "type": "HS256",
    "key": "${JWT_SECRET}"
  }
```

### 3. Using Admin Secret for All Operations
- Auth service uses admin secret for user queries
- Should use JWT tokens for user operations
- Admin secret should only be for admin operations

### 4. Missing Permissions
- No row-level security configured
- No column-level permissions
- All data accessible via admin secret

## Performance Issues

### 1. N+1 Query Problems
- Separate queries for user roles in auth service
- Should use GraphQL joins

### 2. No Connection Pooling
- Direct database connections
- No connection limits

### 3. Missing Caching
- No query caching configured
- No CDN for static assets

## Production Readiness Issues

### 1. Development Mode Enabled
- HASURA_GRAPHQL_DEV_MODE: "true" in production will expose internal errors
- Console enabled - security risk in production

### 2. No Rate Limiting
- No query rate limiting
- No query depth limiting
- No query cost analysis

### 3. No Monitoring/Logging
- Basic logging only
- No metrics collection
- No alerting

### 4. No Backup Strategy
- No automated backups
- No point-in-time recovery