# MountainHR Frontend Quickstart Guide

**Date**: 2025-09-10  
**Feature**: MountainHR Frontend Development  
**Purpose**: Step-by-step guide to set up, develop, and validate the HR management frontend

## Prerequisites

### System Requirements

- Node.js 18+ and npm 8+
- Docker and Docker Compose
- Doppler CLI installed and configured
- Git with SSH access to repositories

### Required Services

- GelDB running at http://localhost:5656/db/main/ext/graphql
- Redis running at localhost:6379
- Existing MountainHR-Backend schema deployed

### Environment Setup

```bash
# Verify Doppler access
doppler login
doppler setup --project mountainhr --config development

# Verify database services
make db-health
make db-logs

# Check GraphQL endpoint
curl -X POST http://localhost:5656/db/main/ext/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
```

## Development Environment Setup

### 1. Initialize SvelteKit Project

```bash
# Create SvelteKit application
npm create svelte@latest . --template skeleton --types typescript
cd /home/chanway/Projects/SvelteHR

# Install core dependencies
npm install @urql/svelte @urql/exchange-auth @urql/exchange-retry
npm install zod @graphql-codegen/cli @graphql-codegen/client-preset
npm install -D @testing-library/svelte vitest jsdom playwright

# Install UI and styling dependencies
npm install tailwindcss @tailwindcss/forms @tailwindcss/typography
npm install lucide-svelte @headlessui/svelte

# Install development tools
npm install -D @types/node eslint-plugin-svelte3
```

### 2. Configure GraphQL Code Generation

```bash
# Create GraphQL codegen configuration
cat > codegen.ts << 'EOF'
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'http://localhost:5656/db/main/ext/graphql',
  documents: ['src/**/*.{ts,svelte}'],
  ignoreNoDocuments: true,
  generates: {
    './src/gql/': {
      preset: 'client',
      config: {
        useTypeImports: true,
        scalars: {
          DateTime: 'string',
          Date: 'string',
          UUID: 'string',
          JSON: 'Record<string, any>',
        },
      },
    },
    './src/gql/schema.json': {
      plugins: ['introspection'],
    },
  },
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
};

export default config;
EOF

# Add GraphQL codegen scripts to package.json
npm pkg set scripts.codegen="graphql-codegen --config codegen.ts"
npm pkg set scripts.codegen:watch="graphql-codegen --config codegen.ts --watch"
```

### 3. Set Up Project Structure

```bash
# Create directory structure
mkdir -p src/lib/{auth,graphql,components,services,utils}
mkdir -p src/routes/{dashboard,hr,admin,api}
mkdir -p tests/{contract,integration,e2e,unit}
mkdir -p static/icons

# Create GraphQL client setup
cat > src/lib/graphql/client.ts << 'EOF'
import { createClient, cacheExchange, fetchExchange, ssrExchange } from '@urql/svelte';
import { authExchange } from '@urql/exchange-auth';
import { retryExchange } from '@urql/exchange-retry';
import { browser } from '$app/environment';

const ssr = ssrExchange({ isClient: browser });

export const createUrqlClient = (fetch?: typeof globalThis.fetch, token?: string) => {
  return createClient({
    url: '/api/graphql',
    exchanges: [
      cacheExchange,
      authExchange(async (utils) => ({
        addAuthToOperation(operation) {
          if (!token) return operation;
          return utils.appendHeaders(operation, {
            Authorization: `Bearer ${token}`,
          });
        },
        didAuthError: (error) => error.graphQLErrors?.some(e => e.extensions?.code === 'UNAUTHENTICATED'),
        async refreshAuth() {
          // Implement token refresh logic
          return { token: null };
        },
      })),
      retryExchange({
        initialDelayMs: 1000,
        maxDelayMs: 15000,
        maxNumberAttempts: 3,
      }),
      ssr,
      fetchExchange,
    ],
    fetch,
  });
};

export const ssrData = ssr.extractData();
EOF
```

### 4. Configure Environment Variables

```bash
# Set up Doppler integration
cat > src/lib/config.ts << 'EOF'
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export const config = {
  // Database
  geldbUrl: env.GELDB_URL || 'http://localhost:5656/db/main/ext/graphql',
  redisUrl: env.REDIS_URL || 'redis://localhost:6379',

  // Authentication
  jwtSecret: env.JWT_SECRET!,
  jwtExpiresIn: env.JWT_EXPIRES_IN || '15m',

  // Application
  environment: env.NODE_ENV || 'development',
  port: parseInt(env.PORT || '5173'),

  // Public config (available on client)
  public: {
    apiUrl: publicEnv.PUBLIC_API_URL || 'http://localhost:5173/api',
    appName: publicEnv.PUBLIC_APP_NAME || 'MountainHR',
  }
} as const;

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET'] as const;
for (const envVar of requiredEnvVars) {
  if (!env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
EOF

# Configure Doppler for development
echo "JWT_SECRET=$(openssl rand -base64 32)" | doppler secrets set
echo "NODE_ENV=development" | doppler secrets set
echo "PUBLIC_API_URL=http://localhost:5173/api" | doppler secrets set
echo "PUBLIC_APP_NAME=MountainHR" | doppler secrets set
```

### 5. Set Up Authentication System

```bash
# Create authentication hooks
cat > src/hooks.server.ts << 'EOF'
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { createUrqlClient } from '$lib/graphql/client';
import jwt from 'jsonwebtoken';
import { config } from '$lib/config';

const authHandler: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('auth-token');

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      event.locals.user = decoded;
      event.locals.token = token;
    } catch (error) {
      event.cookies.delete('auth-token');
    }
  }

  // Protected route check
  const protectedRoutes = ['/dashboard', '/hr', '/admin'];
  const isProtectedRoute = protectedRoutes.some(route =>
    event.url.pathname.startsWith(route)
  );

  if (isProtectedRoute && !event.locals.user) {
    throw redirect(302, `/login?redirect=${encodeURIComponent(event.url.pathname)}`);
  }

  return resolve(event);
};

export const handle = sequence(authHandler);
EOF
```

## Development Workflow

### 1. Start Development Services

```bash
# Start required backend services
make db-up

# Verify services are healthy
make db-health

# Start SvelteKit development server
doppler run -- npm run dev

# In another terminal, start GraphQL codegen watcher
doppler run -- npm run codegen:watch
```

### 2. Create First Page - Dashboard

```bash
# Create dashboard layout
cat > src/routes/dashboard/+layout.svelte << 'EOF'
<script lang="ts">
  import { setContextClient } from '@urql/svelte';
  import { createUrqlClient } from '$lib/graphql/client';
  import type { LayoutData } from './$types';

  export let data: LayoutData;

  const client = createUrqlClient(fetch, data.token);
  setContextClient(client);
</script>

<div class="min-h-screen bg-gray-50">
  <nav class="bg-white shadow">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <h1 class="text-xl font-semibold">MountainHR</h1>
        </div>
        <div class="flex items-center space-x-4">
          <span>Welcome, {data.user?.name}</span>
          <form method="POST" action="/api/auth/logout">
            <button class="text-red-600 hover:text-red-800">Logout</button>
          </form>
        </div>
      </div>
    </div>
  </nav>

  <main class="max-w-7xl mx-auto py-6 px-4">
    <slot />
  </main>
</div>
EOF

# Create dashboard page
cat > src/routes/dashboard/+page.svelte << 'EOF'
<script lang="ts">
  import { queryStore } from '@urql/svelte';
  import { graphql } from '$gql/gql';

  const DashboardQuery = graphql(`
    query GetDashboard {
      dashboardData {
        user {
          id
          displayName
          department {
            name
          }
        }
        upcomingTasks {
          id
          title
          dueDate
          priority
        }
        quickStats {
          totalEmployees
          pendingTasks
          pendingApprovals
        }
      }
    }
  `);

  $: dashboard = queryStore({ query: DashboardQuery });
</script>

<div class="space-y-6">
  <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>

  {#if $dashboard.fetching}
    <div class="animate-pulse">Loading dashboard...</div>
  {:else if $dashboard.error}
    <div class="text-red-600">Error: {$dashboard.error.message}</div>
  {:else if $dashboard.data}
    {@const data = $dashboard.data.dashboardData}

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Stats Cards -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-medium text-gray-900">Total Employees</h3>
        <p class="text-3xl font-bold text-blue-600">{data.quickStats.totalEmployees}</p>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-medium text-gray-900">Pending Tasks</h3>
        <p class="text-3xl font-bold text-yellow-600">{data.quickStats.pendingTasks}</p>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-medium text-gray-900">Pending Approvals</h3>
        <p class="text-3xl font-bold text-red-600">{data.quickStats.pendingApprovals}</p>
      </div>
    </div>

    <!-- Upcoming Tasks -->
    <div class="bg-white rounded-lg shadow">
      <div class="px-6 py-4 border-b">
        <h2 class="text-xl font-semibold">Upcoming Tasks</h2>
      </div>
      <div class="p-6">
        {#each data.upcomingTasks as task}
          <div class="flex items-center justify-between py-3 border-b last:border-b-0">
            <div>
              <h3 class="font-medium">{task.title}</h3>
              <p class="text-sm text-gray-500">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
            </div>
            <span class="px-2 py-1 text-xs rounded-full
              {task.priority === 'high' ? 'bg-red-100 text-red-800' :
               task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
               'bg-green-100 text-green-800'}">
              {task.priority}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
EOF
```

### 3. Set Up Testing Framework

```bash
# Create contract tests for GraphQL
cat > tests/contract/graphql-schema.test.ts << 'EOF'
import { test, expect } from 'vitest';
import { createUrqlClient } from '$lib/graphql/client';

test('GraphQL schema introspection', async () => {
  const client = createUrqlClient();

  const result = await client.query(`
    query {
      __schema {
        types {
          name
          kind
        }
      }
    }
  `).toPromise();

  expect(result.error).toBeUndefined();
  expect(result.data).toBeDefined();

  const types = result.data.__schema.types;
  expect(types.some(t => t.name === 'User')).toBe(true);
  expect(types.some(t => t.name === 'Task')).toBe(true);
  expect(types.some(t => t.name === 'Department')).toBe(true);
});

test('Authentication contract', async () => {
  const client = createUrqlClient();

  // This should fail without authentication
  const result = await client.query(`
    query {
      me {
        id
        email
        displayName
      }
    }
  `).toPromise();

  expect(result.error).toBeDefined();
  expect(result.error.graphQLErrors[0].extensions.code).toBe('UNAUTHENTICATED');
});
EOF

# Create integration tests
cat > tests/integration/dashboard.test.ts << 'EOF'
import { test, expect } from '@playwright/test';

test.describe('Dashboard Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication token for testing
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('loads dashboard data correctly', async ({ page }) => {
    await page.goto('/dashboard');

    // Check that main elements are present
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('[data-testid="total-employees"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-tasks"]')).toBeVisible();

    // Verify data is loaded (not showing loading state)
    await expect(page.locator('.animate-pulse')).not.toBeVisible();
  });

  test('handles GraphQL errors gracefully', async ({ page }) => {
    // Mock GraphQL error response
    await page.route('**/api/graphql', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [{ message: 'Database connection failed' }]
        })
      });
    });

    await page.goto('/dashboard');
    await expect(page.locator('.text-red-600')).toContainText('Database connection failed');
  });
});
EOF
```

### 4. Development Commands Integration

```bash
# Update package.json with all development commands
npm pkg set scripts.dev="doppler run -- vite dev"
npm pkg set scripts.build="doppler run -- vite build"
npm pkg set scripts.preview="doppler run -- vite preview"
npm pkg set scripts.test="vitest"
npm pkg set scripts.test:integration="playwright test"
npm pkg set scripts.check="svelte-kit sync && svelte-check --tsconfig ./tsconfig.json"
npm pkg set scripts.check:watch="svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch"
npm pkg set scripts.lint="prettier --plugin-search-dir . --check . && eslint ."
npm pkg set scripts.format="prettier --plugin-search-dir . --write ."

# Integrate with existing Makefile commands
cat >> Makefile << 'EOF'

# Frontend development commands
.PHONY: frontend-install frontend-dev frontend-build frontend-test

frontend-install:
	npm install

frontend-dev: db-up
	@echo "Starting frontend development server..."
	npm run dev

frontend-build:
	@echo "Building frontend for production..."
	npm run build

frontend-test:
	@echo "Running frontend tests..."
	npm run test && npm run test:integration

frontend-codegen:
	@echo "Generating GraphQL types..."
	npm run codegen
EOF
```

## Validation Checklist

### ✅ Environment Setup

- [ ] Node.js 18+ installed
- [ ] Doppler CLI configured
- [ ] GelDB service running at localhost:5656
- [ ] Redis service running at localhost:6379
- [ ] Environment variables configured

### ✅ Application Setup

- [ ] SvelteKit project initialized
- [ ] All dependencies installed
- [ ] GraphQL codegen configured
- [ ] Authentication system working
- [ ] Directory structure created

### ✅ Development Workflow

- [ ] Development server starts successfully
- [ ] GraphQL codegen generates types
- [ ] Dashboard page renders
- [ ] Authentication redirects work
- [ ] Contract tests pass
- [ ] Integration tests pass

### ✅ Integration Verification

- [ ] GraphQL endpoint accessible
- [ ] Authentication tokens valid
- [ ] Database queries return data
- [ ] Redis caching functional
- [ ] File uploads work
- [ ] Error handling graceful

## Next Steps

1. **Run Full Test Suite**: `make frontend-test`
2. **Generate Types**: `make frontend-codegen`
3. **Verify Dashboard**: Navigate to http://localhost:5173/dashboard
4. **Check GraphQL Playground**: http://localhost:5656/ui
5. **Monitor Logs**: `make db-logs` and check browser console

## Troubleshooting

### Common Issues

**GraphQL Connection Failed**

```bash
# Check GelDB service
make db-health
curl -X POST http://localhost:5656/db/main/ext/graphql -d '{"query":"{ __schema { types { name } } }"}'
```

**Authentication Errors**

```bash
# Verify JWT secret is set
doppler secrets get JWT_SECRET

# Check token expiration
node -e "console.log(require('jsonwebtoken').decode('YOUR_TOKEN_HERE'))"
```

**Build Errors**

```bash
# Clear generated files and rebuild
rm -rf src/gql .svelte-kit node_modules/.vite
npm install
npm run codegen
```

**Type Errors**

```bash
# Regenerate GraphQL types
npm run codegen
npm run check
```

This quickstart guide provides a complete foundation for MountainHR frontend development with proper integration to existing services, comprehensive testing setup, and production-ready patterns.
