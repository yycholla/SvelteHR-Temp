# SvelteHR v2 API Components Integration Guide

This guide provides practical examples and patterns for integrating the v2 API components into your SvelteHR application.

## Quick Start

### 1. Basic WebSocket Integration

```svelte
<!-- src/lib/stores/websocket.ts -->
<script lang="ts" context="module">
	import { writable } from 'svelte/store';

	export type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'reconnecting';

	interface WebSocketState {
		status: ConnectionState;
		latency: number;
		lastConnected: Date | null;
		retryCount: number;
	}

	export const wsState = writable<WebSocketState>({
		status: 'disconnected',
		latency: 0,
		lastConnected: null,
		retryCount: 0
	});
</script>

<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import { WebSocketIndicator } from '$lib/components/ui';
	import { wsState } from '$lib/stores/websocket';
	import { onMount } from 'svelte';

	let ws: WebSocket | null = null;

	onMount(() => {
		connectWebSocket();

		return () => {
			ws?.close();
		};
	});

	function connectWebSocket() {
		ws = new WebSocket('ws://localhost:8080/ws');

		ws.onopen = () => {
			wsState.update((state) => ({
				...state,
				status: 'connected',
				lastConnected: new Date(),
				retryCount: 0
			}));
		};

		ws.onclose = () => {
			wsState.update((state) => ({
				...state,
				status: 'disconnected'
			}));

			// Auto-reconnect logic
			setTimeout(connectWebSocket, 3000);
		};
	}
</script>

<!-- Global WebSocket Status -->
<WebSocketIndicator
	status={$wsState.status}
	latency={$wsState.latency}
	lastConnected={$wsState.lastConnected}
	retryCount={$wsState.retryCount}
	position="top-right"
	showWhenConnected={false}
/>
```

### 2. Notification Center Setup

```svelte
<!-- src/lib/stores/notifications.ts -->
<script lang="ts" context="module">
	import { writable } from 'svelte/store';
	import type { Notification } from '$lib/components/ui';

	export const notifications = writable<Notification[]>([]);
	export const toastQueue = writable<Notification[]>([]);

	export function addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
		const newNotification: Notification = {
			...notification,
			id: crypto.randomUUID(),
			timestamp: new Date(),
			read: false
		};

		notifications.update((current) => [newNotification, ...current]);

		// Add to toast queue for immediate display
		if (notification.priority === 'urgent' || notification.priority === 'error') {
			toastQueue.update((current) => [newNotification, ...current]);
		}
	}

	export function markAsRead(id: string) {
		notifications.update((current) => current.map((n) => (n.id === id ? { ...n, read: true } : n)));
	}

	export function dismissToast(id: string) {
		toastQueue.update((current) => current.filter((n) => n.id !== id));
	}
</script>

<!-- src/lib/components/NotificationSystem.svelte -->
<script lang="ts">
	import { NotificationCenter, ToastNotification } from '$lib/components/ui';
	import { notifications, toastQueue, markAsRead, dismissToast } from '$lib/stores/notifications';

	export let isOpen = false;

	function handleMarkAllRead() {
		notifications.update((current) => current.map((n) => ({ ...n, read: true })));
	}

	function handleClearAll() {
		notifications.set([]);
	}

	function handleNotificationClick(notification: Notification) {
		if (notification.actionUrl) {
			window.open(notification.actionUrl, '_blank');
		}
		markAsRead(notification.id);
	}
</script>

<!-- Notification Center -->
<NotificationCenter
	notifications={$notifications}
	{isOpen}
	onClose={() => (isOpen = false)}
	onMarkRead={markAsRead}
	onMarkAllRead={handleMarkAllRead}
	onClearAll={handleClearAll}
	onNotificationClick={handleNotificationClick}
/>

<!-- Toast Notifications -->
<div class="fixed top-20 right-4 z-[100] space-y-2">
	{#each $toastQueue as notification (notification.id)}
		<ToastNotification
			{notification}
			onDismiss={dismissToast}
			onAction={handleNotificationClick}
			autoHideDuration={notification.priority === 'urgent' ? 0 : 5000}
		/>
	{/each}
</div>
```

### 3. Job Progress Integration

```svelte
<!-- src/lib/stores/jobs.ts -->
<script lang="ts" context="module">
	import { writable } from 'svelte/store';
	import type { BackgroundJob } from '$lib/components/ui';

	export const backgroundJobs = writable<BackgroundJob[]>([]);

	export async function startBulkOperation(type: string, data: any) {
		const job: BackgroundJob = {
			id: crypto.randomUUID(),
			type: type as any,
			title: `${type.replace('_', ' ')} Operation`,
			status: 'pending',
			priority: 'normal',
			progress: 0,
			createdAt: new Date(),
			canCancel: true,
			canRetry: false
		};

		backgroundJobs.update((jobs) => [...jobs, job]);

		// Start the actual operation
		try {
			await executeJob(job.id, data);
		} catch (error) {
			updateJobStatus(job.id, 'failed', { error: error.message });
		}
	}

	export function updateJobProgress(jobId: string, progress: number, stepDescription?: string) {
		backgroundJobs.update((jobs) =>
			jobs.map((job) =>
				job.id === jobId ? { ...job, progress, stepDescription, status: 'running' as const } : job
			)
		);
	}

	export function updateJobStatus(jobId: string, status: BackgroundJob['status'], data?: any) {
		backgroundJobs.update((jobs) =>
			jobs.map((job) =>
				job.id === jobId
					? {
							...job,
							status,
							completedAt: status === 'completed' ? new Date() : undefined,
							error: data?.error,
							result: data?.result
						}
					: job
			)
		);
	}
</script>

<!-- src/lib/components/BulkOperations.svelte -->
<script lang="ts">
	import {
		EnhancedBulkActionsBar,
		BulkOperationsContext,
		JobProgressDashboard
	} from '$lib/components/ui';
	import { backgroundJobs, startBulkOperation } from '$lib/stores/jobs';
	import { Edit, Download, Trash2, Archive } from 'lucide-svelte';

	let selectedItems: string[] = [];

	const bulkActions = [
		{
			id: 'bulk-edit',
			label: 'Bulk Edit',
			icon: Edit,
			variant: 'outline' as const,
			description: 'Edit multiple items at once'
		},
		{
			id: 'export',
			label: 'Export',
			icon: Download,
			variant: 'outline' as const,
			description: 'Export selected items'
		},
		{
			id: 'archive',
			label: 'Archive',
			icon: Archive,
			variant: 'outline' as const,
			description: 'Archive selected items',
			requiresConfirmation: true,
			confirmationTitle: 'Archive Items',
			confirmationMessage: 'Are you sure you want to archive the selected items?'
		},
		{
			id: 'delete',
			label: 'Delete',
			icon: Trash2,
			variant: 'destructive' as const,
			description: 'Permanently delete selected items',
			requiresConfirmation: true,
			confirmationTitle: 'Delete Items',
			confirmationMessage: 'This action cannot be undone. Are you sure?'
		}
	];

	async function handleBulkAction(actionId: string, items: string[]) {
		await startBulkOperation(`bulk_${actionId}`, { items });
		selectedItems = []; // Clear selection after starting operation
	}
</script>

<BulkOperationsContext>
	<!-- Your data table/list here -->

	<!-- Bulk Actions Bar -->
	<EnhancedBulkActionsBar
		selectedCount={selectedItems.length}
		actions={bulkActions}
		onAction={handleBulkAction}
		onClear={() => (selectedItems = [])}
		{selectedItems}
	/>

	<!-- Job Progress Dashboard -->
	<JobProgressDashboard
		jobs={$backgroundJobs}
		variant="floating"
		onCancel={cancelJob}
		onRetry={retryJob}
		onClearCompleted={() => {
			backgroundJobs.update((jobs) => jobs.filter((job) => job.status !== 'completed'));
		}}
	/>
</BulkOperationsContext>
```

### 4. Enhanced Dashboard Cards

```svelte
<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
	import { LiveMetricCard, ActivityFeedCard, StatusOverviewCard } from '$lib/components/ui';
	import { Users, Calendar, CheckSquare, AlertTriangle } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let metrics = {
		activeEmployees: {
			value: 1247,
			previousValue: 1230,
			change: 1.4,
			changeType: 'increase' as const
		},
		pendingTasks: {
			value: 23,
			previousValue: 30,
			change: -23.3,
			changeType: 'decrease' as const
		},
		complianceRate: {
			value: 98.5,
			previousValue: 97.8,
			change: 0.7,
			changeType: 'increase' as const,
			unit: '%'
		}
	};

	let recentActivity = [];
	let systemStatus = [
		{
			id: 'db-connection',
			label: 'Database',
			value: 'Healthy',
			status: 'healthy' as const,
			description: 'All connections active'
		},
		{
			id: 'api-response',
			label: 'API Response Time',
			value: 45,
			status: 'healthy' as const,
			unit: 'ms',
			target: 100
		},
		{
			id: 'job-queue',
			label: 'Job Queue',
			value: 3,
			status: 'warning' as const,
			description: '3 jobs pending',
			unit: 'jobs'
		}
	];

	onMount(() => {
		// Set up real-time updates via WebSocket
		const ws = new WebSocket('ws://localhost:8080/dashboard');

		ws.onmessage = (event) => {
			const update = JSON.parse(event.data);

			switch (update.type) {
				case 'metrics':
					metrics = { ...metrics, ...update.data };
					break;
				case 'activity':
					recentActivity = [update.data, ...recentActivity.slice(0, 9)];
					break;
				case 'system_status':
					systemStatus = systemStatus.map((item) =>
						item.id === update.data.id ? { ...item, ...update.data } : item
					);
					break;
			}
		};

		return () => ws.close();
	});
</script>

<div class="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
	<!-- Live Metric Cards -->
	<LiveMetricCard
		title="Active Employees"
		description="Currently employed staff members"
		metric={metrics.activeEmployees}
		icon={Users}
		isLive={true}
		lastUpdated={new Date()}
	/>

	<LiveMetricCard
		title="Pending Tasks"
		description="Tasks requiring attention"
		metric={metrics.pendingTasks}
		icon={CheckSquare}
		isLive={true}
		lastUpdated={new Date()}
	/>

	<LiveMetricCard
		title="Compliance Rate"
		description="Overall compliance percentage"
		metric={metrics.complianceRate}
		icon={AlertTriangle}
		isLive={true}
		lastUpdated={new Date()}
	/>

	<!-- Activity Feed -->
	<div class="md:col-span-2">
		<ActivityFeedCard
			title="Recent Activity"
			activities={recentActivity}
			isLive={true}
			maxItems={8}
			onItemClick={handleActivityClick}
			onViewAll={() => goto('/activity')}
		/>
	</div>

	<!-- System Status -->
	<StatusOverviewCard
		title="System Health"
		description="Real-time system monitoring"
		items={systemStatus}
		isLive={true}
		onRefresh={refreshSystemStatus}
	/>
</div>
```

## Advanced Patterns

### 1. Error Handling and Retry Logic

```svelte
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { LiveMetricCard } from '$lib/components/ui';

	const dispatch = createEventDispatcher();

	let retryCount = 0;
	let maxRetries = 3;

	async function fetchWithRetry(url: string) {
		try {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			retryCount = 0; // Reset on success
			return await response.json();
		} catch (error) {
			if (retryCount < maxRetries) {
				retryCount++;
				await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
				return fetchWithRetry(url);
			} else {
				dispatch('error', { error, retryCount });
				throw error;
			}
		}
	}
</script>
```

### 2. Offline Support

```svelte
<script lang="ts">
	import { browser } from '$app/environment';
	import { writable } from 'svelte/store';

	const isOnline = writable(browser ? navigator.onLine : true);

	if (browser) {
		window.addEventListener('online', () => isOnline.set(true));
		window.addEventListener('offline', () => isOnline.set(false));
	}

	$: if ($isOnline) {
		// Sync queued operations when coming back online
		syncQueuedOperations();
	}
</script>
```

### 3. Performance Optimization

```svelte
<script lang="ts">
	import { tick } from 'svelte';
	import { debounce } from 'lodash-es';

	// Debounce real-time updates to prevent excessive re-renders
	const debouncedUpdate = debounce((data) => {
		metrics = { ...metrics, ...data };
	}, 100);

	// Virtual scrolling for large lists
	let visibleItems = [];
	let scrollTop = 0;
	let itemHeight = 60;
	let containerHeight = 400;

	$: visibleStart = Math.floor(scrollTop / itemHeight);
	$: visibleEnd = Math.min(
		visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
		items.length
	);
	$: visibleItems = items.slice(visibleStart, visibleEnd);
</script>
```

## Testing Examples

### Component Testing

```typescript
// tests/components/WebSocketIndicator.test.ts
import { render, screen } from '@testing-library/svelte';
import { WebSocketIndicator } from '$lib/components/ui';

describe('WebSocketIndicator', () => {
	it('shows connected state correctly', () => {
		render(WebSocketIndicator, {
			status: 'connected',
			latency: 45,
			variant: 'detailed'
		});

		expect(screen.getByText('Connected')).toBeInTheDocument();
		expect(screen.getByText('45ms')).toBeInTheDocument();
	});

	it('handles disconnected state with retry', () => {
		render(WebSocketIndicator, {
			status: 'reconnecting',
			retryCount: 2,
			variant: 'detailed'
		});

		expect(screen.getByText('Reconnecting (2)')).toBeInTheDocument();
	});
});
```

### E2E Testing

```typescript
// tests/e2e/bulk-operations.test.ts
import { expect, test } from '@playwright/test';

test('bulk operations workflow', async ({ page }) => {
	await page.goto('/employees');

	// Select multiple items
	await page.getByRole('checkbox').first().check();
	await page.getByRole('checkbox').nth(1).check();

	// Bulk actions bar should appear
	await expect(page.getByText('2 selected')).toBeVisible();

	// Perform bulk action
	await page.getByRole('button', { name: 'Archive' }).click();

	// Confirm action
	await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();

	// Check job progress
	await expect(page.getByText('Archive Operation')).toBeVisible();
});
```

## Deployment Considerations

### WebSocket Configuration

```nginx
# nginx.conf - WebSocket proxy configuration
location /ws {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Environment Variables

```bash
# .env
VITE_WS_URL=ws://localhost:8080/ws
VITE_API_URL=http://localhost:8080/api/v1
VITE_ENABLE_REAL_TIME=true
```

This integration guide provides the foundation for implementing all v2 API components in your SvelteHR application. Adapt the examples to your specific use cases and API structure.
