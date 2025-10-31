# Data Model: Production Deployment Configuration

**Feature**: Production Docker Deployment with CI/CD and Caddy
**Branch**: `040-it-is-now`
**Date**: 2025-10-28

## Overview

This document defines the data models for the production deployment system, including environment configuration schemas and deployment state transitions. These models ensure consistent configuration across environments and predictable deployment behavior.

## Environment Configuration Schema

### Core Configuration Model

```typescript
interface EnvironmentConfig {
  // Deployment Mode
  mode: 'localhost' | 'production';
  domain: string;  // 'localhost' or 'hr.example.com'

  // Database Configuration
  database: DatabaseConfig;

  // Application Services
  services: ServicesConfig;

  // Security & Authentication
  security: SecurityConfig;

  // CI/CD Configuration
  cicd: CICDConfig;

  // Optional Features
  optional: OptionalConfig;
}
```

### Database Configuration

```typescript
interface DatabaseConfig {
  // Required
  host: string;                    // 'postgres' (Docker service name)
  port: number;                    // 5432
  name: string;                    // 'hr_system'
  user: string;                    // 'postgres'
  password: string;                // SECURE_PASSWORD (randomly generated)

  // Connection Pool (SeaORM)
  maxConnections: number;          // Default: 100
  minConnections: number;          // Default: 5
  connectionTimeout: number;       // Default: 30 (seconds)
  idleTimeout: number;             // Default: 600 (seconds)

  // Backup Configuration
  backup: {
    enabled: boolean;              // true
    retentionDays: number;         // 7
    path: string;                  // '/var/backups/postgresql'
  };

  // Validation Rules
  constraints: {
    passwordMinLength: 16;
    passwordRequiresSpecialChars: true;
    userCannotBeRoot: true;
  };
}
```

### Services Configuration

```typescript
interface ServicesConfig {
  // Frontend Service
  frontend: {
    host: string;                  // '0.0.0.0'
    port: number;                  // 3000
    nodeEnv: 'production';
    buildPath: string;             // '/app/build'
  };

  // Backend GraphQL Service
  backend: {
    host: string;                  // '0.0.0.0'
    port: number;                  // 4000
    rustLog: string;               // 'info,hr_graphql_server=debug'
    corsOrigins: string[];         // ['https://hr.example.com']
  };

  // Redis Cache
  redis: {
    host: string;                  // 'redis'
    port: number;                  // 6379
    password?: string;             // Optional
    maxMemory: string;             // '256mb'
    maxMemoryPolicy: string;       // 'allkeys-lru'
  };

  // Caddy Reverse Proxy
  caddy: {
    httpPort: number;              // 80
    httpsPort: number;             // 443
    adminPort: number;             // 2019
    dataDir: string;               // '/data'
    configDir: string;             // '/config'
  };
}
```

### Security Configuration

```typescript
interface SecurityConfig {
  // JWT Authentication
  jwtSecret: string;               // SECURE_RANDOM_256BIT
  jwtRefreshSecret: string;        // SECURE_RANDOM_256BIT
  jwtExpiresIn: string;            // '15m'
  refreshExpiresIn: string;        // '7d'

  // Service Authentication
  serviceAuthKey: string;          // SECURE_RANDOM_256BIT

  // TLS/SSL
  tls: {
    mode: 'self-signed' | 'letsencrypt';
    email?: string;                // Required for Let's Encrypt
    stagingServer?: boolean;       // For testing rate limits
  };

  // CORS Policy
  cors: {
    allowedOrigins: string[];      // ['https://hr.example.com']
    allowedMethods: string[];      // ['GET', 'POST', 'PUT', 'DELETE']
    allowCredentials: boolean;     // true
  };

  // Validation Rules
  constraints: {
    secretMinLength: 32;
    secretRequiresRandomGeneration: true;
    tlsEnforcedInProduction: true;
  };
}
```

### CI/CD Configuration

```typescript
interface CICDConfig {
  // Container Registry
  registry: {
    type: 'gitlab';
    url: string;                   // 'registry.gitlab.com'
    project: string;               // 'username/sveltehr'
    username: string;              // GitLab username
    token: string;                 // GitLab personal access token (stored in GitHub Secrets)
  };

  // Deployment Target
  deployment: {
    host: string;                  // Production server IP/hostname
    port: number;                  // SSH port (22)
    user: string;                  // Deployment user
    sshKey: string;                // SSH private key (stored in GitHub Secrets)
    deployPath: string;            // '/opt/sveltehr'
  };

  // GitHub Actions Secrets (stored in repository settings)
  githubSecrets: {
    GITLAB_USERNAME: string;
    GITLAB_TOKEN: string;
    DEPLOY_HOST: string;
    DEPLOY_USER: string;
    SSH_PRIVATE_KEY: string;
    PRODUCTION_ENV: string;        // Base64-encoded .env file
  };

  // Image Tags
  imageTags: {
    latest: boolean;               // true
    commitSha: boolean;            // true (e.g., sha-abc1234)
    semver?: string;               // Optional (e.g., v1.2.3)
  };
}
```

### Optional Configuration

```typescript
interface OptionalConfig {
  // Monitoring & Observability
  monitoring?: {
    enabled: boolean;
    sentryDsn?: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    metricsEnabled: boolean;
  };

  // Email Notifications (for CI/CD alerts)
  email?: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
  };

  // Feature Flags
  features?: {
    analyticsEnabled: boolean;
    maintenanceMode: boolean;
    debugMode: boolean;
  };

  // Resource Limits (commented examples in docker-compose.prod.yml)
  resourceLimits?: {
    postgres: { memory: string; cpus: string; };
    redis: { memory: string; cpus: string; };
    backend: { memory: string; cpus: string; };
    frontend: { memory: string; cpus: string; };
    caddy: { memory: string; cpus: string; };
  };
}
```

## Environment Variable Mapping

### .env.example Structure

```bash
# ============================================================================
# SvelteHR Production Environment Configuration
# ============================================================================
# Copy this file to .env and fill in actual values
# NEVER commit .env to version control
# ============================================================================

# --- Deployment Mode ---
# Options: 'localhost' (self-signed SSL) or domain name (Let's Encrypt SSL)
DOMAIN=localhost

# --- Database Configuration ---
POSTGRES_DB=hr_system
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<GENERATE_32_CHAR_RANDOM>  # Use: openssl rand -base64 32
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}

# Database Pool Settings (Optional - defaults provided)
DB_MAX_CONNECTIONS=100
DB_MIN_CONNECTIONS=5
DB_CONNECTION_TIMEOUT=30
DB_IDLE_TIMEOUT=600

# --- Redis Configuration ---
REDIS_URL=redis://redis:6379
# REDIS_PASSWORD=<OPTIONAL>  # Uncomment if using Redis auth

# --- Application Secrets ---
JWT_SECRET=<GENERATE_256BIT_RANDOM>           # Use: openssl rand -base64 32
JWT_REFRESH_SECRET=<GENERATE_256BIT_RANDOM>  # Use: openssl rand -base64 32
SERVICE_AUTH_KEY=<GENERATE_256BIT_RANDOM>    # Use: openssl rand -base64 32

# --- Service Ports ---
FRONTEND_PORT=3000
BACKEND_PORT=4000
POSTGRES_PORT=5432
REDIS_PORT=6379
CADDY_HTTP_PORT=80
CADDY_HTTPS_PORT=443

# --- Application URLs ---
PUBLIC_API_URL=http://hr-graphql-rust:4000   # Internal Docker network URL
VITE_API_URL=http://hr-graphql-rust:4000     # Build-time variable

# --- CORS Configuration ---
CORS_ALLOWED_ORIGINS=https://${DOMAIN}       # Comma-separated for multiple

# --- Logging ---
RUST_LOG=info,hr_graphql_server=debug,sea_orm=warn
LOG_LEVEL=info
NODE_ENV=production

# --- TLS/SSL (for Let's Encrypt mode) ---
# TLS_EMAIL=admin@example.com                # Required when DOMAIN != localhost
# TLS_STAGING=false                          # Set true for testing rate limits

# --- Backup Configuration ---
BACKUP_RETENTION_DAYS=7
BACKUP_PATH=/var/backups/postgresql

# --- Optional: Monitoring ---
# SENTRY_DSN=https://...                     # Optional error tracking
# ANALYTICS_ENABLED=true

# --- Optional: Email Notifications ---
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=notifications@example.com
# SMTP_PASSWORD=<SMTP_PASSWORD>
# FROM_EMAIL=noreply@example.com

# ============================================================================
# CI/CD Secrets (DO NOT PUT IN .env - use GitHub Secrets instead)
# ============================================================================
# GITLAB_USERNAME=<your_gitlab_username>
# GITLAB_TOKEN=<gitlab_personal_access_token>
# DEPLOY_HOST=<production_server_ip>
# DEPLOY_USER=<deployment_user>
# SSH_PRIVATE_KEY=<base64_encoded_ssh_key>
```

### Validation Schema (Zod)

```typescript
import { z } from 'zod';

const EnvSchema = z.object({
  // Deployment Mode
  DOMAIN: z.string().min(1),

  // Database
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1).refine(val => val !== 'root', {
    message: 'Database user cannot be root'
  }),
  POSTGRES_PASSWORD: z.string().min(16),
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // Secrets
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  SERVICE_AUTH_KEY: z.string().min(32),

  // Ports
  FRONTEND_PORT: z.coerce.number().int().min(1024).max(65535).default(3000),
  BACKEND_PORT: z.coerce.number().int().min(1024).max(65535).default(4000),

  // URLs
  PUBLIC_API_URL: z.string().url(),
  VITE_API_URL: z.string().url(),

  // CORS
  CORS_ALLOWED_ORIGINS: z.string().min(1),

  // Logging
  RUST_LOG: z.string().default('info'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NODE_ENV: z.enum(['development', 'production']).default('production'),

  // Optional
  SENTRY_DSN: z.string().url().optional(),
  TLS_EMAIL: z.string().email().optional(),
  TLS_STAGING: z.coerce.boolean().default(false),
});

export type Environment = z.infer<typeof EnvSchema>;
```

## Deployment State Model

### Service State Machine

```typescript
enum ServiceState {
  STOPPED = 'stopped',
  STARTING = 'starting',
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  RESTARTING = 'restarting',
}

interface ServiceStateTransition {
  from: ServiceState;
  to: ServiceState;
  trigger: string;
  conditions?: string[];
  actions?: string[];
}

const SERVICE_TRANSITIONS: ServiceStateTransition[] = [
  {
    from: ServiceState.STOPPED,
    to: ServiceState.STARTING,
    trigger: 'docker compose up',
    actions: ['Pull image', 'Create container', 'Start process']
  },
  {
    from: ServiceState.STARTING,
    to: ServiceState.HEALTHY,
    trigger: 'Health check passes',
    conditions: ['Health endpoint returns 200', 'All dependencies ready'],
    actions: ['Mark service ready', 'Update load balancer']
  },
  {
    from: ServiceState.HEALTHY,
    to: ServiceState.DEGRADED,
    trigger: 'Health check fails once',
    actions: ['Log warning', 'Increment failure counter']
  },
  {
    from: ServiceState.DEGRADED,
    to: ServiceState.HEALTHY,
    trigger: 'Health check passes',
    actions: ['Reset failure counter', 'Log recovery']
  },
  {
    from: ServiceState.DEGRADED,
    to: ServiceState.UNHEALTHY,
    trigger: 'Health check fails 3 times',
    conditions: ['Retry limit exceeded'],
    actions: ['Mark service down', 'Trigger restart policy']
  },
  {
    from: ServiceState.UNHEALTHY,
    to: ServiceState.RESTARTING,
    trigger: 'Restart policy activated',
    actions: ['Stop container', 'Remove container', 'Create new container']
  },
  {
    from: ServiceState.RESTARTING,
    to: ServiceState.STARTING,
    trigger: 'Container created',
    actions: ['Start new container instance']
  },
];
```

### Container Registry State

```typescript
enum RegistryState {
  NOT_BUILT = 'not_built',
  BUILDING = 'building',
  BUILD_FAILED = 'build_failed',
  BUILT = 'built',
  PUSHING = 'pushing',
  PUSH_FAILED = 'push_failed',
  PUSHED = 'pushed',
  PULLING = 'pulling',
  PULL_FAILED = 'pull_failed',
  PULLED = 'pulled',
  DEPLOYED = 'deployed',
}

interface ImageMetadata {
  repository: string;          // 'registry.gitlab.com/username/sveltehr'
  name: string;                // 'frontend' or 'backend'
  tags: string[];              // ['latest', 'sha-abc1234']
  digest: string;              // 'sha256:...'
  size: number;                // Bytes
  createdAt: Date;
  pushedAt: Date;
  state: RegistryState;
}
```

### Migration State Machine

```typescript
enum MigrationState {
  PENDING = 'pending',
  BACKUP_STARTED = 'backup_started',
  BACKUP_COMPLETE = 'backup_complete',
  BACKUP_FAILED = 'backup_failed',
  MIGRATION_STARTED = 'migration_started',
  MIGRATION_COMPLETE = 'migration_complete',
  MIGRATION_FAILED = 'migration_failed',
  ROLLBACK_STARTED = 'rollback_started',
  ROLLBACK_COMPLETE = 'rollback_complete',
  ROLLBACK_FAILED = 'rollback_failed',
}

interface MigrationExecution {
  id: string;
  timestamp: Date;
  state: MigrationState;
  backupPath?: string;
  backupSize?: number;
  migrationFiles: string[];
  duration?: number;
  error?: string;
}

const MIGRATION_TRANSITIONS: StateTransition[] = [
  {
    from: MigrationState.PENDING,
    to: MigrationState.BACKUP_STARTED,
    trigger: 'CI/CD deployment step',
    actions: ['Execute pg_dump', 'Create timestamp backup file']
  },
  {
    from: MigrationState.BACKUP_STARTED,
    to: MigrationState.BACKUP_COMPLETE,
    trigger: 'pg_dump succeeds',
    conditions: ['Backup file exists', 'Backup size > 0'],
    actions: ['Verify backup integrity', 'Log backup path']
  },
  {
    from: MigrationState.BACKUP_COMPLETE,
    to: MigrationState.MIGRATION_STARTED,
    trigger: 'Backup verified',
    actions: ['Run SeaORM migration', 'Apply pending migrations']
  },
  {
    from: MigrationState.MIGRATION_STARTED,
    to: MigrationState.MIGRATION_COMPLETE,
    trigger: 'All migrations applied',
    conditions: ['No migration errors', 'Schema version updated'],
    actions: ['Log migration success', 'Cleanup old backups']
  },
  {
    from: MigrationState.MIGRATION_STARTED,
    to: MigrationState.MIGRATION_FAILED,
    trigger: 'Migration error',
    actions: ['Log error', 'Stop deployment', 'Alert operators']
  },
  {
    from: MigrationState.MIGRATION_FAILED,
    to: MigrationState.ROLLBACK_STARTED,
    trigger: 'Manual rollback command',
    actions: ['Load backup file', 'Drop database', 'Restore from backup']
  },
];
```

### Health Check State

```typescript
interface HealthCheckConfig {
  endpoint: string;            // '/health' or 'pg_isready'
  interval: number;            // Seconds between checks
  timeout: number;             // Max time to wait for response
  retries: number;             // Failed attempts before unhealthy
  startPeriod: number;         // Grace period on startup
}

interface HealthCheckResult {
  timestamp: Date;
  service: string;
  status: 'healthy' | 'unhealthy' | 'starting';
  responseTime: number;        // Milliseconds
  consecutiveFailures: number;
  lastError?: string;
}

// Service-specific health checks
const HEALTH_CHECKS: Record<string, HealthCheckConfig> = {
  postgres: {
    endpoint: 'pg_isready -U postgres -d hr_system',
    interval: 10,
    timeout: 5,
    retries: 5,
    startPeriod: 30
  },
  redis: {
    endpoint: 'redis-cli ping',
    interval: 10,
    timeout: 3,
    retries: 3,
    startPeriod: 10
  },
  backend: {
    endpoint: 'http://localhost:4000/health',
    interval: 30,
    timeout: 10,
    retries: 3,
    startPeriod: 60
  },
  frontend: {
    endpoint: 'http://localhost:3000/health',
    interval: 30,
    timeout: 10,
    retries: 3,
    startPeriod: 30
  },
  caddy: {
    endpoint: 'http://localhost:2019/config/',
    interval: 30,
    timeout: 5,
    retries: 3,
    startPeriod: 10
  }
};
```

### Deployment Workflow State

```typescript
enum DeploymentState {
  IDLE = 'idle',
  TRIGGERED = 'triggered',
  LINTING = 'linting',
  TESTING = 'testing',
  BUILDING = 'building',
  PUSHING = 'pushing',
  DEPLOYING = 'deploying',
  VERIFYING = 'verifying',
  COMPLETE = 'complete',
  FAILED = 'failed',
  ROLLING_BACK = 'rolling_back',
}

interface DeploymentExecution {
  id: string;
  commitSha: string;
  branch: string;
  triggeredBy: string;
  triggeredAt: Date;
  state: DeploymentState;
  stages: {
    lint: { status: 'pending' | 'running' | 'passed' | 'failed'; duration?: number };
    test: { status: 'pending' | 'running' | 'passed' | 'failed'; duration?: number };
    build: { status: 'pending' | 'running' | 'passed' | 'failed'; duration?: number };
    push: { status: 'pending' | 'running' | 'passed' | 'failed'; duration?: number };
    deploy: { status: 'pending' | 'running' | 'passed' | 'failed'; duration?: number };
    verify: { status: 'pending' | 'running' | 'passed' | 'failed'; duration?: number };
  };
  imageDigests: {
    frontend?: string;
    backend?: string;
  };
  error?: string;
  completedAt?: Date;
}
```

## Data Persistence

### Docker Volumes

```typescript
interface VolumeConfig {
  name: string;
  driver: 'local' | 'nfs' | 's3';
  mountPath: string;
  size?: string;
  backup: boolean;
  retentionDays?: number;
}

const PRODUCTION_VOLUMES: VolumeConfig[] = [
  {
    name: 'postgres_data',
    driver: 'local',
    mountPath: '/var/lib/postgresql/data',
    backup: true,
    retentionDays: 30
  },
  {
    name: 'redis_data',
    driver: 'local',
    mountPath: '/data',
    backup: false  // Redis is cache, not source of truth
  },
  {
    name: 'caddy_data',
    driver: 'local',
    mountPath: '/data',
    backup: false  // Let's Encrypt certificates auto-renew
  },
  {
    name: 'caddy_config',
    driver: 'local',
    mountPath: '/config',
    backup: false
  },
  {
    name: 'backup_storage',
    driver: 'local',
    mountPath: '/var/backups/postgresql',
    backup: false,
    retentionDays: 7
  }
];
```

## Validation & Constraints

### Environment Variable Validation

```typescript
// Runtime validation in Rust backend
use std::env;

fn validate_environment() -> Result<(), String> {
    // Required variables
    let required = [
        "POSTGRES_DB",
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "JWT_SECRET",
        "JWT_REFRESH_SECRET",
        "SERVICE_AUTH_KEY",
    ];

    for var in required {
        env::var(var).map_err(|_| format!("Missing required variable: {}", var))?;
    }

    // Password strength
    let password = env::var("POSTGRES_PASSWORD")?;
    if password.len() < 16 {
        return Err("POSTGRES_PASSWORD must be at least 16 characters".to_string());
    }

    // JWT secret strength
    let jwt_secret = env::var("JWT_SECRET")?;
    if jwt_secret.len() < 32 {
        return Err("JWT_SECRET must be at least 32 characters".to_string());
    }

    Ok(())
}
```

### Domain Validation

```typescript
function validateDomain(domain: string): { valid: boolean; mode: 'localhost' | 'production' } {
  if (domain === 'localhost' || domain.endsWith('.localhost')) {
    return { valid: true, mode: 'localhost' };
  }

  // Production domain validation
  const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
  if (!domainRegex.test(domain)) {
    return { valid: false, mode: 'production' };
  }

  return { valid: true, mode: 'production' };
}
```

## Summary

This data model provides:

✅ **Comprehensive environment configuration** with validation schemas
✅ **Clear state machines** for services, migrations, and deployments
✅ **Type-safe configuration** with TypeScript interfaces and Zod schemas
✅ **Deployment workflow tracking** with detailed state transitions
✅ **Health check definitions** for all services
✅ **Volume management** with backup strategies
✅ **Validation rules** to prevent misconfigurations

These models ensure consistent, predictable production deployments with proper error handling and state management.
