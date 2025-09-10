# Data Model: Svelte 5 Runes Migration

**Date**: 2025-09-09  
**Feature**: Svelte 5 Runes Migration & Best Practices  
**Phase**: Phase 1 - Data Model Design  

## Overview

This document defines the data models, interfaces, and state structures for the Svelte 5 runes migration. All models are designed to work with Svelte 5's reactive system using `$state`, `$derived`, and `$effect` runes.

## Core State Models

### AuthState Model

**Purpose**: Manages user authentication and RBAC state using Svelte 5 runes

```typescript
interface AuthState {
  user: UserContext | null;
  permissions: string[];
  roles: Role[];
  loading: boolean;
  error: string | null;
}

// Runes-based implementation
let authState = $state<AuthState>({
  user: null,
  permissions: [],
  roles: [],
  loading: false,
  error: null
});

// Derived computations
export const isAuthenticated = $derived(
  authState.user !== null && authState.user?.is_active === true
);

export const userDisplayName = $derived(
  authState.user?.full_name || authState.user?.email || 'Unknown User'
);
```

**Validation Rules**:
- User must have valid `id` and `email`
- Roles array must contain valid Role objects
- Permissions array must contain valid permission strings
- Loading state managed reactively

**State Transitions**:
- `loading: false` → `loading: true` (during auth operations)
- `user: null` → `user: UserContext` (on successful login)
- `error: null` → `error: string` (on auth failure)

### CacheEntry Model

**Purpose**: Represents cached data with TTL and hit tracking for performance optimization

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  hits: number;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

// Runes-based cache implementation
let cache = $state<Map<string, CacheEntry<any>>>(new Map());
let stats = $state({ hits: 0, misses: 0 });

// Derived cache statistics
const cacheStats = $derived(() => ({
  size: cache.size,
  hits: stats.hits,
  misses: stats.misses,
  hitRate: stats.hits + stats.misses > 0 
    ? stats.hits / (stats.hits + stats.misses) 
    : 0
}));
```

**Validation Rules**:
- TTL must be positive number
- Timestamp must be valid Date.now() value
- Hits counter must be non-negative
- Data can be any serializable type

### Component Props Models

**Purpose**: Type-safe props interfaces for Svelte 5 components using $props()

```typescript
// Authentication Button Props
interface AuthButtonProps {
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'warning' | 'danger';
  size?: 'sm' | 'base' | 'lg';
  href?: string;
  class?: string;
  children?: Snippet;
}

// Preload Link Props
interface PreloadLinkProps {
  href: string;
  preloadData?: boolean;
  preloadCode?: boolean;
  hoverDelay?: number;
  class?: string;
  children?: Snippet;
}

// Usage in components
let {
  permissions = [],
  roles = [],
  requireAll = false,
  disabled = false,
  variant = 'primary',
  children,
  ...restProps
}: AuthButtonProps = $props();
```

**Validation Rules**:
- `href` must be valid route path when provided
- `permissions` and `roles` must be valid arrays
- `variant` and `size` must be from defined enum values
- Props are reactive to parent component changes

## Store Interfaces

### Reactive Store Contract

**Purpose**: Defines the interface for Svelte 5 runes-based stores

```typescript
interface ReactiveStore<T> {
  // State access (reactive)
  get current(): T;
  
  // State mutation methods
  update(updater: (value: T) => T): void;
  set(value: T): void;
  
  // Subscription for compatibility
  subscribe(callback: (value: T) => void): () => void;
}

// Example implementation
class RunesStore<T> implements ReactiveStore<T> {
  private state = $state<T>();
  
  constructor(initial: T) {
    this.state = initial;
  }
  
  get current() {
    return this.state;
  }
  
  update(updater: (value: T) => T) {
    this.state = updater(this.state);
  }
  
  set(value: T) {
    this.state = value;
  }
  
  subscribe(callback: (value: T) => void) {
    $effect(() => {
      callback(this.state);
    });
    return () => {}; // Cleanup handled by $effect
  }
}
```

### Performance Store Interface

**Purpose**: Interface for performance-related caching and preloading

```typescript
interface PerformanceStore {
  // Cache management
  cache: ReactiveCache;
  preloadedRoutes: Set<string>;
  
  // Performance metrics (reactive)
  readonly stats: CacheStats;
  readonly preloadCount: number;
  
  // Methods
  preloadRoute(href: string): Promise<void>;
  clearCache(): void;
  getCacheEntry<T>(key: string): T | null;
  setCacheEntry<T>(key: string, value: T, ttl?: number): void;
}

// Runes implementation
let preloadedRoutes = $state<Set<string>>(new Set());
let cache = new ReactiveCache();

export const performanceStore: PerformanceStore = {
  cache,
  preloadedRoutes,
  
  get stats() {
    return cache.statistics;
  },
  
  get preloadCount() {
    return preloadedRoutes.size;
  },
  
  async preloadRoute(href: string) {
    if (preloadedRoutes.has(href)) return;
    await preloadData(href);
    preloadedRoutes.add(href);
  },
  
  // ... other methods
};
```

## GraphQL Integration Models

### GraphQL Response Model

**Purpose**: Type-safe GraphQL response handling with reactive state

```typescript
interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
  extensions?: Record<string, any>;
}

interface GraphQLError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: Array<string | number>;
}

// Reactive GraphQL state
interface GraphQLState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Runes-based GraphQL hook
function useGraphQLQuery<T>(query: string, variables?: Record<string, any>): GraphQLState<T> {
  let data = $state<T | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  
  async function fetchData() {
    loading = true;
    error = null;
    
    try {
      const response = await graphqlClient.query<T>(query, variables);
      data = response.data ?? null;
      if (response.errors?.length) {
        error = response.errors[0].message;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'GraphQL query failed';
    } finally {
      loading = false;
    }
  }
  
  // Initial fetch and reactive refetch
  $effect(() => {
    fetchData();
  });
  
  return {
    get data() { return data; },
    get loading() { return loading; },
    get error() { return error; },
    refetch: fetchData
  };
}
```

### RBAC Integration Model

**Purpose**: GraphQL queries integrated with RBAC permissions

```typescript
interface RBACGraphQLQuery {
  query: string;
  variables?: Record<string, any>;
  requiredPermissions?: string[];
  requiredRoles?: string[];
}

// Permission-aware GraphQL execution
async function executeRBACQuery<T>(
  queryConfig: RBACGraphQLQuery,
  authState: AuthState
): Promise<GraphQLResponse<T>> {
  // Check permissions before executing
  if (queryConfig.requiredPermissions) {
    const hasPermission = queryConfig.requiredPermissions.some(permission =>
      authState.permissions.includes(permission)
    );
    if (!hasPermission) {
      throw new Error('Insufficient permissions for GraphQL query');
    }
  }
  
  // Execute query with auth context
  return await graphqlClient.query<T>(
    queryConfig.query, 
    {
      ...queryConfig.variables,
      userId: authState.user?.id
    }
  );
}
```

## Validation Schema

### Runtime Validation with Zod

```typescript
import { z } from 'zod';

// AuthState validation schema
const AuthStateSchema = z.object({
  user: UserContextSchema.nullable(),
  permissions: z.array(z.string()),
  roles: z.array(RoleSchema),
  loading: z.boolean(),
  error: z.string().nullable()
});

// Component props validation
const AuthButtonPropsSchema = z.object({
  permissions: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
  requireAll: z.boolean().optional(),
  disabled: z.boolean().optional(),
  variant: z.enum(['primary', 'secondary', 'tertiary', 'ghost', 'warning', 'danger']).optional(),
  size: z.enum(['sm', 'base', 'lg']).optional(),
  href: z.string().optional(),
  class: z.string().optional()
});

// Validation helpers for runes
function validateAuthState(state: unknown): AuthState {
  return AuthStateSchema.parse(state);
}

function validateProps<T>(schema: z.ZodSchema<T>, props: unknown): T {
  return schema.parse(props);
}
```

## Migration Mapping

### Legacy to Runes Conversion

| Legacy Pattern | Runes Pattern | Migration Notes |
|----------------|---------------|-----------------|
| `writable(value)` | `$state(value)` | Direct state replacement |
| `derived(store, fn)` | `$derived(fn())` | Computed value migration |
| `$: reactive = value` | `const reactive = $derived(value)` | Reactive statement conversion |
| `export let prop` | `let { prop } = $props()` | Props destructuring |
| `createEventDispatcher()` | Callback props | Event handling modernization |
| `onMount(() => {})` | `$effect(() => {})` | Lifecycle to effect |
| `store.subscribe(callback)` | `$effect(() => callback())` | Subscription to effect |

### Component Interface Migration

```typescript
// BEFORE: Traditional component
<script lang="ts">
  export let value: string;
  export let disabled = false;
  
  $: computedValue = value.toUpperCase();
  
  const dispatch = createEventDispatcher<{
    change: string;
  }>();
  
  function handleChange() {
    dispatch('change', computedValue);
  }
</script>

// AFTER: Svelte 5 runes component
<script lang="ts">
  interface Props {
    value: string;
    disabled?: boolean;
    onchange?: (value: string) => void;
  }
  
  let { 
    value, 
    disabled = false, 
    onchange 
  }: Props = $props();
  
  const computedValue = $derived(value.toUpperCase());
  
  function handleChange() {
    onchange?.(computedValue);
  }
</script>
```

## Performance Considerations

### Reactive Efficiency

- **Fine-grained Updates**: Runes provide more efficient updates than traditional stores
- **Memory Usage**: Reduced memory footprint through direct state references
- **Bundle Size**: Smaller bundle size without store boilerplate
- **Development Experience**: Better debugging and IDE support

### Caching Strategy

- **Key Generation**: Consistent cache key patterns for predictable behavior
- **TTL Management**: Automatic cleanup prevents memory leaks
- **Hit Rate Optimization**: Performance metrics guide cache tuning
- **Preload Integration**: Cache-aware preloading reduces redundant requests

---

**Data Model Status**: ✅ COMPLETE - All entities and interfaces defined  
**Validation**: ✅ Type safety and runtime validation implemented  
**Migration Path**: ✅ Clear conversion patterns established