<!-- src/routes/dashboard/audit-log/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
	import { GET_AUDIT_LOGS } from './_components/ActivityFeed/activityFeed.graphql';
	import AuditLogFilters from './_components/AuditLogFilters/AuditLogFilters.svelte';
	import ActivityFeed from './_components/ActivityFeed/ActivityFeed.svelte';
	import BulkRollbackDialog from './_components/BulkRollbackDialog/BulkRollbackDialog.svelte';
	import ConflictResolutionModal from './_components/ConflictResolutionModal/ConflictResolutionModal.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { FilterValues } from './_components/AuditLogFilters/filters.types';
	import type { ActivityLogEntry } from './_components/ActivityFeed/activityFeed.types';

	let { data } = $props();

	// State
	let logs = $state<ActivityLogEntry[]>(data.initialLogs);
	let filters = $state<FilterValues>({});
	let selectedLogIds = $state<Set<string>>(new Set());
	let hasMore = $state(true);
	let loading = $state(false);
	let showBulkRollbackDialog = $state(false);
	let showConflictModal = $state(false);
	interface ConflictField {
		field: string;
		currentValue: unknown;
		targetValue: unknown;
		snapshotValue: unknown;
	}

	interface ConflictDetails {
		hasConflicts: boolean;
		conflictFields: string[];
		conflicts: ConflictField[];
		currentState: Record<string, unknown>;
		targetState: Record<string, unknown>;
	}

	let conflictData = $state<{
		logId: string;
		conflicts: ConflictDetails;
	} | null>(null);

	type RollbackAction = 'CREATE' | 'UPDATE' | 'DELETE';

	function isRollbackableLog(
		log: ActivityLogEntry
	): log is ActivityLogEntry & { action: RollbackAction } {
		return log.action === 'CREATE' || log.action === 'UPDATE' || log.action === 'DELETE';
	}

	// Selected logs for bulk rollback
	let selectedLogsForRollback = $derived.by(() => {
		return logs
			.filter((log) => selectedLogIds.has(log.id))
			.filter(isRollbackableLog)
			.map((log) => ({
				id: log.id,
				action: log.action,
				resourceType: log.resourceType,
				resourceId: log.resourceId,
				employeeName: log.employeeName ?? log.performedBy ?? 'Unknown',
				createdAt: log.createdAt ?? log.timestamp
			}));
	});

	// Derived resource types from logs
	let resourceTypes = $derived.by(() => {
		const types = new Set(logs.map((log) => log.resourceType));
		return Array.from(types).sort();
	});

	// User role from data
	let userRole = $derived(data.user?.role ?? 'employee');

	// Load logs with filters
	async function loadLogs(offset = 0, resetLogs = false) {
		loading = true;
		try {
			// Note: In production, you would use authenticated client with cookies
			// For now using default client
			const client = createUrqlClient(fetch);

			const result = await client
				.query(GET_AUDIT_LOGS, {
					limit: 50,
					offset,
					filters
				})
				.toPromise();

			if (result.data?.auditLogs) {
				if (resetLogs) {
					logs = result.data.auditLogs;
				} else {
					logs = [...logs, ...result.data.auditLogs];
				}
				hasMore = result.data.auditLogs.length === 50;
			}
		} catch (error) {
			console.error('Failed to load audit logs:', error);
		} finally {
			loading = false;
		}
	}

	// Filter change handler
	function handleFilterChange(newFilters: FilterValues) {
		filters = newFilters;
		selectedLogIds = new Set();
		loadLogs(0, true);
	}

	// Clear filters
	function handleClearFilters() {
		filters = {};
		selectedLogIds = new Set();
		loadLogs(0, true);
	}

	// Load more handler
	function handleLoadMore() {
		loadLogs(logs.length, false);
	}

	// Selection change handler
	function handleSelectionChange(ids: Set<string>) {
		selectedLogIds = ids;
	}

	// Bulk rollback handlers
	function handleOpenBulkRollback() {
		if (selectedLogIds.size > 0) {
			showBulkRollbackDialog = true;
		}
	}

	function handleCloseBulkRollback() {
		showBulkRollbackDialog = false;
	}

	function handleBulkRollbackComplete() {
		showBulkRollbackDialog = false;
		selectedLogIds = new Set();
		loadLogs(0, true);
	}

	// Conflict resolution handlers
	function handleConflictDetected(event: CustomEvent) {
		conflictData = event.detail;
		showConflictModal = true;
	}

	async function handleConflictResolved(strategy: string, mergeFields?: string[]) {
		console.log('Conflict resolved:', strategy, mergeFields);
		showConflictModal = false;
		conflictData = null;
		await loadLogs(0, true);
	}

	function handleConflictCancelled() {
		showConflictModal = false;
		conflictData = null;
	}

	// Single rollback handler
	function handleSingleRollback(logId: string) {
		// For single rollback, we can select it and open the dialog
		selectedLogIds = new Set([logId]);
		showBulkRollbackDialog = true;
	}

	// Initialize
	onMount(() => {
		// Initial load is already done via +page.server.ts
		// This is just for future client-side updates
	});
</script>

<div class="audit-log-page">
	<div class="audit-log-layout">
		<!-- Left sidebar: Filters -->
		<aside class="audit-log-sidebar">
			<AuditLogFilters
				initialFilters={filters}
				{resourceTypes}
				onFilterChange={handleFilterChange}
				onClear={handleClearFilters}
			/>
		</aside>

		<!-- Main content: Activity feed -->
		<main class="audit-log-main">
			<div class="audit-log-header">
				<h1>Audit Log</h1>
				{#if selectedLogIds.size > 0}
					<p class="selection-count">{selectedLogIds.size} log(s) selected</p>
				{/if}
			</div>

			<ActivityFeed
				{logs}
				onLoadMore={handleLoadMore}
				{hasMore}
				{loading}
				selectedIds={selectedLogIds}
				onSelectionChange={handleSelectionChange}
				{userRole}
				onRollback={handleSingleRollback}
			/>
		</main>
	</div>

	<!-- Floating Action Button for Bulk Rollback -->
	{#if selectedLogIds.size > 0}
		<div class="bulk-rollback-fab">
			<Button onclick={handleOpenBulkRollback} size="lg" class="shadow-lg">
				Rollback {selectedLogIds.size} log(s)
			</Button>
		</div>
	{/if}

	<!-- Bulk Rollback Dialog -->
	<BulkRollbackDialog
		logs={selectedLogsForRollback}
		isOpen={showBulkRollbackDialog}
		{userRole}
		onClose={handleCloseBulkRollback}
		onComplete={handleBulkRollbackComplete}
	/>

	<!-- Conflict Resolution Modal -->
	{#if conflictData}
		<ConflictResolutionModal
			isOpen={showConflictModal}
			logId={conflictData.logId}
			conflicts={conflictData.conflicts}
			onResolve={handleConflictResolved}
			onCancel={handleConflictCancelled}
		/>
	{/if}
</div>

<style>
	.audit-log-page {
		height: 100%;
		position: relative;
	}

	.audit-log-layout {
		display: grid;
		grid-template-columns: 280px 1fr;
		gap: 2rem;
		height: 100%;
		padding: 1.5rem;
	}

	.audit-log-sidebar {
		border-right: 1px solid var(--border);
		padding-right: 2rem;
	}

	.audit-log-main {
		overflow-y: auto;
	}

	.audit-log-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.audit-log-header h1 {
		font-size: 1.875rem;
		font-weight: 600;
		margin: 0;
	}

	.selection-count {
		color: var(--muted-foreground);
		font-size: 0.875rem;
		margin: 0;
	}

	.bulk-rollback-fab {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		z-index: 50;
	}

	@media (max-width: 768px) {
		.audit-log-layout {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.audit-log-sidebar {
			border-right: none;
			border-bottom: 1px solid var(--border);
			padding-right: 0;
			padding-bottom: 1rem;
		}
	}
</style>
