# Svelte 5 Runes Development Guide

**SvelteHR Project - Comprehensive Runes Implementation Guide**

This guide covers all the Svelte 5 runes patterns, utilities, and best practices implemented in the SvelteHR project. Use this as your reference for understanding and extending the runes-based architecture.

## 📚 Table of Contents

1. [Core Runes Overview](#core-runes-overview)
2. [Store Migration Patterns](#store-migration-patterns)
3. [Component Migration Patterns](#component-migration-patterns)
4. [Advanced Utilities](#advanced-utilities)
5. [Performance Patterns](#performance-patterns)
6. [Testing Patterns](#testing-patterns)
7. [Best Practices](#best-practices)
8. [Common Pitfalls](#common-pitfalls)

## 🚀 Core Runes Overview

### 1. `$state()` - Reactive State
Replace `writable()` stores with `$state()` for local component state or class-based stores.

```typescript
// ❌ Traditional Svelte
import { writable } from 'svelte/store';
const count = writable(0);

// ✅ Svelte 5 Runes
let count = $state(0);

// For complex state
let user = $state({
  name: '',
  email: '',
  preferences: {}
});
```

### 2. `$derived()` - Computed Values
Replace `derived()` stores and reactive statements with `$derived()`.

```typescript
// ❌ Traditional Svelte
import { derived } from 'svelte/store';
const doubled = derived(count, $count => $count * 2);

// ✅ Svelte 5 Runes
const doubled = $derived(count * 2);

// Complex computations
const processedData = $derived(() => {
  if (!data.length) return [];
  return data
    .filter(item => item.active)
    .map(item => ({ ...item, processed: true }))
    .sort((a, b) => a.name.localeCompare(b.name));
});
```

### 3. `$effect()` - Side Effects
Replace lifecycle functions like `onMount`, `onDestroy` with `$effect()`.

```typescript
// ❌ Traditional Svelte
import { onMount, onDestroy } from 'svelte';

let unsubscribe: () => void;
onMount(() => {
  unsubscribe = someStore.subscribe(value => {
    // handle changes
  });
});
onDestroy(() => unsubscribe?.());

// ✅ Svelte 5 Runes
$effect(() => {
  // This runs when dependencies change
  console.log('Count changed:', count);
  
  // Return cleanup function
  return () => {
    console.log('Cleaning up effect');
  };
});
```

### 4. `$props()` - Component Props
Replace `export let` declarations with `$props()` destructuring.

```typescript
// ❌ Traditional Svelte
export let data: Employee[];
export let onSelect: (employee: Employee) => void = () => {};
export let disabled: boolean = false;

// ✅ Svelte 5 Runes
interface Props {
  data: Employee[];
  onSelect?: (employee: Employee) => void;
  disabled?: boolean;
}

let { data, onSelect = () => {}, disabled = false }: Props = $props();
```

### 5. `$bindable()` - Two-way Binding
For props that need to be bindable from parent components.

```typescript
interface Props {
  value: string;
  selectedItems?: Item[];
}

let { value = $bindable(), selectedItems = $bindable([]) }: Props = $props();

// Parent can now use: bind:value={someValue} bind:selectedItems={items}
```

## 🔄 Store Migration Patterns

### Traditional Store to Runes Class
Convert traditional stores to class-based state managers using runes.

```typescript
// ❌ Traditional Store (auth.ts)
import { writable, derived } from 'svelte/store';

export const user = writable<User | null>(null);
export const permissions = writable<string[]>([]);
export const isAuthenticated = derived(user, $user => $user !== null);

// ✅ Runes Class (auth.svelte.ts)
class AuthManager {
  private _user = $state<User | null>(null);
  private _permissions = $state<string[]>([]);
  
  // Computed values
  readonly isAuthenticated = $derived(this._user !== null);
  readonly hasAdminAccess = $derived(() => 
    this._permissions.includes('admin:*') || this._permissions.includes('*')
  );
  
  // Getters for external access
  get user() { return this._user; }
  get permissions() { return this._permissions; }
  
  // Methods
  setUser(user: User | null, permissions: string[] = []) {
    this._user = user;
    this._permissions = permissions;
  }
  
  checkPermission(permission: string): boolean {
    return this._permissions.includes('*') || this._permissions.includes(permission);
  }
}

export const authManager = new AuthManager();
```

### File Naming Convention
Use `.svelte.ts` extension for files containing runes that aren't Svelte components.

- `stores/auth.svelte.ts` - Contains runes
- `stores/auth.ts` - Traditional stores (no runes)
- `components/Button.svelte` - Svelte components

## 🎨 Component Migration Patterns

### Basic Component Migration

```svelte
<!-- ❌ Traditional Svelte Component -->
<script lang="ts">
  import type { Employee } from '$lib/types';
  
  export let employees: Employee[] = [];
  export let onSelect: (employee: Employee) => void = () => {};
  export let loading: boolean = false;
  
  let selectedId: string | null = null;
  $: filteredEmployees = employees.filter(emp => emp.active);
  
  function handleSelect(employee: Employee) {
    selectedId = employee.id;
    onSelect(employee);
  }
</script>

<!-- ✅ Svelte 5 Runes Component -->
<script lang="ts">
  import type { Employee } from '$lib/types';
  
  interface Props {
    employees?: Employee[];
    onSelect?: (employee: Employee) => void;
    loading?: boolean;
  }
  
  let { 
    employees = [], 
    onSelect = () => {}, 
    loading = false 
  }: Props = $props();
  
  let selectedId = $state<string | null>(null);
  const filteredEmployees = $derived(() => employees.filter(emp => emp.active));
  
  function handleSelect(employee: Employee) {
    selectedId = employee.id;
    onSelect(employee);
  }
</script>
```

### Form Component with Binding

```svelte
<script lang="ts">
  interface Props {
    value: string;
    error?: string;
    disabled?: boolean;
  }
  
  let { 
    value = $bindable(), 
    error, 
    disabled = false 
  }: Props = $props();
  
  const hasError = $derived(!!error);
  const inputClasses = $derived(() => [
    'base-input-class',
    hasError && 'error-class',
    disabled && 'disabled-class'
  ].filter(Boolean).join(' '));
</script>

<input 
  bind:value 
  {disabled}
  class={inputClasses}
  aria-invalid={hasError}
/>
```

## ⚡ Advanced Utilities

### 1. Debounced Derived Values
For performance optimization with expensive computations.

```typescript
import { createDebouncedDerived } from '$lib/utils/reactivity.svelte';

let searchQuery = $state('');

// Debounced search results
const searchResults = createDebouncedDerived(() => {
  if (!searchQuery.trim()) return [];
  return performExpensiveSearch(searchQuery);
}, 300); // 300ms delay

// Usage in template
const results = searchResults(); // Call as function
```

### 2. Async Derived State
For handling async operations with loading and error states.

```typescript
import { createAsyncDerived } from '$lib/utils/reactivity.svelte';

const userData = createAsyncDerived(async () => {
  const response = await fetch('/api/user');
  if (!response.ok) throw new Error('Failed to fetch user');
  return response.json();
});

// Usage
$: if (userData.loading()) {
  console.log('Loading user data...');
} else if (userData.error()) {
  console.error('Error:', userData.error());
} else if (userData.value()) {
  console.log('User data:', userData.value());
}

// Retry on error
function retryFetch() {
  userData.retry();
}
```

### 3. Performance Monitoring
Track performance of expensive operations.

```typescript
import { createPerformanceMonitor } from '$lib/utils/reactivity.svelte';

const monitor = createPerformanceMonitor('ComponentName');

const expensiveComputation = $derived(() => {
  return monitor.monitor(() => {
    // Your expensive computation
    return heavyProcessing(data);
  });
});

// Get performance stats
const stats = monitor.getStats();
console.log(`Average time: ${stats.averageTime}ms`);
```

### 4. Reactive Arrays
Optimized array operations with minimal re-renders.

```typescript
import { ReactiveArray } from '$lib/utils/reactivity.svelte';

const items = new ReactiveArray(['Item 1', 'Item 2', 'Item 3']);

// Optimized operations
items.push('New Item');
items.remove(index);
items.move(fromIndex, toIndex);
items.filter(item => item.active);

// Access current array
const currentItems = items.value;
```

### 5. LocalStorage Integration
Persistent state that syncs across browser tabs.

```typescript
import { createLocalStorageState } from '$lib/utils/reactivity.svelte';

const preferences = createLocalStorageState('user-preferences', {
  theme: 'system',
  language: 'en',
  notifications: true
});

// Use like regular state
preferences.value.theme = 'dark'; // Automatically saves to localStorage

// Update with function
preferences.update(current => ({
  ...current,
  language: 'es'
}));
```

## 🎯 Performance Patterns

### 1. Optimized Effects
Minimize effect dependencies for better performance.

```typescript
// ❌ Effect runs on any data change
$effect(() => {
  if (data.length > 0) {
    processData(data, settings, filters, sortOrder);
  }
});

// ✅ Effect only runs when necessary
$effect(() => {
  const currentData = data; // Track only data
  if (currentData.length > 0) {
    processData(currentData, settings, filters, sortOrder);
  }
});

// ✅ Even better: separate effects
$effect(() => {
  // Only runs when data changes
  preprocessData(data);
});

$effect(() => {
  // Only runs when settings change
  updateSettings(settings);
});
```

### 2. Memoized Computations
Use memoization for expensive calculations.

```typescript
import { createMemoized } from '$lib/utils/reactivity.svelte';

const expensiveCalculation = createMemoized((data: DataType[], filters: FilterType) => {
  return data
    .filter(item => filters.every(filter => filter.test(item)))
    .map(item => complexTransformation(item))
    .sort(complexSorting);
});

const result = $derived(() => expensiveCalculation(data, filters));
```

### 3. Conditional Reactivity
Avoid unnecessary computations with conditional derived values.

```typescript
// ❌ Always computes, even when not needed
const processedData = $derived(() => expensiveProcess(rawData));

// ✅ Only computes when conditions are met
const processedData = $derived(() => {
  if (!showProcessedView) return null;
  if (!rawData.length) return [];
  return expensiveProcess(rawData);
});
```

## 🧪 Testing Patterns

### Component Contract Testing
Ensure migrated components maintain their API contracts.

```typescript
// tests/components/MyComponent.contract.test.ts
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import MyComponent from '$lib/components/MyComponent.svelte';

describe('MyComponent Contract', () => {
  test('accepts expected props interface', () => {
    const props = {
      data: [],
      onSelect: vi.fn(),
      loading: false
    };
    
    expect(() => render(MyComponent, { props })).not.toThrow();
  });
  
  test('maintains prop reactivity', async () => {
    const component = render(MyComponent, { 
      props: { data: ['item1'] } 
    });
    
    await component.rerender({ data: ['item1', 'item2'] });
    expect(component.getByText('item2')).toBeInTheDocument();
  });
  
  test('preserves event handling', () => {
    const onSelect = vi.fn();
    const component = render(MyComponent, { 
      props: { data: ['item1'], onSelect } 
    });
    
    component.getByText('item1').click();
    expect(onSelect).toHaveBeenCalledWith('item1');
  });
});
```

### Store Testing
Test runes-based stores maintain expected behavior.

```typescript
// tests/stores/auth.test.ts
import { describe, test, expect, beforeEach } from 'vitest';
import { authManager } from '$lib/stores/auth.svelte';

describe('Auth Store Contract', () => {
  beforeEach(() => {
    authManager.setUser(null, []);
  });
  
  test('maintains authentication state', () => {
    expect(authManager.isAuthenticated).toBe(false);
    
    authManager.setUser({ id: '1', name: 'Test' }, ['user']);
    expect(authManager.isAuthenticated).toBe(true);
  });
  
  test('permission checking works correctly', () => {
    authManager.setUser({ id: '1', name: 'Test' }, ['users:read', 'posts:write']);
    
    expect(authManager.checkPermission('users:read')).toBe(true);
    expect(authManager.checkPermission('users:write')).toBe(false);
    expect(authManager.checkPermission('admin:*')).toBe(false);
  });
});
```

## 📋 Best Practices

### 1. File Organization
```
src/lib/
├── stores/
│   ├── auth.svelte.ts        # Runes-based stores
│   ├── dashboard.svelte.ts   # Use .svelte.ts for runes
│   └── legacy.ts             # Traditional stores (if any)
├── components/
│   ├── ui/
│   │   └── Button.svelte     # Migrated components
│   └── forms/
│       └── AdvancedForm.svelte
└── utils/
    ├── reactivity.svelte.ts  # Runes utilities
    └── helpers.ts             # Non-runes utilities
```

### 2. TypeScript Integration
Always define interfaces for component props.

```typescript
// ✅ Good
interface ComponentProps {
  data: DataType[];
  onAction?: (item: DataType) => void;
  config?: ConfigType;
}

let { data, onAction, config = defaultConfig }: ComponentProps = $props();

// ❌ Avoid
let { data, onAction, config }: any = $props();
```

### 3. Performance Considerations
- Use `$derived()` for computed values instead of `$effect()` + state updates
- Minimize effect dependencies
- Use debounced operations for expensive computations
- Consider memoization for complex calculations

```typescript
// ✅ Efficient
const filteredData = $derived(() => {
  return data.filter(item => item.status === currentFilter);
});

// ❌ Inefficient
let filteredData = $state([]);
$effect(() => {
  filteredData = data.filter(item => item.status === currentFilter);
});
```

### 4. Error Handling
Always include proper error boundaries in async operations.

```typescript
const asyncData = createAsyncDerived(async () => {
  try {
    const result = await fetchData();
    return result;
  } catch (error) {
    console.error('Data fetch failed:', error);
    throw new Error('Failed to load data. Please try again.');
  }
});
```

## ⚠️ Common Pitfalls

### 1. Infinite Effect Loops
```typescript
// ❌ Creates infinite loop
let count = $state(0);
$effect(() => {
  count = count + 1; // This creates a dependency on count, causing infinite loop
});

// ✅ Correct approach
let count = $state(0);
$effect(() => {
  // Use external trigger
  if (shouldIncrement) {
    count = count + 1;
  }
});
```

### 2. Unnecessary Effects
```typescript
// ❌ Don't use effects for simple computations
let doubled = $state(0);
$effect(() => {
  doubled = count * 2;
});

// ✅ Use derived instead
const doubled = $derived(count * 2);
```

### 3. Missing Cleanup
```typescript
// ❌ Missing cleanup
$effect(() => {
  const interval = setInterval(() => {
    // do something
  }, 1000);
  // Missing cleanup!
});

// ✅ Proper cleanup
$effect(() => {
  const interval = setInterval(() => {
    // do something
  }, 1000);
  
  return () => clearInterval(interval);
});
```

### 4. Incorrect Prop Bindings
```typescript
// ❌ Not bindable
let { value }: { value: string } = $props();

// Parent cannot bind to this prop

// ✅ Bindable prop
let { value = $bindable() }: { value: string } = $props();

// Parent can now use: bind:value
```

## 🚀 Advanced Patterns

### 1. Computed with Dependencies
```typescript
// Multiple dependencies
const summary = $derived(() => {
  return {
    total: items.length,
    active: items.filter(item => item.active).length,
    lastUpdated: new Date().toISOString()
  };
});
```

### 2. Conditional Effects
```typescript
// Effect that only runs under certain conditions
$effect(() => {
  if (!isVisible) return;
  if (!data.length) return;
  
  // Only runs when both conditions are true
  processVisibleData(data);
});
```

### 3. Complex State Updates
```typescript
// Batch state updates for performance
function updateUserProfile(updates: Partial<UserProfile>) {
  // All updates happen in single reactivity cycle
  user.name = updates.name ?? user.name;
  user.email = updates.email ?? user.email;
  user.preferences = { ...user.preferences, ...updates.preferences };
  user.lastModified = new Date().toISOString();
}
```

## 📚 Additional Resources

- **Svelte 5 Official Documentation:** [https://svelte.dev/docs/svelte/introduction](https://svelte.dev/docs/svelte/introduction)
- **Migration Guide:** [https://svelte.dev/docs/svelte/v5-migration-guide](https://svelte.dev/docs/svelte/v5-migration-guide)
- **Performance Testing Component:** `src/lib/components/dev/PerformanceTester.svelte`
- **Advanced Showcase:** `src/lib/components/demo/AdvancedRunesShowcase.svelte`

## 🎯 Next Steps

1. **Practice:** Use the `AdvancedRunesShowcase` component to experiment with patterns
2. **Test:** Run performance benchmarks with `PerformanceTester`
3. **Implement:** Apply these patterns to new components
4. **Optimize:** Use performance monitoring to identify bottlenecks
5. **Share:** Contribute improvements back to the team

This guide will evolve as we discover new patterns and optimizations. Always refer to the latest version for the most up-to-date best practices.