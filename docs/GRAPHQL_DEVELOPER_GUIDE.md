# GraphQL Developer Guide - SvelteHR

**For Developers Working with the GraphQL Implementation**

This guide provides practical information for developers working with the SvelteHR GraphQL implementation, including patterns, best practices, and troubleshooting.

## 🎯 Quick Reference

### Common Patterns

#### 1. Server-Side Data Loading (Most Common)
```typescript
// src/routes/example/+page.server.ts
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { createServerClient } from '$lib/graphql/client-factory';
import { queries } from '$lib/graphql/queries';

export const load: PageServerLoad = async ({ cookies }) => {
  const token = cookies.get('hr_token');
  
  if (!token) {
    throw redirect(303, '/login');
  }

  try {
    const client = createServerClient(token);
    
    // Always verify authentication first
    const auth = await client.query(queries.auth.me);
    
    if (!auth.data?.me?.authenticated) {
      throw redirect(303, '/login');
    }
    
    const user = auth.data.me.user;
    const permissions = auth.data.me.permissions || [];
    
    // Check permissions before loading data
    const canView = permissions.includes('*') || 
      permissions.some(p => p.startsWith('resource:'));
    
    if (!canView) {
      throw error(403, { message: 'Insufficient permissions' });
    }
    
    // Load data with GraphQL
    const data = await client.query(queries.resource.list, {
      limit: 20,
      page: 1
    });
    
    return {
      user,
      permissions,
      data: data.data?.resource || []
    };
    
  } catch (err: any) {
    console.error('GraphQL error:', err);
    
    if (err.message?.includes('auth')) {
      throw redirect(303, '/login');
    }
    
    throw error(500, {
      message: `Failed to load data: ${err.message}`
    });
  }
};
```

#### 2. Real-time Component Integration
```svelte
<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    createEmployeeUpdatesStore, 
    createNotificationsStore,
    RealtimeStatus,
    NotificationToast
  } from '$lib/components/realtime';

  export let data;

  // Real-time stores
  const employeeUpdates = createEmployeeUpdatesStore();
  const notifications = createNotificationsStore(data.user.id);

  // Handle real-time updates
  $: if (employeeUpdates.data) {
    console.log('Employee updated:', employeeUpdates.data);
    // Update local state or trigger refresh
  }

  onMount(() => {
    // Initialize real-time connections
    return () => {
      // Cleanup subscriptions
      employeeUpdates.unsubscribe();
      notifications.unsubscribe();
    };
  });
</script>

<!-- Real-time status indicator -->
<RealtimeStatus compact={true} />

<!-- Dashboard content -->
<div class="dashboard">
  <!-- Your dashboard content -->
</div>

<!-- Real-time notifications -->
<NotificationToast 
  userId={data.user.id} 
  position="top-right" 
  autoHideDuration={5000} 
/>
```

#### 3. Advanced Client Usage (Browser-Side)
```typescript
// For client-side advanced features
import { createAdvancedClient } from '$lib/graphql/advanced-client.svelte';
import { queries } from '$lib/graphql/queries';

// Create advanced client
const client = createAdvancedClient('http://localhost:4001/api/graphql', {
  token: getToken(),
  enableCache: true,
  subscriptionsEndpoint: 'ws://localhost:4001/api/graphql/subscriptions'
});

// Query with advanced options
const result = await client.query(queries.employees.employees, 
  { limit: 10 },
  {
    cache: true,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: true,
    optimisticData: null,
    subscribeToUpdates: true,
    subscriptionQuery: queries.subscriptions.employeeUpdates
  }
);

// Reactive query (automatically updates)
const reactiveQuery = client.createReactiveQuery(
  queries.dashboard.stats,
  {},
  { pollInterval: 30000 } // Poll every 30 seconds
);
```

## 🔧 GraphQL Operations Reference

### Available Query Categories
```typescript
import { queries, mutations, subscriptions } from '$lib/graphql/queries';

// Authentication
queries.auth.me              // Get current user
mutations.auth.login         // Login user
mutations.auth.logout        // Logout user
mutations.auth.refresh       // Refresh token

// Employees  
queries.employees.employees  // List employees
queries.employees.employee   // Get single employee
mutations.employees.create   // Create employee
mutations.employees.update   // Update employee
mutations.employees.delete   // Delete employee

// Departments
queries.departments.departments  // List departments
queries.departments.department   // Get single department
mutations.departments.create     // Create department
mutations.departments.update     // Update department

// Dashboard
queries.dashboard.stats      // Dashboard statistics
queries.dashboard.widgets    // Dashboard widgets

// Real-time subscriptions
subscriptions.employeeUpdates    // Employee changes
subscriptions.dashboardUpdates   // Dashboard updates  
subscriptions.notifications      // User notifications
subscriptions.systemHealth       // System health
subscriptions.auditLogStream     // Audit events
```

### Query Examples
```typescript
// List employees with pagination
const employees = await client.query(queries.employees.employees, {
  page: 1,
  limit: 20,
  search: 'john',
  department_id: 'dept-123',
  status: 'active',
  sort: 'lastName',
  order: 'asc'
});

// Get single employee with full details
const employee = await client.query(queries.employees.employee, {
  id: 'emp-456'
});

// Create new employee
const newEmployee = await client.mutate(mutations.employees.create, {
  input: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    position: 'Software Engineer',
    departmentId: 'dept-123',
    hireDate: '2025-01-01'
  }
});
```

## 🔐 Authentication Patterns

### Standard Server-Side Auth Check
```typescript
// Reusable auth verification function
async function verifyAuth(token: string) {
  const client = createServerClient(token);
  const auth = await client.query(queries.auth.me);
  
  if (!auth.data?.me?.authenticated) {
    throw redirect(303, '/login');
  }
  
  return {
    user: auth.data.me.user,
    permissions: auth.data.me.permissions || [],
    client
  };
}

// Usage in page load
export const load: PageServerLoad = async ({ cookies }) => {
  const token = cookies.get('hr_token');
  if (!token) throw redirect(303, '/login');
  
  const { user, permissions, client } = await verifyAuth(token);
  
  // Continue with authorized operations...
};
```

### Permission-Based Data Access
```typescript
// Check specific permissions
function hasPermission(permissions: string[], required: string[]): boolean {
  return permissions.includes('*') || 
    required.some(perm => permissions.includes(perm));
}

// Usage
const canManageEmployees = hasPermission(permissions, [
  'employees:write', 
  'employees:*', 
  'hr:*'
]);

if (canManageEmployees) {
  // Load additional management data
  const managementData = await client.query(queries.hr.management);
}
```

## 🚀 Performance Best Practices

### 1. Query Optimization
```typescript
// ✅ Good: Use specific fields and pagination
const employees = await client.query(`
  query GetEmployees($limit: Int, $page: Int) {
    employees(limit: $limit, page: $page) {
      id
      firstName
      lastName
      email
      position
      status
    }
  }
`, { limit: 20, page: 1 });

// ❌ Avoid: Fetching all fields without pagination
const allEmployees = await client.query(`
  query GetAllEmployees {
    employees {
      id
      firstName
      lastName
      email
      phone
      address
      department { ... }
      manager { ... }
      # ... many more fields
    }
  }
`);
```

### 2. Caching Strategies
```typescript
// Use appropriate cache TTL based on data volatility
const fastChanging = await client.query(query, variables, {
  cache: true,
  cacheTTL: 30 * 1000  // 30 seconds for frequently updated data
});

const slowChanging = await client.query(query, variables, {
  cache: true,
  cacheTTL: 15 * 60 * 1000  // 15 minutes for stable data
});

// Use stale-while-revalidate for better UX
const withBackgroundRefresh = await client.query(query, variables, {
  cache: true,
  staleWhileRevalidate: true,
  cacheTTL: 5 * 60 * 1000
});
```

### 3. Subscription Management
```typescript
// ✅ Good: Clean up subscriptions
let employeeSubscription: any;

onMount(() => {
  employeeSubscription = createEmployeeUpdatesStore();
  
  return () => {
    if (employeeSubscription) {
      employeeSubscription.unsubscribe();
    }
  };
});

// ✅ Good: Conditional subscriptions
const shouldSubscribe = user.role === 'manager' || user.role === 'admin';
if (shouldSubscribe) {
  const updates = createEmployeeUpdatesStore();
}
```

## 🐛 Debugging & Troubleshooting

### Common Issues and Solutions

#### 1. Authentication Errors
```typescript
// Problem: Token expired or invalid
// Solution: Proper error handling
try {
  const result = await client.query(queries.auth.me);
} catch (error) {
  if (error.message.includes('token') || error.message.includes('auth')) {
    // Clear invalid token and redirect
    cookies.delete('hr_token', { path: '/' });
    throw redirect(303, '/login');
  }
  throw error;
}
```

#### 2. Type Errors with Generated Types
```typescript
// Problem: Type mismatch with generated GraphQL types
// Solution: Use proper type imports and null checking
import type { Employee } from '$lib/generated/graphql';

const employee: Employee | null = result.data?.employee || null;
if (employee) {
  // Safe to access employee properties
  console.log(employee.firstName);
}
```

#### 3. Subscription Connection Issues
```typescript
// Problem: WebSocket connections failing
// Solution: Check connection status and handle errors
import { realtimeManager } from '$lib/graphql/realtime.svelte';

$: connectionStatus = realtimeManager.connectionStatus;

// Handle connection issues
$: if (connectionStatus === 'error') {
  console.error('Subscription connection failed');
  // Maybe show user notification or retry
}
```

### Development Tools

#### GraphQL Query Debugging
```typescript
// Enable detailed logging
const client = createServerClient(token);
client.enableDebugLogging = true;

// Check query performance
const startTime = performance.now();
const result = await client.query(queries.employees.employees);
console.log(`Query took: ${performance.now() - startTime}ms`);

// Inspect cache performance
const metrics = client.getPerformanceMetrics();
console.log('Cache hit rate:', metrics.cacheHitRate);
```

#### Real-time Connection Monitoring
```typescript
// Monitor subscription health
const realtimeStatus = realtimeManager.getStatus();
console.log('Subscriptions active:', realtimeStatus.totalSubscriptions);
console.log('Connection health:', realtimeStatus.connected);

// Manual reconnection
if (!realtimeStatus.connected) {
  realtimeManager.reconnect();
}
```

## 🧪 Testing Patterns

### Unit Testing GraphQL Operations
```typescript
import { vi, describe, it, expect } from 'vitest';
import { createServerClient } from '$lib/graphql/client-factory';

describe('GraphQL Employee Operations', () => {
  it('should fetch employees with proper formatting', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        data: {
          employees: [
            { id: '1', firstName: 'John', lastName: 'Doe' }
          ]
        }
      })
    };

    const result = await mockClient.query('employees query');
    expect(result.data.employees).toHaveLength(1);
    expect(result.data.employees[0].firstName).toBe('John');
  });
});
```

### Integration Testing
```typescript
// Test actual GraphQL endpoint
describe('GraphQL Integration', () => {
  it('should authenticate and fetch data', async () => {
    const client = createServerClient('test-token');
    
    // Test authentication
    const auth = await client.query(queries.auth.me);
    expect(auth.data?.me?.authenticated).toBe(true);
    
    // Test data fetching
    const employees = await client.query(queries.employees.employees);
    expect(employees.data?.employees).toBeDefined();
  });
});
```

## 📝 Code Style Guidelines

### Query Naming Conventions
```typescript
// ✅ Good: Descriptive, consistent naming
queries.employees.employees      // List operation
queries.employees.employee       // Single item operation
mutations.employees.create       // Action-based naming
mutations.employees.update       // Action-based naming

// ❌ Avoid: Ambiguous or inconsistent names
queries.employees.all           // Unclear
queries.employees.get           // Generic
mutations.employees.new         // Not action-based
```

### Error Handling Standards
```typescript
// ✅ Good: Comprehensive error handling
try {
  const result = await client.query(query, variables);
  return result.data;
} catch (error: any) {
  console.error('GraphQL operation failed:', {
    query: query.slice(0, 100), // First 100 chars for debugging
    variables,
    error: error.message
  });
  
  // Handle specific error types
  if (error.message.includes('authentication')) {
    throw redirect(303, '/login');
  }
  
  if (error.message.includes('permission')) {
    throw error(403, { message: 'Access denied' });
  }
  
  // Generic error handling
  throw error(500, { message: 'Operation failed' });
}
```

### TypeScript Integration
```typescript
// ✅ Good: Use generated types
import type { Employee, CreateEmployeeInput } from '$lib/generated/graphql';

async function createEmployee(input: CreateEmployeeInput): Promise<Employee> {
  const result = await client.mutate(mutations.employees.create, { input });
  
  if (!result.data?.createEmployee) {
    throw new Error('Failed to create employee');
  }
  
  return result.data.createEmployee;
}
```

## 🔗 Additional Resources

### Documentation Files
- `GRAPHQL_MIGRATION_COMPLETE.md` - Complete migration summary
- `src/lib/graphql/README.md` - Technical implementation guide  
- `src/lib/graphql/queries.ts` - All available operations

### External Resources
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [SvelteKit Documentation](https://kit.svelte.dev/)
- [Svelte 5 Runes Guide](https://svelte.dev/docs/svelte/what-are-runes)

---

**This guide covers the most common patterns you'll need when working with the GraphQL implementation. For specific questions or advanced use cases, refer to the complete implementation files.** 🚀