<script lang="ts">
	/**
	 * Bulk Rollback Page - UI
	 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
	 * Task: T046
	 * Created: 2025-10-02
	 *
	 * Bulk rollback operation management (super_admin only).
	 */

	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import BulkRollbackDialog from '$lib/components/activities/BulkRollbackDialog.svelte';
	import { AlertCircle, Calendar, FileText, Filter, RefreshCw } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { formatActivityMessage } from '$lib/utils/activities';

	interface Props {
		data: {
			availableLogs: any[];
			recentBatches: any[];
			resourceTypes: string[];
			filters: any;
			userId: string;
		};
		form: any;
	}

	const { data, form }: Props = $props();

	let showDialog = $state(false);
	let selectedLogs = $state<Set<string>>(new Set());
	let isRefreshing = $state(false);
	let showFilters = $state(true);

	// Filter state
	let dateFrom = $state(data.filters.dateFrom || '');
	let dateTo = $state(data.filters.dateTo || '');
	let resourceTypeFilter = $state(data.filters.resourceType || '');
	let actionFilter = $state(data.filters.action || '');

	const canStartBatch = $derived(selectedLogs.size > 0 && selectedLogs.size <= 100);

	function toggleLogSelection(logId: string) {
		if (selectedLogs.has(logId)) {
			selectedLogs.delete(logId);
		} else {
			if (selectedLogs.size >= 100) {
				toast.error('Maximum 100 logs per batch');
				return;
			}
			selectedLogs.add(logId);
		}
		selectedLogs = selectedLogs; // Trigger reactivity
	}

	function toggleSelectAll() {
		if (selectedLogs.size === data.availableLogs.length) {
			selectedLogs.clear();
		} else {
			// Select up to 100 logs
			const logsToSelect = data.availableLogs.slice(0, 100).map((log) => log.id);
			selectedLogs = new Set(logsToSelect);
		}
	}

	function handleOpenDialog() {
		if (!canStartBatch) {
			toast.error('Please select at least 1 log (max 100)');
			return;
		}
		showDialog = true;
	}

	function handleBatchComplete(batchId: string) {
		showDialog = false;
		selectedLogs.clear();
		toast.success('Batch completed successfully');
		handleRefresh();
	}

	async function handleRefresh() {
		isRefreshing = true;
		try {
			await goto($page.url.pathname + $page.url.search, {
				invalidateAll: true
			});
			toast.success('Page refreshed');
		} catch (error) {
			toast.error('Failed to refresh');
		} finally {
			isRefreshing = false;
		}
	}

	async function handleApplyFilters() {
		const searchParams = new URLSearchParams();

		if (dateFrom) searchParams.set('dateFrom', dateFrom);
		if (dateTo) searchParams.set('dateTo', dateTo);
		if (resourceTypeFilter) searchParams.set('resourceType', resourceTypeFilter);
		if (actionFilter) searchParams.set('action', actionFilter);

		await goto(`/dashboard/activities/bulk-rollback?${searchParams.toString()}`);
	}

	async function handleClearFilters() {
		dateFrom = '';
		dateTo = '';
		resourceTypeFilter = '';
		actionFilter = '';
		await goto('/dashboard/activities/bulk-rollback');
	}

	function formatBatchStatus(batch: any): string {
		const status = batch.status.toLowerCase();
		switch (status) {
			case 'queued':
				return 'Queued';
			case 'in_progress':
				return 'In Progress';
			case 'completed':
				return 'Completed';
			case 'failed':
				return 'Failed';
			default:
				return status;
		}
	}

	function getBatchStatusVariant(batch: any): 'default' | 'secondary' | 'destructive' {
		const status = batch.status.toLowerCase();
		switch (status) {
			case 'completed':
				return 'default';
			case 'failed':
				return 'destructive';
			default:
				return 'secondary';
		}
	}
</script>

<svelte:head>
	<title>Bulk Rollback - MountainHR</title>
	<meta name="description" content="Perform bulk rollback operations (super_admin only)" />
</svelte:head>

<!-- Page Header -->
<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Bulk Rollback</h1>
			<p class="text-muted-foreground">
				Execute multiple rollbacks in a single batch (max 100 logs)
			</p>
		</div>

		<div class="flex gap-2">
			<Button variant="outline" size="icon" onclick={() => (showFilters = !showFilters)}>
				<Filter class="h-4 w-4" />
			</Button>

			<Button variant="outline" size="sm" onclick={handleRefresh} disabled={isRefreshing}>
				<RefreshCw class={isRefreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
				Refresh
			</Button>

			<Button size="sm" onclick={handleOpenDialog} disabled={!canStartBatch}>
				Start Batch Rollback ({selectedLogs.size})
			</Button>
		</div>
	</div>

	<!-- Warning Banner -->
	<Card.Root class="border-yellow-600">
		<Card.Content class="py-4">
			<div class="flex items-start gap-3">
				<AlertCircle class="mt-0.5 h-5 w-5 text-yellow-600" />
				<div class="flex-1">
					<h3 class="font-semibold text-yellow-900">Super Admin Only</h3>
					<p class="text-sm text-yellow-800">
						Bulk rollback operations are powerful and irreversible. Ensure you have selected the
						correct logs and understand the impact before proceeding.
					</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Statistics -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Available Logs</Card.Title>
				<FileText class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.availableLogs.length}</div>
				<p class="text-xs text-muted-foreground">rollbackable logs</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Selected</Card.Title>
				<FileText class="h-4 w-4 text-blue-600" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-blue-600">{selectedLogs.size}</div>
				<p class="text-xs text-muted-foreground">logs selected</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Recent Batches</Card.Title>
				<FileText class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.recentBatches.length}</div>
				<p class="text-xs text-muted-foreground">your batches</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Filters -->
	{#if showFilters}
		<Card.Root>
			<Card.Header>
				<Card.Title>Filter Available Logs</Card.Title>
				<Card.Description>Find rollbackable logs by date, resource type, or action</Card.Description
				>
			</Card.Header>
			<Card.Content>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
					<div class="space-y-2">
						<label for="date-from" class="text-sm font-medium">From Date</label>
						<Input type="date" id="date-from" bind:value={dateFrom} />
					</div>

					<div class="space-y-2">
						<label for="date-to" class="text-sm font-medium">To Date</label>
						<Input type="date" id="date-to" bind:value={dateTo} />
					</div>

					<div class="space-y-2">
						<label for="resource-type" class="text-sm font-medium">Resource Type</label>
						<select
							id="resource-type"
							bind:value={resourceTypeFilter}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="">All Types</option>
							{#each data.resourceTypes as type}
								<option value={type}>{type}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-2">
						<label for="action" class="text-sm font-medium">Action</label>
						<select
							id="action"
							bind:value={actionFilter}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="">All Actions</option>
							<option value="CREATE">Create</option>
							<option value="UPDATE">Update</option>
							<option value="DELETE">Delete</option>
						</select>
					</div>
				</div>

				<div class="mt-4 flex gap-2">
					<Button size="sm" onclick={handleApplyFilters}>Apply Filters</Button>
					<Button size="sm" variant="outline" onclick={handleClearFilters}>Clear Filters</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Available Logs -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Select Logs for Batch Rollback</Card.Title>
					<Card.Description
						>Choose up to 100 logs to rollback in a single operation</Card.Description
					>
				</div>
				{#if data.availableLogs.length > 0}
					<Button size="sm" variant="outline" onclick={toggleSelectAll}>
						{selectedLogs.size === data.availableLogs.length ? 'Deselect All' : 'Select All'}
					</Button>
				{/if}
			</div>
		</Card.Header>
		<Card.Content>
			{#if data.availableLogs.length === 0}
				<div class="py-8 text-center">
					<FileText class="mx-auto h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No logs available</h3>
					<p class="text-muted-foreground">
						{#if dateFrom || dateTo || resourceTypeFilter || actionFilter}
							Try adjusting your filters to see more logs.
						{:else}
							No rollbackable logs found for the current filters.
						{/if}
					</p>
				</div>
			{:else}
				<div class="max-h-96 space-y-2 overflow-y-auto">
					{#each data.availableLogs as log}
						<label
							class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-accent"
						>
							<input
								type="checkbox"
								checked={selectedLogs.has(log.id)}
								onchange={() => toggleLogSelection(log.id)}
								class="h-4 w-4 rounded"
							/>
							<div class="flex-1">
								<div class="flex items-center justify-between">
									<span class="font-medium">{formatActivityMessage(log)}</span>
									<Badge variant="outline">{log.action}</Badge>
								</div>
								<p class="text-sm text-muted-foreground">
									{log.employee?.name || 'Unknown'} • {new Date(log.createdAt).toLocaleString()}
								</p>
							</div>
						</label>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Recent Batches -->
	{#if data.recentBatches.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Recent Batch Operations</Card.Title>
				<Card.Description>Your last 10 bulk rollback batches</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-3">
					{#each data.recentBatches as batch}
						<div class="flex items-center justify-between rounded-lg border p-3">
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<Badge variant={getBatchStatusVariant(batch)}>
										{formatBatchStatus(batch)}
									</Badge>
									<span class="text-sm font-medium">
										{batch.total_count} logs
									</span>
								</div>
								<p class="mt-1 text-sm text-muted-foreground">
									{batch.successful_count || 0} succeeded, {batch.failed_count || 0} failed
								</p>
								<p class="mt-1 text-xs text-muted-foreground">
									Created: {new Date(batch.created_at).toLocaleString()}
								</p>
							</div>
							{#if batch.status === 'in_progress'}
								<Button
									size="sm"
									variant="outline"
									href="/dashboard/activities/bulk-rollback/{batch.id}"
								>
									View Progress
								</Button>
							{/if}
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<!-- Bulk Rollback Dialog -->
{#if showDialog}
	<BulkRollbackDialog
		selectedLogs={Array.from(selectedLogs)}
		onComplete={handleBatchComplete}
		onCancel={() => (showDialog = false)}
	/>
{/if}
