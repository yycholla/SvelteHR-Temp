<script lang="ts">
	/**
	 * Audit Logs Page - UI
	 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
	 * Task: T044
	 * Created: 2025-10-02
	 *
	 * Comprehensive audit log viewer with filtering, pagination, and rollback capabilities.
	 */

	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import AuditLogFilters from '$lib/components/activities/AuditLogFilters.svelte';
	import ActivityFeed from '$lib/components/activities/ActivityFeed.svelte';
	import Pagination from '$lib/components/activities/Pagination.svelte';
	import { Download, RefreshCw, FileText } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	interface Props {
		data: {
			logs: any[];
			totalCount: number;
			page: number;
			pageSize: number;
			filters: any;
			employees: Array<{ id: string; full_name: string }>;
			resourceTypes: string[];
			userRole: string;
			userContext: any;
		};
	}

	let { data }: Props = $props();

	let isRefreshing = $state(false);
	let isExporting = $state(false);

	// Server already returns data in the correct ActivityLog format
	const activities = $derived(data.logs);

	async function handleFilterChange(filters: any) {
		// Build query string from filters
		const searchParams = new URLSearchParams();

		if (filters.dateFrom) searchParams.set('dateFrom', filters.dateFrom);
		if (filters.dateTo) searchParams.set('dateTo', filters.dateTo);
		if (filters.resourceType) searchParams.set('resourceType', filters.resourceType);
		if (filters.employeeId) searchParams.set('employeeId', filters.employeeId);
		if (filters.action) searchParams.set('action', filters.action);
		if (filters.isRollback) searchParams.set('isRollback', 'true');
		if (filters.searchTerm) searchParams.set('searchTerm', filters.searchTerm);

		// Reset to page 1 when filters change
		searchParams.set('page', '1');
		searchParams.set('pageSize', String(data.pageSize));

		// Navigate with new query parameters
		await goto(`/dashboard/activities/logs?${searchParams.toString()}`);
	}

	async function handlePageChange(newPage: number) {
		const searchParams = new URLSearchParams($page.url.searchParams);
		searchParams.set('page', String(newPage));
		await goto(`/dashboard/activities/logs?${searchParams.toString()}`);
	}

	async function handlePageSizeChange(newPageSize: number) {
		const searchParams = new URLSearchParams($page.url.searchParams);
		searchParams.set('pageSize', String(newPageSize));
		searchParams.set('page', '1'); // Reset to first page
		await goto(`/dashboard/activities/logs?${searchParams.toString()}`);
	}

	async function handleRefresh() {
		isRefreshing = true;
		try {
			// Force reload by navigating to current URL
			await goto($page.url.pathname + $page.url.search, {
				invalidateAll: true
			});
			toast.success('Audit logs refreshed');
		} catch (error) {
			toast.error('Failed to refresh');
		} finally {
			isRefreshing = false;
		}
	}

	async function handleExport() {
		isExporting = true;
		try {
			// Call export API
			const response = await fetch('/api/activities/export', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					filters: data.filters,
					format: 'csv'
				})
			});

			if (!response.ok) {
				throw new Error('Export failed');
			}

			const result = await response.json();

			if (result.downloadUrl) {
				// Trigger download
				window.open(result.downloadUrl, '_blank');
				toast.success('Export started. Download will begin shortly.');
			} else {
				throw new Error('No download URL received');
			}
		} catch (error) {
			console.error('[AuditLogsPage] Export error:', error);
			toast.error('Failed to export audit logs');
		} finally {
			isExporting = false;
		}
	}

	function handleActivityClick(activity: any) {
		// Navigate to activity detail page
		goto(`/dashboard/activities/logs/${activity.id}`);
	}
</script>

<svelte:head>
	<title>Audit Logs - SvelteHR</title>
	<meta name="description" content="View and manage audit logs with comprehensive filtering and rollback capabilities" />
</svelte:head>

<!-- Page Header -->
<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Audit Logs</h1>
			<p class="text-muted-foreground">Comprehensive activity tracking with rollback capabilities</p>
		</div>

		<div class="flex gap-2">
			<Button variant="outline" size="sm" onclick={handleRefresh} disabled={isRefreshing}>
				<RefreshCw class={isRefreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
				Refresh
			</Button>

			{#if data.userRole === 'super_admin'}
				<Button size="sm" onclick={handleExport} disabled={isExporting}>
					<Download class="mr-2 h-4 w-4" />
					{isExporting ? 'Exporting...' : 'Export'}
				</Button>
			{/if}
		</div>
	</div>

	<!-- Statistics Cards -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Logs</Card.Title>
				<FileText class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.totalCount}</div>
				<p class="text-xs text-muted-foreground">
					showing page {data.page} of {Math.ceil(data.totalCount / data.pageSize)}
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Page Results</Card.Title>
				<FileText class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{activities.length}</div>
				<p class="text-xs text-muted-foreground">logs on this page</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Resource Types</Card.Title>
				<FileText class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.resourceTypes.length}</div>
				<p class="text-xs text-muted-foreground">distinct types tracked</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Filters -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Filter Audit Logs</Card.Title>
			<Card.Description>Search and filter activity logs by date, resource, user, and action</Card.Description>
		</Card.Header>
		<Card.Content>
			<AuditLogFilters
				initialFilters={data.filters}
				resourceTypes={data.resourceTypes}
				employees={data.employees}
				onFilterChange={handleFilterChange}
			/>
		</Card.Content>
	</Card.Root>

	<!-- Activity Feed -->
	{#if activities.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Activity Logs</Card.Title>
				<Card.Description>Detailed activity history with snapshot tracking</Card.Description>
			</Card.Header>
			<Card.Content>
				<ActivityFeed
					activities={activities}
					onActivityClick={handleActivityClick}
					groupByDate={false}
					showSnapshotPreview={true}
					showRollbackIndicators={true}
					showUserInfo={true}
					showTimestamps={true}
				/>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content class="py-8">
				<div class="text-center">
					<FileText class="mx-auto h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No audit logs found</h3>
					<p class="text-muted-foreground">
						{#if data.filters.dateFrom || data.filters.resourceType || data.filters.searchTerm}
							Try adjusting your search criteria or clearing filters.
						{:else}
							No audit logs have been recorded yet.
						{/if}
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Pagination -->
	{#if data.totalCount > data.pageSize}
		<Card.Root>
			<Card.Content class="py-4">
				<Pagination
					currentPage={data.page}
					pageSize={data.pageSize}
					totalCount={data.totalCount}
					onPageChange={handlePageChange}
					onPageSizeChange={handlePageSizeChange}
				/>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
