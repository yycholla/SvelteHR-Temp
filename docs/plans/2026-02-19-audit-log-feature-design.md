# Audit Log Feature Design

**Date:** 2026-02-19
**Feature:** Comprehensive Audit Logging with Rollback (Feature 020)
**Status:** Design Complete - Ready for Implementation

## Overview

This document outlines the design for implementing 7 Svelte components that provide comprehensive audit logging with rollback capabilities. All components follow the Feature Module Pattern with co-located GraphQL queries and types.

**Current State:** 332 tests in TDD RED phase (describe.skip) across 7 component test files.

**Goal:** Implement all components to make tests pass while delivering excellent UX for audit log management.

## Architecture Overview

### File Structure

```
src/routes/dashboard/audit-log/
  ├── +page.svelte              # Route orchestrator (~200 lines)
  ├── +page.server.ts           # Server-side initial data load
  └── _components/
      ├── ActivityFeed/
      │   ├── ActivityFeed.svelte
      │   ├── ActivityFeedEntry.svelte
      │   ├── ActivityFeedSkeleton.svelte
      │   ├── activityFeed.graphql.ts
      │   └── activityFeed.types.ts
      ├── AuditLogFilters/
      │   ├── AuditLogFilters.svelte
      │   ├── FilterGroup.svelte
      │   └── filters.types.ts
      ├── BulkRollbackDialog/
      │   ├── BulkRollbackDialog.svelte
      │   ├── ProgressBar.svelte
      │   ├── bulkRollback.graphql.ts
      │   └── bulkRollback.sse.ts
      ├── ConflictResolutionModal/
      │   ├── ConflictResolutionModal.svelte
      │   ├── ConflictDiff.svelte
      │   └── conflictResolution.graphql.ts
      ├── RollbackButton/
      │   ├── RollbackButton.svelte
      │   └── rollback.graphql.ts
      └── RollbackRequestsDrawer/
          ├── RollbackRequestsDrawer.svelte
          ├── RollbackRequestCard.svelte
          ├── rollbackRequests.graphql.ts
          └── rollbackRequests.types.ts
```

### Design Patterns

**1. Compound Component Pattern**

- Smart containers handle state and data fetching
- Presentational components handle rendering
- Clear separation of concerns

**2. Feature Module Pattern**

- GraphQL queries co-located with components
- Types defined per feature module
- Improved maintainability and parallel development

**3. Svelte 5 Runes**

- `$state` for reactive local state
- `$derived` for computed values
- `$props` for component props
- `$effect` for side effects (SSE connections, scroll handlers)

### Route Orchestration

The `+page.svelte` acts as the orchestrator:

- Manages global state (filters, selection)
- Coordinates communication between components
- Handles authentication and permissions
- ~200 lines total

```svelte
<script lang="ts">
	let filters = $state<FilterValues>({});
	let selectedLogIds = $state<Set<string>>(new Set());
	let drawerOpen = $state(false);

	function handleFilterChange(newFilters: FilterValues) {
		filters = newFilters;
		selectedLogIds.clear();
	}
</script>
```

## Component Design

### 1. ActivityFeed.svelte (49 tests)

**Purpose:** Display audit logs with rollback indicators and diff visualization.

**Props Interface:**

```typescript
interface ActivityFeedProps {
	logs: ActivityLogEntry[];
	onLoadMore?: () => void;
	hasMore?: boolean;
	loading?: boolean;
	selectedIds?: Set<string>;
	onSelectionChange?: (ids: Set<string>) => void;
}
```

**Key Features:**

- Infinite scroll with "Load More" fallback
- Shift+Click range selection
- Expandable entries showing before/after diffs
- Rollback status badges (completed/pending)
- Skeleton loaders during loading

**Test Categories:**

- Rollback indicator rendering (completed/pending states, icons)
- Diff visualization (before/after snapshots, field diffs)
- Infinite scroll behavior
- Empty states

### 2. AuditLogFilters.svelte (47 tests)

**Purpose:** Left sidebar filters for action type, resource, date range, employee.

**Props Interface:**

```typescript
interface AuditLogFiltersProps {
	onChange: (filters: FilterValues) => void;
	initialFilters?: FilterValues;
}

interface FilterValues {
	actionTypes: string[];
	resourceTypes: string[];
	dateRange: { start: string; end: string } | null;
	employeeId: string | null;
}
```

**Key Features:**

- Multi-select action type checkboxes
- Resource type autocomplete (GraphQL-backed)
- Date range picker with validation (start < end)
- Employee search with debouncing (300ms)
- Active filter count badge

**Test Categories:**

- Action type multi-select
- Resource type autocomplete with GraphQL query
- Date range validation (start < end)
- Employee filter with debounced search

### 3. BulkRollbackDialog.svelte (51 tests)

**Purpose:** Modal dialog for bulk rollback with real-time progress via SSE.

**Props Interface:**

```typescript
interface BulkRollbackDialogProps {
	selectedLogIds: Set<string>;
	open: boolean;
	onClose: () => void;
	onComplete?: () => void;
}
```

**Key Features:**

- Server-Sent Events (SSE) for progress updates
- Progress bar with percentage (0% → 100%)
- Detailed stats (X of Y completed, Z failed)
- Retry failed items
- Auto-close on 100% completion (3s delay)

**SSE Event Format:**

```typescript
interface BulkRollbackProgress {
	batchId: string;
	total: number;
	completed: number;
	failed: number;
	percentage: number;
	errors?: Array<{ logId: string; message: string }>;
}
```

**Test Categories:**

- SSE connection lifecycle (connect on open, close on unmount)
- Progress bar updates (0% → 100%)
- Batch status display (X of Y completed, Z failed)
- Retry failed items

### 4. ConflictResolutionModal.svelte (46 tests)

**Purpose:** Modal for resolving conflicts when rollback encounters data changes.

**Props Interface:**

```typescript
interface ConflictResolutionModalProps {
	conflicts: ConflictData;
	onResolve: (strategy: ResolutionStrategy) => Promise<void>;
	onCancel: () => void;
}

interface ConflictData {
	hasConflicts: boolean;
	conflictFields: string[];
	currentState: Record<string, unknown>;
	targetState: Record<string, unknown>;
}

type ResolutionStrategy = 'force' | 'cancel' | 'merge';
```

**Key Features:**

- Side-by-side diff view (current vs target state)
- Three resolution strategies:
  - **Force:** Overwrite current with target
  - **Cancel:** Abort rollback
  - **Merge:** Manual field-level selection
- Submit button disabled until strategy selected
- Validation before submission

**Test Categories:**

- Strategy selection (force/cancel/merge)
- Field-level diff display
- Submit button disabled until strategy selected
- Validation before submission

### 5. Pagination.svelte (57 tests)

**Purpose:** NOT USED - Replaced by infinite scroll. Tests remain for future use.

**Decision:** Infinite scroll was chosen over pagination for better UX.

### 6. RollbackButton.svelte (36 tests)

**Purpose:** Single-log rollback button (appears in expanded diff view only).

**Props Interface:**

```typescript
interface RollbackButtonProps {
	log: ActivityLogEntry;
	userRole: string;
	onRollbackComplete?: () => void;
}
```

**Key Features:**

- Visibility: super_admin only
- Disabled states (already rolled back, in progress)
- Confirmation dialog
- Conflict handling (opens ConflictResolutionModal if needed)
- Shows in expanded diff view only

**Test Categories:**

- Visibility based on user role (super_admin only)
- Disabled states (log already rolled back)
- Confirmation dialog
- Conflict handling (opens ConflictResolutionModal if response has conflicts)

### 7. RollbackRequestsDrawer.svelte (46 tests)

**Purpose:** Collapsible drawer showing pending rollback requests (HR Manager approval).

**Props Interface:**

```typescript
interface RollbackRequestsDrawerProps {
	requests: RollbackRequest[];
	currentUserRole: string;
	onApprove?: (requestId: string) => Promise<void>;
	onReject?: (requestId: string, reason: string) => Promise<void>;
}

interface RollbackRequest {
	id: string;
	status: 'pending' | 'approved' | 'rejected';
	requestedBy: string;
	targetLogId: string;
	createdAt: string;
}
```

**Key Features:**

- Collapsed by default
- Shows request count badge
- Approve/Reject actions (HR Manager only)
- Request status display (pending/approved/rejected)
- Real-time updates via GraphQL subscriptions (future enhancement)

**Child Component: RollbackRequestCard.svelte**

- Individual request display
- Action buttons (approve/reject)
- Requester and target log info

**Test Categories:**

- Request status display (pending/approved/rejected)
- Approve/Reject actions (HR Manager only)
- Requester and target log info
- Action buttons visibility

## Data Flow & State Management

### Server-Side Initial Load

```typescript
// +page.server.ts
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { GET_INITIAL_AUDIT_LOGS } from './_components/ActivityFeed/activityFeed.graphql';

export const load: PageServerLoad = async ({ fetch, cookies, locals }) => {
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	const result = await client
		.query(GET_INITIAL_AUDIT_LOGS, {
			limit: 50,
			offset: 0
		})
		.toPromise();

	return {
		initialLogs: result.data?.auditLogs ?? [],
		user: locals.user
	};
};
```

### Client-Side State Flow

**1. Filter Changes**

```
AuditLogFilters (onChange)
  → +page.svelte (handleFilterChange)
  → GraphQL refetch
  → ActivityFeed (new logs)
```

**2. Bulk Rollback**

```
ActivityFeed (selectedIds)
  → Floating Action Button
  → BulkRollbackDialog (open)
  → SSE connection (/api/rollback-progress/{batchId})
  → Progress updates
  → onComplete
  → Refresh logs
```

**3. Single Rollback with Conflict**

```
ActivityFeedEntry (expand)
  → RollbackButton (click)
  → GraphQL mutation
  → Response includes conflicts
  → ConflictResolutionModal (open)
  → User selects strategy
  → Retry mutation
  → Success
  → Refresh log
```

### SSE Connection Pattern

```typescript
// bulkRollback.sse.ts
export function createProgressStream(batchId: string) {
	const eventSource = new EventSource(`/api/rollback-progress/${batchId}`);

	return {
		onProgress(callback: (progress: BulkRollbackProgress) => void) {
			eventSource.addEventListener('progress', (e) => {
				callback(JSON.parse(e.data));
			});
		},
		onComplete(callback: () => void) {
			eventSource.addEventListener('complete', () => {
				callback();
				eventSource.close();
			});
		},
		onError(callback: (error: Error) => void) {
			eventSource.addEventListener('error', (e) => {
				callback(new Error('SSE connection failed'));
			});
		},
		close() {
			eventSource.close();
		}
	};
}
```

**Usage in Component:**

```svelte
<script lang="ts">
	import { createProgressStream } from './bulkRollback.sse';

	let progress = $state({ percentage: 0, completed: 0, total: 0 });

	$effect(() => {
		if (!open || !batchId) return;

		const stream = createProgressStream(batchId);

		stream.onProgress((update) => {
			progress = update;
		});

		stream.onComplete(() => {
			setTimeout(() => onClose(), 3000);
		});

		return () => stream.close();
	});
</script>
```

### GraphQL Operations

**Queries:**

```typescript
// activityFeed.graphql.ts
export const GET_AUDIT_LOGS = gql`
	query GetAuditLogs($limit: Int!, $offset: Int!, $filters: AuditLogFilters) {
		auditLogs(limit: $limit, offset: $offset, filters: $filters) {
			id
			action
			resourceType
			resourceId
			changes
			performedBy
			timestamp
			rollbackStatus
			beforeSnapshot
			afterSnapshot
		}
	}
`;
```

**Mutations:**

```typescript
// rollback.graphql.ts
export const ROLLBACK_AUDIT_LOG = gql`
	mutation RollbackLog($logId: ID!) {
		rollbackAuditLog(logId: $logId) {
			success
			conflicts {
				hasConflicts
				conflictFields
				currentState
				targetState
			}
		}
	}
`;

// bulkRollback.graphql.ts
export const CREATE_BULK_ROLLBACK = gql`
	mutation CreateBulkRollback($logIds: [ID!]!) {
		createBulkRollback(logIds: $logIds) {
			success
			batchId
		}
	}
`;
```

## Error Handling

### Network Errors

**Pattern:** Graceful degradation with user feedback.

```typescript
// Example: ActivityFeed
let error = $state<string | null>(null);

async function loadLogs() {
  try {
    const result = await client.query(GET_AUDIT_LOGS, { ... }).toPromise();

    if (result.error) {
      error = 'Failed to load audit logs. Please try again.';
      return;
    }

    logs = result.data.auditLogs;
    error = null;
  } catch (e) {
    error = 'Network error. Please check your connection.';
  }
}
```

**UI Treatment:**

- Show error alert at top of feed
- Preserve existing data if available
- Provide retry button
- Use toast notifications for non-critical errors

### SSE Connection Failures

**Strategy:** Auto-reconnect with exponential backoff, fallback to polling.

```typescript
let reconnectAttempts = $state(0);
const MAX_RECONNECT_ATTEMPTS = 3;

$effect(() => {
	const stream = createProgressStream(batchId);

	stream.onError((error) => {
		if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
			reconnectAttempts++;
			setTimeout(
				() => {
					// Retry SSE connection
				},
				1000 * Math.pow(2, reconnectAttempts)
			);
		} else {
			// Fallback to polling
			startPolling();
		}
	});
});
```

### Conflict Resolution Validation

**Rule:** Cannot submit conflict resolution without selecting a strategy.

```typescript
let selectedStrategy = $state<ResolutionStrategy | null>(null);
let canSubmit = $derived(selectedStrategy !== null);

async function handleSubmit() {
	if (!canSubmit) return; // Should never happen due to disabled button

	try {
		await onResolve(selectedStrategy);
	} catch (e) {
		error = 'Failed to resolve conflict. Please try again.';
	}
}
```

### Bulk Rollback Partial Failures

**Pattern:** Show detailed results, allow retry of failed items.

```typescript
interface BulkRollbackResult {
	succeeded: string[];
	failed: Array<{ logId: string; error: string }>;
}

// After completion
if (result.failed.length > 0) {
	showResultDialog({
		message: `${result.succeeded.length} succeeded, ${result.failed.length} failed`,
		failedLogs: result.failed
	});
}
```

### Permission Errors

**Pattern:** Hide UI elements for unauthorized users.

```svelte
{#if userRole === 'super_admin'}
	<RollbackButton {log} {userRole} />
{/if}

{#if userRole === 'hr_manager' && request.status === 'pending'}
	<Button on:click={handleApprove}>Approve</Button>
{/if}
```

### Empty States

**Pattern:** Helpful messaging with actionable suggestions.

```svelte
{#if logs.length === 0 && !loading && !error}
	<EmptyState>
		<p>No audit logs found matching your filters.</p>
		<Button on:click={clearFilters}>Clear Filters</Button>
	</EmptyState>
{/if}
```

## Testing Strategy

### Making TDD RED Tests Pass

**Current State:** 332 tests in `describe.skip("TDD RED")` blocks across 7 component test files.

**Approach:** Progressive implementation following the existing test specifications.

#### 1. ActivityFeed.svelte (49 tests)

**Implementation Strategy:**

```typescript
// Tests expect these props
interface ActivityFeedProps {
	logs: ActivityLogEntry[];
	onLoadMore?: () => void;
	hasMore?: boolean;
	loading?: boolean;
}

// Key test assertions to satisfy:
// ✓ Renders rollback badge when log.rollbackStatus === 'completed'
// ✓ Shows diff when entry is expanded
// ✓ Calls onLoadMore when scrolled to bottom
// ✓ Shows skeleton loaders when loading === true
```

#### 2. AuditLogFilters.svelte (47 tests)

**Implementation Strategy:**

```typescript
// Tests expect onChange callback with FilterValues
interface FilterValues {
	actionTypes: string[];
	resourceTypes: string[];
	dateRange: { start: string; end: string } | null;
	employeeId: string | null;
}

// Key test assertions:
// ✓ Emits onChange when any filter changes
// ✓ Validates date range (shows error if start > end)
// ✓ Debounces employee search (300ms)
// ✓ Fetches resource types via GraphQL
```

#### 3. BulkRollbackDialog.svelte (51 tests)

**Implementation Strategy:**

```typescript
// Tests expect SSE events in this format:
interface BulkRollbackProgress {
	batchId: string;
	total: number;
	completed: number;
	failed: number;
	percentage: number;
	errors?: Array<{ logId: string; message: string }>;
}

// Key test assertions:
// ✓ Opens SSE connection to /api/rollback-progress/{batchId}
// ✓ Updates progress bar on 'progress' events
// ✓ Shows completion state when percentage === 100
// ✓ Closes SSE connection on dialog close
```

#### 4. ConflictResolutionModal.svelte (46 tests)

**Implementation Strategy:**

```typescript
interface ConflictResolutionProps {
	conflicts: ConflictData;
	onResolve: (strategy: ResolutionStrategy) => Promise<void>;
	onCancel: () => void;
}

// Key test assertions:
// ✓ Displays conflictFields with current vs target values
// ✓ Submit button disabled when strategy === null
// ✓ Calls onResolve with selected strategy
// ✓ Shows loading state during resolution
```

#### 5. Pagination.svelte (57 tests)

**Note:** Component not needed (infinite scroll chosen), but tests remain for future use.

#### 6. RollbackButton.svelte (36 tests)

**Implementation Strategy:**

```typescript
interface RollbackButtonProps {
	log: ActivityLogEntry;
	userRole: string;
	onRollbackComplete?: () => void;
}

// Key test assertions:
// ✓ Hidden when userRole !== 'super_admin'
// ✓ Disabled when log.rollbackStatus === 'completed'
// ✓ Shows confirmation dialog on click
// ✓ Calls rollbackAuditLog mutation
// ✓ Opens ConflictResolutionModal if response.conflicts.hasConflicts
```

#### 7. RollbackRequestCard.svelte (46 tests)

**Implementation Strategy:**

```typescript
interface RollbackRequestCardProps {
	request: RollbackRequest;
	currentUserRole: string;
	onApprove?: (requestId: string) => Promise<void>;
	onReject?: (requestId: string, reason: string) => Promise<void>;
}

// Key test assertions:
// ✓ Shows approve/reject buttons when status === 'pending' && role === 'hr_manager'
// ✓ Hides buttons when status !== 'pending'
// ✓ Calls onApprove with requestId
// ✓ Shows reason input dialog for rejection
```

### GraphQL Mocking Strategy

**Using `@urql/core` test utilities:**

```typescript
// Example from BulkRollbackDialog.test.ts
import { fromValue, pipe, map } from 'wonka';
import { vi } from 'vitest';

const mockClient = {
	executeMutation: vi.fn((mutation) => {
		return pipe(
			fromValue({
				data: {
					createBulkRollback: {
						success: true,
						batchId: 'batch-123'
					}
				}
			}),
			map((result) => result)
		);
	})
};
```

### SSE Testing Pattern

**Using `vitest-browser-svelte` for real browser SSE:**

```typescript
// Example from BulkRollbackDialog.test.ts
test('updates progress from SSE events', async () => {
	const { component } = render(BulkRollbackDialog, {
		props: { batchId: 'batch-123', open: true }
	});

	// Mock SSE endpoint with test server
	const mockSSE = new MockEventSource('/api/rollback-progress/batch-123');

	mockSSE.emit('progress', {
		data: JSON.stringify({ percentage: 50, completed: 5, total: 10 })
	});

	await waitFor(() => {
		expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
	});
});
```

### Component Testing Patterns (Svelte 5 Runes)

**State Testing:**

```typescript
// Test $state reactivity
test('updates filter count when filters change', async () => {
	const { component } = render(AuditLogFilters);

	const actionTypeCheckbox = screen.getByLabelText('Create');
	await userEvent.click(actionTypeCheckbox);

	// Derived state should update automatically
	expect(screen.getByText('1 filter active')).toBeInTheDocument();
});
```

**Effect Testing:**

```typescript
// Test $effect side effects
test('loads more logs when scrolled to bottom', async () => {
	const onLoadMore = vi.fn();
	const { container } = render(ActivityFeed, {
		props: { logs: mockLogs, onLoadMore, hasMore: true }
	});

	const scrollContainer = container.querySelector('[data-scroll-container]');
	scrollContainer.scrollTop = scrollContainer.scrollHeight;

	// $effect should trigger onLoadMore
	await waitFor(() => expect(onLoadMore).toHaveBeenCalledOnce());
});
```

### Integration Testing Priority

**Phase 1: Individual Components (Unit Tests)**

- Remove `describe.skip()` one component at a time
- Implement component to satisfy existing tests
- Target: 100% test pass rate per component

**Phase 2: Page Integration**

- Test +page.svelte orchestration
- Verify component communication (filter → feed, selection → dialog)
- Test SSE connection lifecycle

**Phase 3: E2E (Playwright)**

- Full user flows (filter → select logs → bulk rollback)
- Real GraphQL backend
- Real SSE connections
- Permission enforcement

### Test Execution Commands

```bash
# Run specific component tests
npx vitest run tests/unit/components/ActivityFeed.test.ts

# Run all audit log component tests
npx vitest run tests/unit/components/ --grep "Audit|Rollback"

# Watch mode during development
npx vitest tests/unit/components/ActivityFeed.test.ts

# Coverage for audit log feature
npx vitest run --coverage --coverage.include=src/routes/dashboard/audit-log/**
```

### Success Criteria

- ✅ All 332 skipped tests passing
- ✅ No new TypeScript errors
- ✅ Components follow Svelte 5 runes patterns
- ✅ Props interfaces match test expectations
- ✅ SSE connections properly cleaned up (no memory leaks)
- ✅ GraphQL mutations return expected response shapes
- ✅ Error states render correctly
- ✅ Loading states show appropriate skeletons

## Implementation Phases

### Phase 1: Foundation (Days 1-2)

- Create directory structure
- Set up +page.svelte orchestrator
- Implement AuditLogFilters (simplest component)
- Implement Pagination (even though not used, tests exist)

### Phase 2: Core Components (Days 3-5)

- Implement ActivityFeed with infinite scroll
- Implement ActivityFeedEntry with diff view
- Implement RollbackButton
- Wire up basic GraphQL queries

### Phase 3: Advanced Features (Days 6-8)

- Implement BulkRollbackDialog with SSE
- Implement ConflictResolutionModal
- Implement RollbackRequestsDrawer
- Add real-time updates

### Phase 4: Polish & Testing (Days 9-10)

- Remove all describe.skip()
- Fix failing tests
- Add E2E tests
- Performance optimization
- Accessibility audit

## Open Questions

1. **Backend API:** Are the GraphQL mutations and SSE endpoints already implemented, or do they need to be built?
2. **Permissions:** Is there existing RBAC middleware to check super_admin/hr_manager roles?
3. **Conflict Detection:** What's the backend logic for detecting conflicts during rollback?
4. **SSE Endpoint:** Does `/api/rollback-progress/{batchId}` exist, or needs implementation?

## Next Steps

1. Invoke writing-plans skill to generate implementation plan
2. Create git worktree for isolated development
3. Start Phase 1 implementation
4. Review progress after each component completion
