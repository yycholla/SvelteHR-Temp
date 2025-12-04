# Task System Developer Guide

**Feature:** 028-task-system-expansion
**Version:** 1.0.0

Complete guide for developers working with the Task Management System.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Development Setup](#development-setup)
4. [Component Development](#component-development)
5. [GraphQL Integration](#graphql-integration)
6. [State Management](#state-management)
7. [Testing Strategy](#testing-strategy)
8. [Performance Considerations](#performance-considerations)
9. [Common Patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Task Management System                    │
├─────────────────────────────────────────────────────────────┤
│  Frontend (SvelteKit)                                        │
│  ├── Routes (+page.svelte)                                   │
│  ├── Components (TaskCard, TaskForm, etc.)                  │
│  ├── Stores (task-cache.ts)                                  │
│  └── GraphQL Client (urql)                                   │
├─────────────────────────────────────────────────────────────┤
│  GraphQL Layer (PostGraphile)                                │
│  ├── Queries (GET_ALL_TASKS, etc.)                          │
│  ├── Mutations (CREATE_TASK, etc.)                          │
│  └── Subscriptions (future)                                  │
├─────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL)                                       │
│  ├── Tasks Table                                            │
│  ├── Task Dependencies                                       │
│  ├── Linked Resources                                        │
│  ├── Task Audit Entries                                     │
│  └── RLS Policies                                           │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → SvelteKit Component
  ↓
GraphQL Query/Mutation (urql client)
  ↓
PostGraphile GraphQL Server
  ↓
PostgreSQL Database (with RLS)
  ↓
Response → Cache → UI Update
```

---

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   └── tasks/
│   │       ├── TaskCard.svelte           # Task display card
│   │       ├── TaskForm.svelte           # Create/edit form
│   │       ├── TaskList.svelte           # Task list view
│   │       ├── TaskHierarchy.svelte      # Hierarchy viewer
│   │       ├── TaskDependencies.svelte   # Dependency manager
│   │       ├── TaskAuditTrail.svelte     # Audit log display
│   │       ├── LinkedResources.svelte    # Resource linker
│   │       ├── SubtaskProgress.svelte    # Progress indicator
│   │       └── TaskFilters.svelte        # Filter controls
│   ├── graphql/
│   │   ├── tasks-operations.ts          # GraphQL operations
│   │   ├── tasks-query-optimizer.ts     # Optimized queries
│   │   └── client.ts                    # urql client config
│   ├── stores/
│   │   └── task-cache.ts                # SWR caching store
│   ├── utils/
│   │   ├── tasks.ts                     # Task utilities
│   │   └── activities.ts                # Activity utilities
│   ├── schemas/
│   │   └── task.ts                      # Zod validation schemas
│   ├── server/
│   │   └── tasks/
│   │       └── subtask-progress.ts      # Server-side calculations
│   ├── types/
│   │   └── task.ts                      # TypeScript types
│   └── performance/
│       ├── bundle-optimizer.ts          # Bundle optimization
│       └── graphql-performance-exchange.ts
│
├── routes/
│   └── dashboard/
│       └── tasks/
│           ├── +page.svelte             # Task dashboard
│           ├── +page.server.ts          # Server-side data loading
│           ├── [id]/
│           │   ├── +page.svelte         # Task detail view
│           │   ├── +page.server.ts      # Detail data loading
│           │   └── edit/
│           │       ├── +page.svelte     # Task edit form
│           │       └── +page.server.ts  # Edit data loading
│           ├── new/
│           │   ├── +page.svelte         # New task form
│           │   └── +page.server.ts      # Create handler
│           ├── my-tasks/
│           │   ├── +page.svelte         # Personal tasks
│           │   └── +page.server.ts      # Personal data
│           └── team-tasks/
│               ├── +page.svelte         # Team tasks
│               └── +page.server.ts      # Team data
│
└── tests/
    ├── unit/
    │   ├── services/
    │   │   └── subtask-progress.test.ts
    │   ├── utils/
    │   │   ├── tasks.test.ts
    │   │   └── activities.test.ts
    │   └── schemas/
    │       └── task.test.ts
    └── e2e/
        └── tasks/
            ├── task-crud.spec.ts
            ├── task-hierarchy.spec.ts
            ├── task-dependencies.spec.ts
            └── my-tasks-team-tasks.spec.ts
```

---

## Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- PostGraphile 4.x
- pnpm/npm

### Environment Variables

Create `.env.local`:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/svelteHR

# GraphQL
PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
GRAPHQL_WS_URL=ws://localhost:4000/graphql

# Authentication
JWT_SECRET=your-secret-key

# Performance
ENABLE_PERFORMANCE_MONITORING=true
LOG_SLOW_QUERIES=true
```

### Install Dependencies

```bash
npm install
```

### Database Setup

```bash
# Run migrations
npm run migrate

# Seed test data (development only)
npm run seed:tasks
```

### Start Development Server

```bash
# With Doppler (production-like)
npm run dev

# Local development without Doppler
npm run dev:local
```

---

## Component Development

### Creating a New Task Component

```svelte
<!-- src/lib/components/tasks/MyNewComponent.svelte -->
<script lang="ts">
  import type { Task } from '$lib/types/task';

  interface Props {
    task: Task;
    onUpdate?: (task: Task) => void;
  }

  let { task, onUpdate }: Props = $props();

  // Reactive computations
  let isOverdue = $derived(
    task.dueDate && new Date(task.dueDate) < new Date()
  );
</script>

<div class="task-component">
  <h3>{task.title}</h3>
  {#if isOverdue}
    <span class="badge badge-error">Overdue</span>
  {/if}

  <button onclick={() => onUpdate?.(task)}>
    Update
  </button>
</div>

<style>
  .task-component {
    @apply p-4 rounded-lg border;
  }
</style>
```

### Component Best Practices

1. **Use Svelte 5 Runes**:

   ```svelte
   let count = $state(0);
   let doubled = $derived(count * 2);
   let { prop1, prop2 } = $props();
   ```

2. **TypeScript Interfaces**:

   ```typescript
   interface Props {
   	task: Task;
   	editable?: boolean;
   }
   ```

3. **Event Handlers**:

   ```svelte
   <button onclick={() => handleClick()}>Click</button>
   ```

4. **Accessibility**:
   ```svelte
   <button
     aria-label="Mark task as complete"
     role="button"
   >
     Complete
   </button>
   ```

---

## GraphQL Integration

### Query Tasks

```typescript
import { createUrqlClient } from '$lib/graphql/client';
import { GET_ALL_TASKS } from '$lib/graphql/tasks-operations';

const client = createUrqlClient();

const result = await client
	.query(GET_ALL_TASKS, {
		first: 20,
		condition: { status: 'In Progress' }
	})
	.toPromise();

if (result.error) {
	console.error('Query failed:', result.error);
} else {
	const tasks = result.data.allTasks.nodes;
	console.log('Tasks:', tasks);
}
```

### Create Task

```typescript
import { CREATE_TASK } from '$lib/graphql/tasks-operations';

const result = await client
	.mutation(CREATE_TASK, {
		input: {
			task: {
				title: 'New Task',
				description: 'Task description',
				assigneeId: 'user-uuid',
				taskTypeId: 'type-uuid',
				status: 'Not Started',
				priority: 'High',
				dueDate: '2025-10-31T23:59:59Z'
			}
		}
	})
	.toPromise();

if (result.error) {
	console.error('Mutation failed:', result.error);
} else {
	const newTask = result.data.createTask.task;
	console.log('Created task:', newTask);
}
```

### Using Optimized Queries

```typescript
import {
	GET_TASKS_MINIMAL,
	GET_TASKS_WITH_ASSIGNEES,
	selectOptimalQuery
} from '$lib/graphql/tasks-query-optimizer';

// Automatic query selection
const hint = {
	requiredFields: ['core', 'assignee'],
	expectedSize: 'medium',
	timeSensitive: false,
	cacheStrategy: 'cache-first'
};

const { query, estimatedPayloadReduction } = selectOptimalQuery(hint);
// Returns GET_TASKS_WITH_ASSIGNEES with 40% reduction

const result = await client
	.query(query, {
		first: 20,
		condition: { archived: false }
	})
	.toPromise();
```

---

## State Management

### Task Cache Store

```typescript
import { taskCache, TASK_CACHE_CONFIGS, createCachedTaskStore } from '$lib/stores/task-cache';

// Basic caching
const task = await taskCache.get(
	'GetTaskDetail',
	async () => {
		const response = await fetch(`/api/tasks/${taskId}`);
		return response.json();
	},
	{ taskId },
	TASK_CACHE_CONFIGS.taskDetail
);

// Svelte store integration
const myTasksStore = createCachedTaskStore(
	'GetMyTasks',
	async () => {
		const response = await fetch('/api/tasks/my-tasks');
		return response.json();
	},
	{ userId },
	TASK_CACHE_CONFIGS.myTasks
);

// Use in component
$: tasks = $myTasksStore.data;
$: isLoading = $myTasksStore.isLoading;
```

### Optimistic Updates

```typescript
import { optimisticUpdate } from '$lib/stores/task-cache';

async function completeTask(taskId: string) {
	// Update cache immediately
	optimisticUpdate('GetMyTasks:userId:123', (tasks) => {
		return tasks.map((t) => (t.id === taskId ? { ...t, status: 'Completed' } : t));
	});

	// Perform mutation
	try {
		await updateTask({ id: taskId, status: 'Completed' });
	} catch (error) {
		// Revert on error
		taskCache.invalidate('GetMyTasks');
	}
}
```

---

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// tests/unit/utils/tasks.test.ts
import { describe, it, expect } from 'vitest';
import { isTaskOverdue, getTaskStatusColor } from '$lib/utils/tasks';

describe('isTaskOverdue', () => {
	it('should return true for overdue tasks', () => {
		const task = {
			id: '1',
			title: 'Test',
			status: 'In Progress',
			dueDate: new Date('2020-01-01').toISOString(),
			archived: false
		};

		expect(isTaskOverdue(task)).toBe(true);
	});
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/tasks/task-crud.spec.ts
import { test, expect } from '@playwright/test';

test('can create a new task', async ({ page }) => {
	await page.goto('/dashboard/tasks');
	await page.click('button:has-text("New Task")');

	await page.fill('input[name="title"]', 'Test Task');
	await page.selectOption('select[name="priority"]', 'High');
	await page.click('button[type="submit"]');

	await expect(page.locator('text=Test Task')).toBeVisible();
});
```

### Run Tests

```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e

# Specific test file
npm run test:unit -- tests/unit/utils/tasks.test.ts
```

---

## Performance Considerations

### Query Optimization

1. **Use minimal queries for lists**:

   ```typescript
   // ❌ Don't load full data for lists
   GET_ALL_TASKS; // Full fields

   // ✅ Use minimal query
   GET_TASKS_MINIMAL; // Core fields only (65% smaller)
   ```

2. **Implement pagination**:

   ```typescript
   const tasks = await client
   	.query(GET_TASKS_WITH_ASSIGNEES, {
   		first: 20, // Page size
   		offset: 0 // Page offset
   	})
   	.toPromise();
   ```

3. **Use cursor pagination for large datasets**:
   ```typescript
   const tasks = await client
   	.query(GET_TASKS_WITH_ASSIGNEES, {
   		first: 20,
   		after: lastCursor // From previous page
   	})
   	.toPromise();
   ```

### Lazy Loading Components

```svelte
<script lang="ts">
  import { TaskComponents } from '$lib/performance/bundle-optimizer';

  let TaskForm;
  let showForm = $state(false);

  async function openForm() {
    TaskForm = await TaskComponents.TaskForm();
    showForm = true;
  }
</script>

{#if showForm && TaskForm}
  <svelte:component this={TaskForm} />
{/if}
```

### Cache Management

```typescript
import { cacheActions } from '$lib/stores/task-cache';

// Invalidate after mutation
async function updateTask(input) {
	await client.mutation(UPDATE_TASK, { input }).toPromise();

	// Invalidate related caches
	cacheActions.invalidate('GetMyTasks');
	cacheActions.invalidate('GetTaskDetail');
}
```

---

## Common Patterns

### Server-Side Data Loading

```typescript
// +page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const searchTerm = url.searchParams.get('search') || '';
	const status = url.searchParams.get('status') || '';

	// Load data server-side
	const tasks = await fetchTasksFromGraphQL({
		searchTerm,
		status
	});

	return {
		tasks,
		filters: { searchTerm, status }
	};
};
```

### Form Validation (Zod)

```typescript
import { z } from 'zod';
import { createTaskSchema } from '$lib/schemas/task';

const formData = {
	title: 'New Task',
	description: 'Description',
	assigneeId: 'user-uuid',
	taskTypeId: 'type-uuid',
	status: 'Not Started',
	priority: 'High'
};

try {
	const validated = createTaskSchema.parse(formData);
	// Form is valid, proceed
} catch (error) {
	// Validation errors
	console.error(error.errors);
}
```

### Permission Checking

```typescript
import { canUserViewTask, canUserEditTask } from '$lib/utils/tasks';

const userCanView = canUserViewTask(task, user.id, user.departmentId, user.roleLevel);

const userCanEdit = canUserEditTask(task, user.id, user.departmentId, user.roleLevel);
```

---

## Troubleshooting

### Common Issues

#### GraphQL Query Errors

**Problem:** Query returns `null` or errors

**Solution:**

1. Check authentication token
2. Verify RLS policies
3. Check query syntax
4. Review PostGraphile logs

```bash
# Enable detailed logging
export DEBUG=postgraphile:*
npm run dev
```

#### Slow Queries

**Problem:** Queries taking > 500ms

**Solution:**

1. Use optimized queries from `tasks-query-optimizer.ts`
2. Implement pagination
3. Check database indexes
4. Enable caching

```typescript
// Check query performance
import { graphqlPerformanceTester } from '$lib/performance/graphql-performance-exchange';

await graphqlPerformanceTester.testOperation(
	'GetAllTasks',
	async () => {
		return client.query(GET_ALL_TASKS, { first: 20 }).toPromise();
	},
	{
		iterations: 10,
		maxDuration: 200 // ms
	}
);
```

#### Cache Invalidation Issues

**Problem:** Stale data after mutations

**Solution:**

1. Invalidate cache after mutations
2. Use optimistic updates
3. Check cache TTL configuration

```typescript
// After mutation
await updateTask(input);

// Invalidate affected caches
cacheActions.invalidate('GetMyTasks');
cacheActions.invalidate('GetAllTasks');
cacheActions.invalidate(`GetTaskDetail:taskId:${taskId}`);
```

#### Bundle Size Too Large

**Problem:** Initial bundle > 500 KB

**Solution:**

1. Enable lazy loading for heavy components
2. Check for unused dependencies
3. Verify tree-shaking

```typescript
// Check bundle metrics
import { logBundleAnalysis } from '$lib/performance/bundle-optimizer';

logBundleAnalysis();
// Shows: Total Size, JS Size, CSS Size, Chunk Count
```

---

## Additional Resources

- [API Documentation](./TASK_SYSTEM_API.md)
- [Performance Guide](./PERFORMANCE_OPTIMIZATION_GUIDE.md)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [Svelte 5 Documentation](https://svelte.dev/docs/svelte/overview)
- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [PostGraphile Documentation](https://www.graphile.org/postgraphile/)
