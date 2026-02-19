# Audit Log Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 7 Svelte components for comprehensive audit logging with rollback capabilities, making 332 TDD RED tests pass.

**Architecture:** Feature Module Pattern with co-located GraphQL/types, Svelte 5 runes for state management, SSE for real-time progress updates, infinite scroll with Shift+Click selection.

**Tech Stack:** SvelteKit 2.43+, Svelte 5 (runes), URQL GraphQL client, TypeScript 5, Tailwind CSS 4, Vitest 3.2

---

## Task 1: Foundation - Directory Structure

**Files:**

- Create: `src/routes/dashboard/audit-log/_components/` (directory)
- Create: `src/routes/dashboard/audit-log/+page.svelte`
- Create: `src/routes/dashboard/audit-log/+page.server.ts`

**Step 1: Create directory structure**

```bash
mkdir -p src/routes/dashboard/audit-log/_components/{ActivityFeed,AuditLogFilters,BulkRollbackDialog,ConflictResolutionModal,RollbackButton,RollbackRequestsDrawer}
```

**Step 2: Create +page.server.ts for server-side data loading**

```typescript
// src/routes/dashboard/audit-log/+page.server.ts
import type { PageServerLoad } from './$types';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export const load: PageServerLoad = async ({ fetch, cookies, locals }) => {
	// TODO: Add GET_INITIAL_AUDIT_LOGS query in Task 4
	return {
		initialLogs: [],
		user: locals.user
	};
};
```

**Step 3: Create basic +page.svelte orchestrator**

```svelte
<!-- src/routes/dashboard/audit-log/+page.svelte -->
<script lang="ts">
	let { data } = $props();

	// State placeholders - will be populated in integration tasks
	let filters = $state<Record<string, unknown>>({});
	let selectedLogIds = $state<Set<string>>(new Set());
</script>

<div class="audit-log-page">
	<h1>Audit Log</h1>
	<!-- Components will be added in integration tasks -->
</div>
```

**Step 4: Verify structure**

```bash
ls -R src/routes/dashboard/audit-log/_components/
```

Expected: 6 empty directories (ActivityFeed, AuditLogFilters, BulkRollbackDialog, ConflictResolutionModal, RollbackButton, RollbackRequestsDrawer)

**Step 5: Commit**

```bash
git add src/routes/dashboard/audit-log/
git commit -m "feat(audit-log): create foundation directory structure and page files"
```

---

## Task 2: AuditLogFilters - Component Setup

**Files:**

- Create: `src/routes/dashboard/audit-log/_components/AuditLogFilters/filters.types.ts`
- Create: `src/routes/dashboard/audit-log/_components/AuditLogFilters/AuditLogFilters.svelte`
- Modify: `tests/unit/components/AuditLogFilters.test.ts:38` (remove describe.skip)

**Step 1: Create types file**

```typescript
// src/routes/dashboard/audit-log/_components/AuditLogFilters/filters.types.ts
export interface FilterValues {
	action?: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | null;
	resourceType?: string | null;
	startDate?: string | null;
	endDate?: string | null;
	employeeId?: string | null;
	searchQuery?: string | null;
}

export interface AuditLogFiltersProps {
	initialFilters?: FilterValues;
	resourceTypes: string[];
	onFilterChange: (filters: FilterValues) => void;
	onClear: () => void;
}
```

**Step 2: Create basic component structure**

```svelte
<!-- src/routes/dashboard/audit-log/_components/AuditLogFilters/AuditLogFilters.svelte -->
<script lang="ts">
	import type { FilterValues, AuditLogFiltersProps } from './filters.types';

	let {
		initialFilters = {},
		resourceTypes,
		onFilterChange,
		onClear
	}: AuditLogFiltersProps = $props();

	let filters = $state<FilterValues>(initialFilters);
</script>

<div class="audit-log-filters">
	<!-- Will add filter controls in next step -->
</div>
```

**Step 3: Remove describe.skip from test**

```bash
# Edit tests/unit/components/AuditLogFilters.test.ts
# Change line 38 from:
#   describe.skip('AuditLogFilters Component (TDD RED - should fail)', () => {
# To:
#   describe('AuditLogFilters Component', () => {
```

Use this command:

```bash
sed -i "s/describe.skip('AuditLogFilters Component (TDD RED - should fail)'/describe('AuditLogFilters Component'/" tests/unit/components/AuditLogFilters.test.ts
```

**Step 4: Run tests to see failures**

```bash
npx vitest run tests/unit/components/AuditLogFilters.test.ts --no-coverage
```

Expected: Tests FAIL with "AuditLogFilters component not implemented yet" errors

**Step 5: Commit**

```bash
git add src/routes/dashboard/audit-log/_components/AuditLogFilters/ tests/unit/components/AuditLogFilters.test.ts
git commit -m "feat(audit-log): create AuditLogFilters component structure and enable tests"
```

---

## Task 3: AuditLogFilters - Action Type Filter

**Files:**

- Modify: `src/routes/dashboard/audit-log/_components/AuditLogFilters/AuditLogFilters.svelte`

**Step 1: Add action type dropdown UI**

```svelte
<!-- src/routes/dashboard/audit-log/_components/AuditLogFilters/AuditLogFilters.svelte -->
<script lang="ts">
	import type { FilterValues, AuditLogFiltersProps } from './filters.types';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';

	let {
		initialFilters = {},
		resourceTypes,
		onFilterChange,
		onClear
	}: AuditLogFiltersProps = $props();

	let filters = $state<FilterValues>(initialFilters);

	function handleActionChange(value: string) {
		filters = {
			...filters,
			action: value === 'ALL' ? null : (value as FilterValues['action'])
		};
		onFilterChange(filters);
	}
</script>

<div class="audit-log-filters space-y-4 p-4">
	<div class="filter-group">
		<label for="action-filter" class="block text-sm font-medium mb-2">Action Type</label>
		<Select.Root onValueChange={handleActionChange}>
			<Select.Trigger id="action-filter" class="w-full">
				<Select.Value placeholder="ALL" />
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="ALL">ALL</Select.Item>
				<Select.Item value="CREATE">CREATE</Select.Item>
				<Select.Item value="READ">READ</Select.Item>
				<Select.Item value="UPDATE">UPDATE</Select.Item>
				<Select.Item value="DELETE">DELETE</Select.Item>
			</Select.Content>
		</Select.Root>
	</div>
</div>
```

**Step 2: Run tests for action type filter**

```bash
npx vitest run tests/unit/components/AuditLogFilters.test.ts --grep "Action Type Filter" --no-coverage
```

Expected: Action Type Filter tests should PASS (7 tests)

**Step 3: Commit**

```bash
git add src/routes/dashboard/audit-log/_components/AuditLogFilters/AuditLogFilters.svelte
git commit -m "feat(audit-log): implement action type filter dropdown"
```

---

## Task 4: AuditLogFilters - Resource Type & Date Range

**Files:**

- Modify: `src/routes/dashboard/audit-log/_components/AuditLogFilters/AuditLogFilters.svelte`

**Step 1: Add resource type autocomplete and date range**

```svelte
<!-- Add to AuditLogFilters.svelte after action filter -->
<script lang="ts">
	// ... existing imports
	import * as Popover from '$lib/components/ui/popover';
	import { Input } from '$lib/components/ui/input';

	// ... existing code

	let resourceSearchQuery = $state('');
	let filteredResourceTypes = $derived(
		resourceTypes.filter((rt) => rt.toLowerCase().includes(resourceSearchQuery.toLowerCase()))
	);

	function handleResourceTypeChange(value: string) {
		filters = { ...filters, resourceType: value || null };
		onFilterChange(filters);
	}

	function handleDateChange(field: 'startDate' | 'endDate', value: string) {
		filters = { ...filters, [field]: value || null };
		onFilterChange(filters);
	}
</script>

<!-- Add after action filter -->
<div class="filter-group">
	<label for="resource-filter" class="block text-sm font-medium mb-2">Resource Type</label>
	<Popover.Root>
		<Popover.Trigger asChild let:builder>
			<Button variant="outline" builders={[builder]} class="w-full justify-start">
				{filters.resourceType || 'Select resource type...'}
			</Button>
		</Popover.Trigger>
		<Popover.Content class="w-64">
			<Input type="text" placeholder="Search..." bind:value={resourceSearchQuery} class="mb-2" />
			<div class="max-h-48 overflow-y-auto">
				{#each filteredResourceTypes as rt}
					<button
						class="w-full text-left px-2 py-1 hover:bg-gray-100"
						onclick={() => handleResourceTypeChange(rt)}
					>
						{rt}
					</button>
				{/each}
			</div>
		</Popover.Content>
	</Popover.Root>
</div>

<div class="filter-group">
	<label class="block text-sm font-medium mb-2">Date Range</label>
	<div class="flex gap-2">
		<Input
			type="date"
			placeholder="Start date"
			value={filters.startDate || ''}
			oninput={(e) => handleDateChange('startDate', e.currentTarget.value)}
		/>
		<Input
			type="date"
			placeholder="End date"
			value={filters.endDate || ''}
			oninput={(e) => handleDateChange('endDate', e.currentTarget.value)}
		/>
	</div>
	{#if filters.startDate && filters.endDate && filters.startDate > filters.endDate}
		<p class="text-red-500 text-sm mt-1">Start date must be before end date</p>
	{/if}
</div>
```

**Step 2: Run tests for resource and date filters**

```bash
npx vitest run tests/unit/components/AuditLogFilters.test.ts --grep "Resource Type Filter|Date Range Filter" --no-coverage
```

Expected: Resource Type and Date Range tests should PASS

**Step 3: Commit**

```bash
git add src/routes/dashboard/audit-log/_components/AuditLogFilters/AuditLogFilters.svelte
git commit -m "feat(audit-log): implement resource type autocomplete and date range filters"
```

---

## Task 5: AuditLogFilters - Employee Filter & Clear

**Files:**

- Modify: `src/routes/dashboard/audit-log/_components/AuditLogFilters/AuditLogFilters.svelte`

**Step 1: Add employee filter with debouncing**

```svelte
<!-- Add to AuditLogFilters.svelte -->
<script lang="ts">
	// ... existing code

	let employeeSearchQuery = $state('');
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	function handleEmployeeSearch(value: string) {
		employeeSearchQuery = value;

		if (debounceTimer) clearTimeout(debounceTimer);

		debounceTimer = setTimeout(() => {
			filters = { ...filters, employeeId: value || null };
			onFilterChange(filters);
		}, 300);
	}

	function handleClearFilters() {
		filters = {};
		employeeSearchQuery = '';
		resourceSearchQuery = '';
		onClear();
	}
</script>

<!-- Add after date range -->
<div class="filter-group">
	<label for="employee-filter" class="block text-sm font-medium mb-2">Employee</label>
	<Input
		id="employee-filter"
		type="text"
		placeholder="Search by ID or name..."
		value={employeeSearchQuery}
		oninput={(e) => handleEmployeeSearch(e.currentTarget.value)}
	/>
</div>

<div class="filter-actions mt-4">
	<Button variant="outline" onclick={handleClearFilters} class="w-full">Clear Filters</Button>
</div>
```

**Step 2: Run all AuditLogFilters tests**

```bash
npx vitest run tests/unit/components/AuditLogFilters.test.ts --no-coverage
```

Expected: ALL 47 tests should PASS

**Step 3: Commit**

```bash
git add src/routes/dashboard/audit-log/_components/AuditLogFilters/AuditLogFilters.svelte
git commit -m "feat(audit-log): implement employee filter with debouncing and clear filters"
```

---

## Task 6: Pagination Component (Optional)

**Files:**

- Create: `src/routes/dashboard/audit-log/_components/Pagination/Pagination.svelte`
- Modify: `tests/unit/components/Pagination.test.ts:38` (remove describe.skip)

**Note:** Pagination is NOT used in the final design (infinite scroll chosen instead), but tests exist for future use.

**Step 1: Create basic Pagination component**

```svelte
<!-- src/routes/dashboard/audit-log/_components/Pagination/Pagination.svelte -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';

	interface PaginationProps {
		currentPage: number;
		totalPages: number;
		pageSize: number;
		totalItems: number;
		onPageChange: (page: number) => void;
		onPageSizeChange: (size: number) => void;
	}

	let {
		currentPage,
		totalPages,
		pageSize,
		totalItems,
		onPageChange,
		onPageSizeChange
	}: PaginationProps = $props();

	let isPrevDisabled = $derived(currentPage === 1);
	let isNextDisabled = $derived(currentPage === totalPages);
</script>

<div class="pagination flex items-center justify-between gap-4">
	<div class="text-sm text-gray-600">
		Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems}
		items
	</div>

	<div class="flex items-center gap-2">
		<Button variant="outline" size="sm" disabled={isPrevDisabled} onclick={() => onPageChange(1)}>
			First
		</Button>
		<Button
			variant="outline"
			size="sm"
			disabled={isPrevDisabled}
			onclick={() => onPageChange(currentPage - 1)}
		>
			Prev
		</Button>
		<span class="text-sm">Page {currentPage} of {totalPages}</span>
		<Button
			variant="outline"
			size="sm"
			disabled={isNextDisabled}
			onclick={() => onPageChange(currentPage + 1)}
		>
			Next
		</Button>
		<Button
			variant="outline"
			size="sm"
			disabled={isNextDisabled}
			onclick={() => onPageChange(totalPages)}
		>
			Last
		</Button>
	</div>

	<Select.Root onValueChange={(v) => onPageSizeChange(Number(v))}>
		<Select.Trigger class="w-32">
			<Select.Value placeholder={String(pageSize)} />
		</Select.Trigger>
		<Select.Content>
			<Select.Item value="10">10 / page</Select.Item>
			<Select.Item value="25">25 / page</Select.Item>
			<Select.Item value="50">50 / page</Select.Item>
			<Select.Item value="100">100 / page</Select.Item>
		</Select.Content>
	</Select.Root>
</div>
```

**Step 2: Remove describe.skip and run tests**

```bash
sed -i "s/describe.skip('Pagination Component (TDD RED - should fail)'/describe('Pagination Component'/" tests/unit/components/Pagination.test.ts
npx vitest run tests/unit/components/Pagination.test.ts --no-coverage
```

Expected: 57 tests should PASS

**Step 3: Commit**

```bash
git add src/routes/dashboard/audit-log/_components/Pagination/
git commit -m "feat(audit-log): implement Pagination component (future use)"
```

---

## Task 7: RollbackButton - Setup & Basic Implementation

**Files:**

- Create: `src/routes/dashboard/audit-log/_components/RollbackButton/RollbackButton.svelte`
- Create: `src/routes/dashboard/audit-log/_components/RollbackButton/rollback.graphql.ts`
- Modify: `tests/unit/components/RollbackButton.test.ts:38` (remove describe.skip)

**Step 1: Create GraphQL mutation**

```typescript
// src/routes/dashboard/audit-log/_components/RollbackButton/rollback.graphql.ts
import { gql } from '@urql/core';

export const ROLLBACK_AUDIT_LOG = gql`
	mutation RollbackAuditLog($logId: ID!) {
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

export interface RollbackResponse {
	rollbackAuditLog: {
		success: boolean;
		conflicts: {
			hasConflicts: boolean;
			conflictFields: string[];
			currentState: Record<string, unknown>;
			targetState: Record<string, unknown>;
		};
	};
}
```

**Step 2: Create RollbackButton component**

```svelte
<!-- src/routes/dashboard/audit-log/_components/RollbackButton/RollbackButton.svelte -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { client } from '$lib/graphql/client';
	import { ROLLBACK_AUDIT_LOG, type RollbackResponse } from './rollback.graphql';

	interface ActivityLogEntry {
		id: string;
		rollbackStatus?: 'completed' | 'pending' | null;
	}

	interface RollbackButtonProps {
		log: ActivityLogEntry;
		userRole: string;
		onRollbackComplete?: () => void;
		onConflict?: (conflicts: RollbackResponse['rollbackAuditLog']['conflicts']) => void;
	}

	let { log, userRole, onRollbackComplete, onConflict }: RollbackButtonProps = $props();

	let showConfirmDialog = $state(false);
	let isRollingBack = $state(false);

	let isVisible = $derived(userRole === 'super_admin');
	let isDisabled = $derived(log.rollbackStatus === 'completed' || log.rollbackStatus === 'pending');

	async function handleRollback() {
		isRollingBack = true;

		try {
			const result = await client
				.mutation<RollbackResponse>(ROLLBACK_AUDIT_LOG, { logId: log.id })
				.toPromise();

			if (result.error) {
				console.error('Rollback failed:', result.error);
				return;
			}

			if (result.data?.rollbackAuditLog.conflicts.hasConflicts) {
				onConflict?.(result.data.rollbackAuditLog.conflicts);
			} else {
				onRollbackComplete?.();
			}
		} finally {
			isRollingBack = false;
			showConfirmDialog = false;
		}
	}
</script>

{#if isVisible}
	<AlertDialog.Root bind:open={showConfirmDialog}>
		<AlertDialog.Trigger asChild let:builder>
			<Button variant="destructive" size="sm" disabled={isDisabled} builders={[builder]}>
				{isRollingBack ? 'Rolling back...' : 'Rollback'}
			</Button>
		</AlertDialog.Trigger>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Confirm Rollback</AlertDialog.Title>
				<AlertDialog.Description>
					This will revert the changes made in this audit log entry. This action cannot be undone.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
				<AlertDialog.Action onclick={handleRollback}>Rollback</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/if}
```

**Step 3: Remove describe.skip and run tests**

```bash
sed -i "s/describe.skip('RollbackButton Component (TDD RED - should fail)'/describe('RollbackButton Component'/" tests/unit/components/RollbackButton.test.ts
npx vitest run tests/unit/components/RollbackButton.test.ts --no-coverage
```

Expected: 36 tests should PASS

**Step 4: Commit**

```bash
git add src/routes/dashboard/audit-log/_components/RollbackButton/
git commit -m "feat(audit-log): implement RollbackButton with confirmation and conflict handling"
```

---

## Task 8: ActivityFeed - Setup & Types

**Files:**

- Create: `src/routes/dashboard/audit-log/_components/ActivityFeed/activityFeed.types.ts`
- Create: `src/routes/dashboard/audit-log/_components/ActivityFeed/activityFeed.graphql.ts`
- Create: `src/routes/dashboard/audit-log/_components/ActivityFeed/ActivityFeedSkeleton.svelte`

**Step 1: Create types**

```typescript
// src/routes/dashboard/audit-log/_components/ActivityFeed/activityFeed.types.ts
export interface ActivityLogEntry {
	id: string;
	action: string;
	resourceType: string;
	resourceId: string;
	changes: Record<string, unknown>;
	performedBy: string;
	timestamp: string;
	rollbackStatus?: 'completed' | 'pending' | null;
	beforeSnapshot?: Record<string, unknown>;
	afterSnapshot?: Record<string, unknown>;
}

export interface ActivityFeedProps {
	logs: ActivityLogEntry[];
	onLoadMore?: () => void;
	hasMore?: boolean;
	loading?: boolean;
	selectedIds?: Set<string>;
	onSelectionChange?: (ids: Set<string>) => void;
}
```

**Step 2: Create GraphQL query**

```typescript
// src/routes/dashboard/audit-log/_components/ActivityFeed/activityFeed.graphql.ts
import { gql } from '@urql/core';

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

export const GET_INITIAL_AUDIT_LOGS = gql`
	query GetInitialAuditLogs($limit: Int!) {
		auditLogs(limit: $limit, offset: 0) {
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

**Step 3: Create skeleton loader**

```svelte
<!-- src/routes/dashboard/audit-log/_components/ActivityFeed/ActivityFeedSkeleton.svelte -->
<script lang="ts">
	interface SkeletonProps {
		count?: number;
	}

	let { count = 3 }: SkeletonProps = $props();
</script>

<div class="activity-feed-skeleton">
	{#each Array(count) as _, i (i)}
		<div class="skeleton-item p-4 border-b animate-pulse">
			<div class="flex justify-between mb-2">
				<div class="h-4 bg-gray-200 rounded w-32"></div>
				<div class="h-4 bg-gray-200 rounded w-24"></div>
			</div>
			<div class="h-3 bg-gray-200 rounded w-full mb-2"></div>
			<div class="h-3 bg-gray-200 rounded w-3/4"></div>
		</div>
	{/each}
</div>
```

**Step 4: Commit**

```bash
git add src/routes/dashboard/audit-log/_components/ActivityFeed/
git commit -m "feat(audit-log): create ActivityFeed types, GraphQL queries, and skeleton loader"
```

---

## Task 9: ActivityFeed - Main Component

**Files:**

- Create: `src/routes/dashboard/audit-log/_components/ActivityFeed/ActivityFeed.svelte`
- Create: `src/routes/dashboard/audit-log/_components/ActivityFeed/ActivityFeedEntry.svelte`

**Step 1: Create ActivityFeedEntry component**

```svelte
<!-- src/routes/dashboard/audit-log/_components/ActivityFeed/ActivityFeedEntry.svelte -->
<script lang="ts">
	import type { ActivityLogEntry } from './activityFeed.types';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import RollbackButton from '../RollbackButton/RollbackButton.svelte';

	interface EntryProps {
		log: ActivityLogEntry;
		isSelected: boolean;
		userRole: string;
		onToggleSelect: (id: string) => void;
		onRollbackComplete?: () => void;
		onConflict?: (conflicts: unknown) => void;
	}

	let { log, isSelected, userRole, onToggleSelect, onRollbackComplete, onConflict }: EntryProps =
		$props();

	let isExpanded = $state(false);
</script>

<div class="activity-feed-entry border-b p-4 hover:bg-gray-50">
	<div class="flex items-start gap-3">
		<Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(log.id)} />

		<div class="flex-1">
			<div class="flex justify-between items-start mb-2">
				<div>
					<span class="font-medium">{log.action}</span>
					<span class="text-gray-600"> on {log.resourceType}</span>
					<span class="text-gray-400 text-sm ml-2">#{log.resourceId}</span>
				</div>
				<div class="flex items-center gap-2">
					{#if log.rollbackStatus === 'completed'}
						<Badge variant="secondary">Rolled Back</Badge>
					{:else if log.rollbackStatus === 'pending'}
						<Badge variant="outline">Rollback Pending</Badge>
					{/if}
					<span class="text-sm text-gray-500">
						{new Date(log.timestamp).toLocaleString()}
					</span>
				</div>
			</div>

			<div class="text-sm text-gray-600 mb-2">
				Performed by: {log.performedBy}
			</div>

			<Button variant="ghost" size="sm" onclick={() => (isExpanded = !isExpanded)}>
				{isExpanded ? 'Hide' : 'Show'} Details
			</Button>

			{#if isExpanded}
				<div class="mt-3 p-3 bg-gray-50 rounded">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<h4 class="font-medium mb-2">Before:</h4>
							<pre class="text-xs bg-white p-2 rounded overflow-x-auto">
{JSON.stringify(log.beforeSnapshot, null, 2)}
							</pre>
						</div>
						<div>
							<h4 class="font-medium mb-2">After:</h4>
							<pre class="text-xs bg-white p-2 rounded overflow-x-auto">
{JSON.stringify(log.afterSnapshot, null, 2)}
							</pre>
						</div>
					</div>

					<div class="mt-3">
						<RollbackButton {log} {userRole} {onRollbackComplete} {onConflict} />
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
```

**Step 2: Create main ActivityFeed component**

```svelte
<!-- src/routes/dashboard/audit-log/_components/ActivityFeed/ActivityFeed.svelte -->
<script lang="ts">
	import type { ActivityFeedProps } from './activityFeed.types';
	import ActivityFeedEntry from './ActivityFeedEntry.svelte';
	import ActivityFeedSkeleton from './ActivityFeedSkeleton.svelte';
	import { Button } from '$lib/components/ui/button';

	let {
		logs,
		onLoadMore,
		hasMore = false,
		loading = false,
		selectedIds = new Set<string>(),
		onSelectionChange
	}: ActivityFeedProps = $props();

	let lastClickedIndex = $state<number | null>(null);

	function handleToggleSelect(id: string, index: number, event: MouseEvent) {
		const newSelection = new Set(selectedIds);

		if (event.shiftKey && lastClickedIndex !== null) {
			// Shift+Click range selection
			const start = Math.min(lastClickedIndex, index);
			const end = Math.max(lastClickedIndex, index);

			for (let i = start; i <= end; i++) {
				newSelection.add(logs[i].id);
			}
		} else {
			// Regular toggle
			if (newSelection.has(id)) {
				newSelection.delete(id);
			} else {
				newSelection.add(id);
			}
		}

		lastClickedIndex = index;
		onSelectionChange?.(newSelection);
	}

	function handleScroll(event: Event) {
		const target = event.currentTarget as HTMLDivElement;
		const bottom = target.scrollHeight - target.scrollTop - target.clientHeight;

		if (bottom < 200 && hasMore && !loading && onLoadMore) {
			onLoadMore();
		}
	}
</script>

<div
	class="activity-feed overflow-y-auto max-h-[600px]"
	data-scroll-container
	onscroll={handleScroll}
>
	{#if logs.length === 0 && !loading}
		<div class="empty-state p-8 text-center text-gray-500">
			No audit logs found. Try adjusting your filters.
		</div>
	{:else}
		{#each logs as log, index (log.id)}
			<ActivityFeedEntry
				{log}
				isSelected={selectedIds.has(log.id)}
				userRole="super_admin"
				onToggleSelect={(id) => handleToggleSelect(id, index, window.event as MouseEvent)}
			/>
		{/each}

		{#if loading}
			<ActivityFeedSkeleton count={3} />
		{/if}

		{#if hasMore && !loading}
			<div class="p-4 text-center">
				<Button variant="outline" onclick={onLoadMore}>Load More</Button>
			</div>
		{/if}
	{/if}
</div>
```

**Step 3: Remove describe.skip and run tests**

```bash
sed -i "s/describe.skip('ActivityFeed Component Enhancements (TDD RED - should fail)'/describe('ActivityFeed Component Enhancements'/" tests/unit/components/ActivityFeed.test.ts
npx vitest run tests/unit/components/ActivityFeed.test.ts --no-coverage
```

Expected: 49 tests should PASS

**Step 4: Commit**

```bash
git add src/routes/dashboard/audit-log/_components/ActivityFeed/
git commit -m "feat(audit-log): implement ActivityFeed with infinite scroll and Shift+Click selection"
```

---

## Task 10: RollbackRequestCard - Component

**Files:**

- Create: `src/routes/dashboard/audit-log/_components/RollbackRequestsDrawer/rollbackRequests.types.ts`
- Create: `src/routes/dashboard/audit-log/_components/RollbackRequestsDrawer/RollbackRequestCard.svelte`
- Modify: `tests/unit/components/RollbackRequestCard.test.ts:38` (remove describe.skip)

**Step 1: Create types**

```typescript
// src/routes/dashboard/audit-log/_components/RollbackRequestsDrawer/rollbackRequests.types.ts
export interface RollbackRequest {
	id: string;
	status: 'pending' | 'approved' | 'rejected';
	requestedBy: string;
	targetLogId: string;
	createdAt: string;
	reason?: string;
}

export interface RollbackRequestCardProps {
	request: RollbackRequest;
	currentUserRole: string;
	onApprove?: (requestId: string) => Promise<void>;
	onReject?: (requestId: string, reason: string) => Promise<void>;
}
```

**Step 2: Create RollbackRequestCard**

```svelte
<!-- src/routes/dashboard/audit-log/_components/RollbackRequestsDrawer/RollbackRequestCard.svelte -->
<script lang="ts">
	import type { RollbackRequestCardProps } from './rollbackRequests.types';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';

	let { request, currentUserRole, onApprove, onReject }: RollbackRequestCardProps = $props();

	let showRejectDialog = $state(false);
	let rejectReason = $state('');
	let isProcessing = $state(false);

	let canApprove = $derived(currentUserRole === 'hr_manager' && request.status === 'pending');

	async function handleApprove() {
		isProcessing = true;
		try {
			await onApprove?.(request.id);
		} finally {
			isProcessing = false;
		}
	}

	async function handleReject() {
		if (!rejectReason.trim()) return;

		isProcessing = true;
		try {
			await onReject?.(request.id, rejectReason);
			showRejectDialog = false;
			rejectReason = '';
		} finally {
			isProcessing = false;
		}
	}
</script>

<div class="rollback-request-card border rounded p-4 mb-3">
	<div class="flex justify-between items-start mb-2">
		<div>
			<div class="font-medium">Request #{request.id}</div>
			<div class="text-sm text-gray-600">
				Requested by: {request.requestedBy}
			</div>
			<div class="text-sm text-gray-600">
				Target Log: #{request.targetLogId}
			</div>
		</div>
		<Badge
			variant={request.status === 'approved'
				? 'default'
				: request.status === 'rejected'
					? 'destructive'
					: 'secondary'}
		>
			{request.status.toUpperCase()}
		</Badge>
	</div>

	<div class="text-xs text-gray-500 mb-3">
		{new Date(request.createdAt).toLocaleString()}
	</div>

	{#if canApprove}
		<div class="flex gap-2">
			<Button size="sm" onclick={handleApprove} disabled={isProcessing}>Approve</Button>
			<Dialog.Root bind:open={showRejectDialog}>
				<Dialog.Trigger asChild let:builder>
					<Button variant="destructive" size="sm" builders={[builder]} disabled={isProcessing}>
						Reject
					</Button>
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Reject Rollback Request</Dialog.Title>
						<Dialog.Description>
							Please provide a reason for rejecting this request.
						</Dialog.Description>
					</Dialog.Header>
					<div class="py-4">
						<Input type="text" placeholder="Reason for rejection..." bind:value={rejectReason} />
					</div>
					<Dialog.Footer>
						<Button variant="outline" onclick={() => (showRejectDialog = false)}>Cancel</Button>
						<Button
							variant="destructive"
							onclick={handleReject}
							disabled={!rejectReason.trim() || isProcessing}
						>
							Reject
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	{/if}
</div>
```

**Step 3: Remove describe.skip and run tests**

```bash
sed -i "s/describe.skip('RollbackRequestCard Component (TDD RED - should fail)'/describe('RollbackRequestCard Component'/" tests/unit/components/RollbackRequestCard.test.ts
npx vitest run tests/unit/components/RollbackRequestCard.test.ts --no-coverage
```

Expected: 46 tests should PASS

**Step 4: Commit**

```bash
git add src/routes/dashboard/audit-log/_components/RollbackRequestsDrawer/
git commit -m "feat(audit-log): implement RollbackRequestCard with approve/reject actions"
```

---

## Task 11: BulkRollbackDialog - SSE Setup

**Files:**

- Create: `src/routes/dashboard/audit-log/_components/BulkRollbackDialog/bulkRollback.sse.ts`
- Create: `src/routes/dashboard/audit-log/_components/BulkRollbackDialog/bulkRollback.graphql.ts`

**Step 1: Create SSE utility**

```typescript
// src/routes/dashboard/audit-log/_components/BulkRollbackDialog/bulkRollback.sse.ts
export interface BulkRollbackProgress {
	batchId: string;
	total: number;
	completed: number;
	failed: number;
	percentage: number;
	errors?: Array<{ logId: string; message: string }>;
}

export function createProgressStream(batchId: string) {
	const eventSource = new EventSource(`/api/rollback-progress/${batchId}`);

	return {
		onProgress(callback: (progress: BulkRollbackProgress) => void) {
			eventSource.addEventListener('progress', (e: MessageEvent) => {
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
			eventSource.addEventListener('error', () => {
				callback(new Error('SSE connection failed'));
			});
		},
		close() {
			eventSource.close();
		}
	};
}
```

**Step 2: Create GraphQL mutation**

```typescript
// src/routes/dashboard/audit-log/_components/BulkRollbackDialog/bulkRollback.graphql.ts
import { gql } from '@urql/core';

export const CREATE_BULK_ROLLBACK = gql`
	mutation CreateBulkRollback($logIds: [ID!]!) {
		createBulkRollback(logIds: $logIds) {
			success
			batchId
		}
	}
`;

export interface BulkRollbackResponse {
	createBulkRollback: {
		success: boolean;
		batchId: string;
	};
}
```

**Step 3: Commit**

```bash
git add src/routes/dashboard/audit-log/_components/BulkRollbackDialog/
git commit -m "feat(audit-log): create SSE utility and GraphQL mutation for bulk rollback"
```

---

## Task 12: BulkRollbackDialog - Component

**Files:**

- Create: `src/routes/dashboard/audit-log/_components/BulkRollbackDialog/BulkRollbackDialog.svelte`
- Create: `src/routes/dashboard/audit-log/_components/BulkRollbackDialog/ProgressBar.svelte`
- Modify: `tests/unit/components/BulkRollbackDialog.test.ts:38` (remove describe.skip)

**Step 1: Create ProgressBar**

```svelte
<!-- src/routes/dashboard/audit-log/_components/BulkRollbackDialog/ProgressBar.svelte -->
<script lang="ts">
	import { Progress } from '$lib/components/ui/progress';

	interface ProgressBarProps {
		percentage: number;
		completed: number;
		total: number;
		failed: number;
	}

	let { percentage, completed, total, failed }: ProgressBarProps = $props();
</script>

<div class="progress-bar-container">
	<div class="flex justify-between text-sm mb-2">
		<span>Progress: {percentage}%</span>
		<span>{completed} of {total} completed{failed > 0 ? `, ${failed} failed` : ''}</span>
	</div>
	<Progress value={percentage} class="h-2" />
</div>
```

**Step 2: Create BulkRollbackDialog**

```svelte
<!-- src/routes/dashboard/audit-log/_components/BulkRollbackDialog/BulkRollbackDialog.svelte -->
<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { client } from '$lib/graphql/client';
	import { createProgressStream, type BulkRollbackProgress } from './bulkRollback.sse';
	import { CREATE_BULK_ROLLBACK, type BulkRollbackResponse } from './bulkRollback.graphql';
	import ProgressBar from './ProgressBar.svelte';

	interface BulkRollbackDialogProps {
		selectedLogIds: Set<string>;
		open: boolean;
		onClose: () => void;
		onComplete?: () => void;
	}

	let { selectedLogIds, open, onClose, onComplete }: BulkRollbackDialogProps = $props();

	let progress = $state<BulkRollbackProgress>({
		batchId: '',
		total: 0,
		completed: 0,
		failed: 0,
		percentage: 0
	});
	let isStarting = $state(false);
	let hasStarted = $state(false);

	async function startBulkRollback() {
		isStarting = true;

		try {
			const result = await client
				.mutation<BulkRollbackResponse>(CREATE_BULK_ROLLBACK, {
					logIds: Array.from(selectedLogIds)
				})
				.toPromise();

			if (result.error || !result.data?.createBulkRollback.success) {
				console.error('Failed to start bulk rollback');
				return;
			}

			const batchId = result.data.createBulkRollback.batchId;
			hasStarted = true;
			connectToProgress(batchId);
		} finally {
			isStarting = false;
		}
	}

	function connectToProgress(batchId: string) {
		const stream = createProgressStream(batchId);

		stream.onProgress((update) => {
			progress = update;
		});

		stream.onComplete(() => {
			setTimeout(() => {
				onComplete?.();
				onClose();
			}, 3000);
		});

		stream.onError((error) => {
			console.error('SSE error:', error);
			// TODO: Implement retry logic or polling fallback
		});
	}

	$effect(() => {
		if (!open) {
			// Reset state when dialog closes
			hasStarted = false;
			progress = {
				batchId: '',
				total: 0,
				completed: 0,
				failed: 0,
				percentage: 0
			};
		}
	});
</script>

<Dialog.Root {open} onOpenChange={(isOpen) => !isOpen && onClose()}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Bulk Rollback</Dialog.Title>
			<Dialog.Description>
				Rolling back {selectedLogIds.size} audit log entries
			</Dialog.Description>
		</Dialog.Header>

		<div class="py-4">
			{#if !hasStarted}
				<div class="text-center">
					<p class="mb-4">Ready to rollback {selectedLogIds.size} entries.</p>
					<Button onclick={startBulkRollback} disabled={isStarting}>
						{isStarting ? 'Starting...' : 'Start Rollback'}
					</Button>
				</div>
			{:else}
				<ProgressBar
					percentage={progress.percentage}
					completed={progress.completed}
					total={progress.total}
					failed={progress.failed}
				/>

				{#if progress.errors && progress.errors.length > 0}
					<div class="mt-4 p-3 bg-red-50 rounded">
						<h4 class="font-medium text-red-800 mb-2">Errors:</h4>
						<ul class="text-sm text-red-700 space-y-1">
							{#each progress.errors as error}
								<li>Log #{error.logId}: {error.message}</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if progress.percentage === 100}
					<div class="mt-4 text-center text-green-600 font-medium">Rollback complete!</div>
				{/if}
			{/if}
		</div>

		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={onClose}
				disabled={hasStarted && progress.percentage < 100}
			>
				{progress.percentage === 100 ? 'Close' : 'Cancel'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
```

**Step 3: Remove describe.skip and run tests**

```bash
sed -i "s/describe.skip('BulkRollbackDialog Component (TDD RED - should fail)'/describe('BulkRollbackDialog Component'/" tests/unit/components/BulkRollbackDialog.test.ts
npx vitest run tests/unit/components/BulkRollbackDialog.test.ts --no-coverage
```

Expected: 51 tests should PASS

**Step 4: Commit**

```bash
git add src/routes/dashboard/audit-log/_components/BulkRollbackDialog/
git commit -m "feat(audit-log): implement BulkRollbackDialog with SSE progress tracking"
```

---

## Task 13: ConflictResolutionModal - Component

**Files:**

- Create: `src/routes/dashboard/audit-log/_components/ConflictResolutionModal/ConflictResolutionModal.svelte`
- Create: `src/routes/dashboard/audit-log/_components/ConflictResolutionModal/ConflictDiff.svelte`
- Create: `src/routes/dashboard/audit-log/_components/ConflictResolutionModal/conflictResolution.graphql.ts`
- Modify: `tests/unit/components/ConflictResolutionModal.test.ts:38` (remove describe.skip)

**Step 1: Create GraphQL mutation**

```typescript
// src/routes/dashboard/audit-log/_components/ConflictResolutionModal/conflictResolution.graphql.ts
import { gql } from '@urql/core';

export type ResolutionStrategy = 'force' | 'cancel' | 'merge';

export const RESOLVE_ROLLBACK_CONFLICT = gql`
	mutation ResolveRollbackConflict(
		$logId: ID!
		$strategy: ResolutionStrategy!
		$mergeFields: [String!]
	) {
		resolveRollbackConflict(logId: $logId, strategy: $strategy, mergeFields: $mergeFields) {
			success
		}
	}
`;

export interface ConflictData {
	hasConflicts: boolean;
	conflictFields: string[];
	currentState: Record<string, unknown>;
	targetState: Record<string, unknown>;
}
```

**Step 2: Create ConflictDiff**

```svelte
<!-- src/routes/dashboard/audit-log/_components/ConflictResolutionModal/ConflictDiff.svelte -->
<script lang="ts">
	interface ConflictDiffProps {
		field: string;
		currentValue: unknown;
		targetValue: unknown;
	}

	let { field, currentValue, targetValue }: ConflictDiffProps = $props();
</script>

<div class="conflict-diff border rounded p-3 mb-2">
	<div class="font-medium mb-2">{field}</div>
	<div class="grid grid-cols-2 gap-3">
		<div>
			<div class="text-sm text-gray-600 mb-1">Current:</div>
			<pre class="text-xs bg-red-50 p-2 rounded overflow-x-auto">
{JSON.stringify(currentValue, null, 2)}
			</pre>
		</div>
		<div>
			<div class="text-sm text-gray-600 mb-1">Target:</div>
			<pre class="text-xs bg-green-50 p-2 rounded overflow-x-auto">
{JSON.stringify(targetValue, null, 2)}
			</pre>
		</div>
	</div>
</div>
```

**Step 3: Create ConflictResolutionModal**

```svelte
<!-- src/routes/dashboard/audit-log/_components/ConflictResolutionModal/ConflictResolutionModal.svelte -->
<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import ConflictDiff from './ConflictDiff.svelte';
	import type { ConflictData, ResolutionStrategy } from './conflictResolution.graphql';

	interface ConflictResolutionModalProps {
		conflicts: ConflictData;
		onResolve: (strategy: ResolutionStrategy) => Promise<void>;
		onCancel: () => void;
	}

	let { conflicts, onResolve, onCancel }: ConflictResolutionModalProps = $props();

	let selectedStrategy = $state<ResolutionStrategy | null>(null);
	let isResolving = $state(false);

	let canSubmit = $derived(selectedStrategy !== null);

	async function handleSubmit() {
		if (!canSubmit || !selectedStrategy) return;

		isResolving = true;
		try {
			await onResolve(selectedStrategy);
		} finally {
			isResolving = false;
		}
	}
</script>

<Dialog.Root open={conflicts.hasConflicts} onOpenChange={(isOpen) => !isOpen && onCancel()}>
	<Dialog.Content class="max-w-3xl">
		<Dialog.Header>
			<Dialog.Title>Resolve Rollback Conflicts</Dialog.Title>
			<Dialog.Description>
				The data has changed since this audit log was created. Choose how to proceed.
			</Dialog.Description>
		</Dialog.Header>

		<div class="py-4 max-h-96 overflow-y-auto">
			<div class="mb-4">
				<h4 class="font-medium mb-2">Conflicts detected in:</h4>
				<div class="flex flex-wrap gap-2">
					{#each conflicts.conflictFields as field}
						<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-sm rounded">
							{field}
						</span>
					{/each}
				</div>
			</div>

			<div class="mb-4">
				{#each conflicts.conflictFields as field}
					<ConflictDiff
						{field}
						currentValue={conflicts.currentState[field]}
						targetValue={conflicts.targetState[field]}
					/>
				{/each}
			</div>

			<div class="mb-4">
				<h4 class="font-medium mb-2">Resolution Strategy:</h4>
				<RadioGroup.Root bind:value={selectedStrategy}>
					<div class="space-y-2">
						<div class="flex items-start gap-2">
							<RadioGroup.Item value="force" id="force" />
							<label for="force" class="text-sm">
								<div class="font-medium">Force Rollback</div>
								<div class="text-gray-600">Overwrite current state with target state</div>
							</label>
						</div>
						<div class="flex items-start gap-2">
							<RadioGroup.Item value="cancel" id="cancel" />
							<label for="cancel" class="text-sm">
								<div class="font-medium">Cancel</div>
								<div class="text-gray-600">Abort the rollback operation</div>
							</label>
						</div>
						<div class="flex items-start gap-2">
							<RadioGroup.Item value="merge" id="merge" />
							<label for="merge" class="text-sm">
								<div class="font-medium">Merge</div>
								<div class="text-gray-600">Manually select which fields to rollback</div>
							</label>
						</div>
					</div>
				</RadioGroup.Root>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={onCancel} disabled={isResolving}>Cancel</Button>
			<Button onclick={handleSubmit} disabled={!canSubmit || isResolving}>
				{isResolving ? 'Resolving...' : 'Resolve'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
```

**Step 4: Remove describe.skip and run tests**

```bash
sed -i "s/describe.skip('ConflictResolutionModal Component (TDD RED - should fail)'/describe('ConflictResolutionModal Component'/" tests/unit/components/ConflictResolutionModal.test.ts
npx vitest run tests/unit/components/ConflictResolutionModal.test.ts --no-coverage
```

Expected: 46 tests should PASS

**Step 5: Commit**

```bash
git add src/routes/dashboard/audit-log/_components/ConflictResolutionModal/
git commit -m "feat(audit-log): implement ConflictResolutionModal with diff view and strategy selection"
```

---

## Task 14: Integration - Wire Components Together

**Files:**

- Modify: `src/routes/dashboard/audit-log/+page.svelte`
- Modify: `src/routes/dashboard/audit-log/+page.server.ts`

**Step 1: Update +page.server.ts with real GraphQL query**

```typescript
// src/routes/dashboard/audit-log/+page.server.ts
import type { PageServerLoad } from './$types';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { GET_INITIAL_AUDIT_LOGS } from './_components/ActivityFeed/activityFeed.graphql';

export const load: PageServerLoad = async ({ fetch, cookies, locals }) => {
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	const result = await client
		.query(GET_INITIAL_AUDIT_LOGS, {
			limit: 50
		})
		.toPromise();

	return {
		initialLogs: result.data?.auditLogs ?? [],
		user: locals.user
	};
};
```

**Step 2: Update +page.svelte with full integration**

```svelte
<!-- src/routes/dashboard/audit-log/+page.svelte -->
<script lang="ts">
	import type { FilterValues } from './_components/AuditLogFilters/filters.types';
	import type { ActivityLogEntry } from './_components/ActivityFeed/activityFeed.types';
	import AuditLogFilters from './_components/AuditLogFilters/AuditLogFilters.svelte';
	import ActivityFeed from './_components/ActivityFeed/ActivityFeed.svelte';
	import BulkRollbackDialog from './_components/BulkRollbackDialog/BulkRollbackDialog.svelte';
	import ConflictResolutionModal from './_components/ConflictResolutionModal/ConflictResolutionModal.svelte';
	import { Button } from '$lib/components/ui/button';
	import { client } from '$lib/graphql/client';
	import { GET_AUDIT_LOGS } from './_components/ActivityFeed/activityFeed.graphql';
	import type { ConflictData } from './_components/ConflictResolutionModal/conflictResolution.graphql';

	let { data } = $props();

	let logs = $state<ActivityLogEntry[]>(data.initialLogs);
	let filters = $state<FilterValues>({});
	let selectedLogIds = $state<Set<string>>(new Set());
	let offset = $state(50);
	let hasMore = $state(true);
	let loading = $state(false);
	let showBulkDialog = $state(false);
	let conflictData = $state<ConflictData | null>(null);

	async function handleFilterChange(newFilters: FilterValues) {
		filters = newFilters;
		selectedLogIds.clear();
		offset = 0;
		await loadLogs(true);
	}

	async function loadLogs(reset = false) {
		loading = true;

		try {
			const result = await client
				.query(GET_AUDIT_LOGS, {
					limit: 50,
					offset: reset ? 0 : offset,
					filters
				})
				.toPromise();

			if (result.error) {
				console.error('Failed to load logs:', result.error);
				return;
			}

			const newLogs = result.data?.auditLogs ?? [];

			if (reset) {
				logs = newLogs;
			} else {
				logs = [...logs, ...newLogs];
			}

			hasMore = newLogs.length === 50;
			offset = reset ? 50 : offset + 50;
		} finally {
			loading = false;
		}
	}

	function handleClearFilters() {
		filters = {};
		loadLogs(true);
	}

	function handleSelectionChange(ids: Set<string>) {
		selectedLogIds = ids;
	}

	function handleBulkRollbackComplete() {
		showBulkDialog = false;
		selectedLogIds.clear();
		loadLogs(true);
	}

	function handleConflict(conflicts: ConflictData) {
		conflictData = conflicts;
	}

	async function handleResolveConflict(strategy: 'force' | 'cancel' | 'merge') {
		// TODO: Call conflict resolution mutation
		conflictData = null;
		loadLogs(true);
	}

	function handleCancelConflict() {
		conflictData = null;
	}
</script>

<div class="audit-log-page flex h-screen">
	<!-- Left Sidebar - Filters -->
	<aside class="w-64 border-r p-4 overflow-y-auto">
		<h2 class="text-lg font-semibold mb-4">Filters</h2>
		<AuditLogFilters
			resourceTypes={['Employee', 'Department', 'Task', 'Goal', 'Document']}
			onFilterChange={handleFilterChange}
			onClear={handleClearFilters}
		/>
	</aside>

	<!-- Main Content - Activity Feed -->
	<main class="flex-1 flex flex-col">
		<header class="border-b p-4 flex justify-between items-center">
			<h1 class="text-2xl font-bold">Audit Log</h1>
			{#if selectedLogIds.size > 0}
				<span class="text-sm text-gray-600">{selectedLogIds.size} selected</span>
			{/if}
		</header>

		<div class="flex-1 overflow-hidden">
			<ActivityFeed
				{logs}
				{hasMore}
				{loading}
				selectedIds={selectedLogIds}
				onLoadMore={loadLogs}
				onSelectionChange={handleSelectionChange}
			/>
		</div>
	</main>

	<!-- Floating Action Button -->
	{#if selectedLogIds.size > 0}
		<button
			class="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700"
			onclick={() => (showBulkDialog = true)}
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			<span class="ml-2">Rollback ({selectedLogIds.size})</span>
		</button>
	{/if}
</div>

<!-- Dialogs -->
<BulkRollbackDialog
	{selectedLogIds}
	open={showBulkDialog}
	onClose={() => (showBulkDialog = false)}
	onComplete={handleBulkRollbackComplete}
/>

{#if conflictData}
	<ConflictResolutionModal
		conflicts={conflictData}
		onResolve={handleResolveConflict}
		onCancel={handleCancelConflict}
	/>
{/if}
```

**Step 3: Test the integrated page**

```bash
# Start dev server
mise run dev

# Navigate to http://localhost:5173/dashboard/audit-log
# Test:
# 1. Filters work
# 2. Infinite scroll works
# 3. Shift+Click selection works
# 4. FAB appears when items selected
# 5. Bulk rollback dialog opens
```

**Step 4: Run all component tests**

```bash
npx vitest run tests/unit/components/ActivityFeed.test.ts tests/unit/components/AuditLogFilters.test.ts tests/unit/components/BulkRollbackDialog.test.ts tests/unit/components/ConflictResolutionModal.test.ts tests/unit/components/Pagination.test.ts tests/unit/components/RollbackButton.test.ts tests/unit/components/RollbackRequestCard.test.ts --no-coverage
```

Expected: ALL 332 tests should PASS

**Step 5: Commit**

```bash
git add src/routes/dashboard/audit-log/
git commit -m "feat(audit-log): integrate all components into audit log page"
```

---

## Task 15: Final Testing & Cleanup

**Files:**

- Run: Full test suite
- Check: TypeScript errors
- Verify: All describe.skip removed

**Step 1: Run unit tests**

```bash
npx vitest run --project unit-server --no-coverage
```

Expected: All tests pass, including the 332 audit log tests

**Step 2: Check TypeScript**

```bash
mise run check
```

Expected: No TypeScript errors

**Step 3: Verify no describe.skip remain**

```bash
grep -r "describe.skip" tests/unit/components/ | grep -E "(Activity|Audit|Rollback|Pagination|Conflict)"
```

Expected: No matches (all skips removed)

**Step 4: Run E2E tests (if available)**

```bash
mise run test:e2e
```

Expected: E2E tests pass (or skip if backend not ready)

**Step 5: Final commit**

```bash
git add .
git commit -m "feat(audit-log): complete implementation - all 332 tests passing"
```

---

## Success Criteria

- ✅ All 332 TDD RED tests passing
- ✅ No TypeScript errors
- ✅ Components follow Svelte 5 runes patterns
- ✅ Feature Module Pattern implemented
- ✅ SSE connections properly managed
- ✅ GraphQL operations typed correctly
- ✅ Error states handled gracefully
- ✅ Loading states with skeletons

## Open Questions for Backend Team

1. **GraphQL Schema:** Do the following mutations exist?
   - `rollbackAuditLog(logId: ID!)`
   - `createBulkRollback(logIds: [ID!]!)`
   - `resolveRollbackConflict(logId: ID!, strategy: ResolutionStrategy!)`

2. **SSE Endpoint:** Does `/api/rollback-progress/{batchId}` exist?

3. **Permissions:** Is RBAC middleware checking `super_admin` and `hr_manager` roles?

4. **Conflict Detection:** What's the backend logic for detecting conflicts?

If these don't exist, they need to be implemented on the backend before full E2E testing.
