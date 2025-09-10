# Quickstart Guide: Svelte 5 Runes Migration

**Date**: 2025-09-09  
**Feature**: Svelte 5 Runes Migration & Best Practices  
**Phase**: Phase 1 - Developer Onboarding Guide  

## Overview

This guide provides step-by-step instructions for team members to understand, validate, and contribute to the Svelte 5 runes migration in the SvelteHR project.

## Prerequisites

**Required Knowledge**:
- Svelte/SvelteKit fundamentals
- TypeScript basics
- GraphQL concepts
- Git workflow

**Development Environment**:
- Node.js 18+ installed
- Git configured
- IDE with Svelte language support
- MountainHR backend running on port 8080

## Quick Start Validation

### 1. Environment Setup (2 minutes)

```bash
# Clone and setup project
git clone [repository-url]
cd SvelteHR
git checkout 005-svelte5runes-i-would

# Install dependencies
npm install

# Start development server
npm run dev:local
```

**Expected Result**: Application loads at http://localhost:5173 without errors

### 2. Runes Migration Verification (3 minutes)

**Test Authentication Store Migration**:

```bash
# Check auth store is using runes
cat src/lib/stores/auth.svelte.ts
```

**Look for these patterns**:
```typescript
let authState = $state<AuthState>({
  user: null,
  permissions: [],
  roles: [],
  loading: false,
  error: null
});

export const isAuthenticated = $derived(
  authState.user !== null && authState.user?.is_active === true
);
```

**Test Component Migration**:

```bash
# Check AuthButton uses $props()
cat src/lib/components/auth/AuthButton.svelte
```

**Look for this pattern**:
```typescript
let { 
  permissions = [], 
  roles = [], 
  children, 
  ...restProps 
}: Props = $props();
```

### 3. Performance Features Testing (3 minutes)

**Test PreloadLink Component**:

1. Navigate to any page with navigation links
2. Hover over a link and watch network tab
3. Should see preload requests after hover delay

**Test Caching System**:

```bash
# Check cache utility exists
cat src/lib/utils/cache.svelte.ts
```

**Expected**: Reactive cache class with runes-based storage

### 4. Full Application Test (5 minutes)

**Login Flow**:
1. Go to http://localhost:5173/login
2. Enter credentials: admin/admin
3. Should redirect to dashboard without errors

**Navigation Test**:
1. Navigate between different sections
2. Check for smooth page transitions
3. Verify hover preloading works

**Permission Test**:
1. Check role-based UI elements appear/disappear correctly
2. Verify RBAC integration still functional

## Migration Patterns Guide

### Converting Traditional Stores to Runes

**Before (Traditional Store)**:
```typescript
// OLD: stores/example.ts
import { writable, derived } from 'svelte/store';

export const count = writable(0);
export const doubled = derived(count, $count => $count * 2);
```

**After (Svelte 5 Runes)**:
```typescript
// NEW: stores/example.svelte.ts
let count = $state(0);
export const doubled = $derived(count * 2);

export function incrementCount() {
  count += 1;
}
```

### Converting Components to $props()

**Before (Traditional Component)**:
```svelte
<script lang="ts">
  export let value: string;
  export let disabled = false;
  
  $: computedValue = value.toUpperCase();
</script>
```

**After (Svelte 5 Runes)**:
```svelte
<script lang="ts">
  interface Props {
    value: string;
    disabled?: boolean;
  }
  
  let { value, disabled = false }: Props = $props();
  
  const computedValue = $derived(value.toUpperCase());
</script>
```

### Converting Reactive Statements to $derived

**Before**:
```typescript
export let items: Item[];
$: filteredItems = items.filter(item => item.active);
$: itemCount = filteredItems.length;
```

**After**:
```typescript
let { items }: { items: Item[] } = $props();
const filteredItems = $derived(items.filter(item => item.active));
const itemCount = $derived(filteredItems.length);
```

## Common Migration Tasks

### 1. Store Migration Checklist

- [ ] Replace `writable()` with `$state()`
- [ ] Replace `derived()` with `$derived()`
- [ ] Replace `get()` calls with direct property access
- [ ] Add `.svelte.ts` extension for runes usage
- [ ] Export action functions instead of store methods
- [ ] Update imports in consuming components

### 2. Component Migration Checklist

- [ ] Replace `export let` with `$props()` destructuring
- [ ] Convert reactive statements (`$:`) to `$derived()`
- [ ] Replace `createEventDispatcher` with callback props
- [ ] Update component interfaces
- [ ] Test component in isolation
- [ ] Update Storybook stories if applicable

### 3. Testing Migration

- [ ] Update component tests for new props interface
- [ ] Test derived computations work correctly
- [ ] Verify event handling with callback props
- [ ] Check integration with runes-based stores
- [ ] Test RBAC integration still functional

## Development Workflow

### Adding New Runes Components

1. **Create TypeScript Interface**:
```typescript
interface MyComponentProps {
  data: SomeType[];
  onUpdate?: (data: SomeType) => void;
  disabled?: boolean;
}
```

2. **Use $props() Pattern**:
```svelte
<script lang="ts">
  let { data, onUpdate, disabled = false }: MyComponentProps = $props();
  
  const processedData = $derived(
    data.filter(item => !disabled || item.required)
  );
</script>
```

3. **Add to Storybook**:
```typescript
// MyComponent.stories.ts
export default {
  title: 'UI/MyComponent',
  component: MyComponent
};

export const Default = {
  args: {
    data: [...],
    disabled: false
  }
};
```

### Performance Optimization

**Use PreloadLink for Navigation**:
```svelte
<script>
  import PreloadLink from '$lib/components/ui/PreloadLink.svelte';
</script>

<PreloadLink 
  href="/employees/{employee.id}"
  preloadData={true}
  hoverDelay={300}
  class="employee-link"
>
  {employee.full_name}
</PreloadLink>
```

**Use Reactive Cache for Data**:
```typescript
import { ReactiveCache } from '$lib/utils/cache.svelte.ts';

const cache = new ReactiveCache({ maxSize: 100, defaultTtl: 300000 });

// In component
const cachedData = $derived(() => {
  const key = `employees-${dept.id}`;
  let data = cache.get(key);
  
  if (!data && !loading) {
    // Fetch and cache
    fetchEmployees(dept.id).then(result => {
      cache.set(key, result);
    });
  }
  
  return data;
});
```

## Troubleshooting

### Common Migration Issues

**Issue**: Component not reactive after migration
- **Solution**: Ensure using `$derived()` for computed values, not regular functions

**Issue**: Props not updating properly
- **Solution**: Check `$props()` destructuring matches interface exactly

**Issue**: Store changes not triggering updates
- **Solution**: Verify `.svelte.ts` extension and proper `$state()` usage

**Issue**: TypeScript errors in runes
- **Solution**: Update `tsconfig.json` to include Svelte 5 types

### Performance Issues

**Issue**: Excessive re-renders
- **Solution**: Use `$derived.by()` for expensive computations

**Issue**: Cache not working
- **Solution**: Check cache keys are consistent and TTL values reasonable

**Issue**: Preloading not triggering
- **Solution**: Verify hover events and delay settings in PreloadLink

## Validation Checklist

### Pre-Commit Validation

- [ ] `npm run check` passes (TypeScript validation)
- [ ] `npm run lint` passes (code formatting)
- [ ] `npm run test:unit -- --run` passes (unit tests)
- [ ] Application starts without errors (`npm run dev:local`)
- [ ] Login flow works correctly
- [ ] Navigation between routes functional
- [ ] RBAC permissions working

### Feature Validation

- [ ] Hover preloading works on navigation links
- [ ] Cache statistics show proper hit/miss ratios
- [ ] Component props are properly typed
- [ ] Derived computations update reactively
- [ ] GraphQL integration maintains functionality
- [ ] Authentication store manages state correctly

### Performance Validation

- [ ] Page load time <200ms with preloading
- [ ] No console errors in browser
- [ ] Network requests optimized (check DevTools)
- [ ] Memory usage stable (no leaks in cache)
- [ ] Smooth 60fps interactions

## Next Steps

After completing quickstart validation:

1. **Join Development**: Pick up tasks from the current sprint
2. **Contribute Patterns**: Add new runes patterns to this guide
3. **Report Issues**: Document any migration problems found
4. **Performance Testing**: Help validate optimization metrics
5. **Documentation**: Improve this guide based on experience

## Resources

- [Svelte 5 Runes Documentation](https://svelte.dev/docs/svelte/what-are-runes)
- [SvelteKit Documentation](https://svelte.dev/docs/kit)
- [Project Component Contracts](./contracts/component-contracts.ts)
- [Migration Data Models](./data-model.md)
- [Technical Research](./research.md)

---

**Quickstart Status**: ✅ READY - Team can validate migration progress  
**Estimated Time**: 15 minutes for full validation  
**Support**: Reach out if any step fails or needs clarification