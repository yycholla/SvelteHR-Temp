<script lang="ts">
	import { logger } from '$lib/utils/logger';
	/**
	 * Rollback Requests Page - UI
	 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
	 * Task: T045
	 * Created: 2025-10-02
	 *
	 * Rollback request management with approval workflow for super_admin.
	 */

	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import RollbackRequestCard from '$lib/components/activities/RollbackRequestCard.svelte';
	import Pagination from '$lib/components/activities/Pagination.svelte';
	import { CheckSquare, Clock, Filter, RefreshCw, XSquare } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	interface Props {
		data: {
			requests: any[];
			totalCount: number;
			page: number;
			pageSize: number;
			filters: any;
			statistics: any;
			canReview: boolean;
			userRole: string;
			userId: string;
		};
	}

	const { data }: Props = $props();

	let isRefreshing = $state(false);
	let selectedRequests = $state<Set<string>>(new Set());
	let showFilters = $state(false);
	let statusFilter = $state(data.filters.status || '');

	const allRequestIds = $derived(data.requests.map((r) => r.id));

	const canBulkApprove = $derived(
		data.canReview && selectedRequests.size > 0 && selectedRequests.size <= 20
	);

	const canBulkReject = $derived(
		data.canReview && selectedRequests.size > 0 && selectedRequests.size <= 20
	);

	function toggleRequestSelection(requestId: string) {
		if (selectedRequests.has(requestId)) {
			selectedRequests.delete(requestId);
		} else {
			selectedRequests.add(requestId);
		}
		selectedRequests = selectedRequests; // Trigger reactivity
	}

	function toggleSelectAll() {
		if (selectedRequests.size === allRequestIds.length) {
			selectedRequests.clear();
		} else {
			selectedRequests = new Set(allRequestIds);
		}
	}

	async function handleRefresh() {
		isRefreshing = true;
		try {
			await goto($page.url.pathname + $page.url.search, {
				invalidateAll: true
			});
			toast.success('Rollback requests refreshed');
		} catch (error) {
			toast.error('Failed to refresh');
		} finally {
			isRefreshing = false;
		}
	}

	async function handleStatusFilterChange(newStatus: string) {
		statusFilter = newStatus;
		const searchParams = new URLSearchParams($page.url.searchParams);

		if (newStatus) {
			searchParams.set('status', newStatus);
		} else {
			searchParams.delete('status');
		}

		searchParams.set('page', '1'); // Reset to first page
		await goto(`/dashboard/activities/rollback-requests?${searchParams.toString()}`);
	}

	async function handlePageChange(newPage: number) {
		const searchParams = new URLSearchParams($page.url.searchParams);
		searchParams.set('page', String(newPage));
		await goto(`/dashboard/activities/rollback-requests?${searchParams.toString()}`);
	}

	async function handlePageSizeChange(newPageSize: number) {
		const searchParams = new URLSearchParams($page.url.searchParams);
		searchParams.set('pageSize', String(newPageSize));
		searchParams.set('page', '1');
		await goto(`/dashboard/activities/rollback-requests?${searchParams.toString()}`);
	}

	async function handleBulkApprove() {
		if (!canBulkApprove) return;

		try {
			const response = await fetch('/api/rollback-requests/bulk-approve', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					requestIds: Array.from(selectedRequests),
					reviewNotes: 'Bulk approved'
				})
			});

			const result = await response.json();

			if (result.success) {
				toast.success(`${result.approvedCount} requests approved`);
				selectedRequests.clear();
				await handleRefresh();
			} else {
				toast.error(result.error || 'Bulk approval failed');
			}
		} catch (error) {
			logger.error('[RollbackRequests] Bulk approve error:', error as Error);
			toast.error('Failed to approve requests');
		}
	}

	async function handleBulkReject() {
		if (!canBulkReject) return;

		try {
			const response = await fetch('/api/rollback-requests/bulk-reject', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					requestIds: Array.from(selectedRequests),
					reviewNotes: 'Bulk rejected'
				})
			});

			const result = await response.json();

			if (result.success) {
				toast.success(`${result.rejectedCount} requests rejected`);
				selectedRequests.clear();
				await handleRefresh();
			} else {
				toast.error(result.error || 'Bulk rejection failed');
			}
		} catch (error) {
			logger.error('[RollbackRequests] Bulk reject error:', error as Error);
			toast.error('Failed to reject requests');
		}
	}

	async function handleRequestAction() {
		// Refresh after individual request action
		await handleRefresh();
	}

	async function handleApprove(requestId: string, reason: string) {
		const response = await fetch('/api/rollback-requests/approve', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ requestId, reviewNotes: reason })
		});
		const result = await response.json();
		if (!result.success) {
			throw new Error(result.error || 'Approval failed');
		}
		await handleRequestAction();
	}

	async function handleReject(requestId: string, reason: string) {
		const response = await fetch('/api/rollback-requests/reject', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ requestId, reviewNotes: reason })
		});
		const result = await response.json();
		if (!result.success) {
			throw new Error(result.error || 'Rejection failed');
		}
		await handleRequestAction();
	}
</script>

<svelte:head>
	<title>Rollback Requests - MountainHR</title>
	<meta name="description" content="Manage rollback requests with approval workflow" />
</svelte:head>

<!-- Page Header -->
<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Rollback Requests</h1>
			<p class="text-muted-foreground">
				{#if data.canReview}
					Review and approve rollback requests
				{:else}
					View your rollback request history
				{/if}
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
		</div>
	</div>

	<!-- Statistics (for reviewers) -->
	{#if data.statistics}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Total Requests</Card.Title>
					<Clock class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{data.statistics.totalCount}</div>
					<p class="text-xs text-muted-foreground">all time</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Pending</Card.Title>
					<Clock class="h-4 w-4 text-yellow-600" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold text-yellow-600">{data.statistics.pendingCount}</div>
					<p class="text-xs text-muted-foreground">awaiting review</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Approved</Card.Title>
					<CheckSquare class="h-4 w-4 text-green-600" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold text-green-600">{data.statistics.approvedCount}</div>
					<p class="text-xs text-muted-foreground">accepted</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Rejected</Card.Title>
					<XSquare class="h-4 w-4 text-red-600" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold text-red-600">{data.statistics.rejectedCount}</div>
					<p class="text-xs text-muted-foreground">declined</p>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}

	<!-- Filters -->
	{#if showFilters}
		<Card.Root>
			<Card.Header>
				<Card.Title>Filter Requests</Card.Title>
				<Card.Description>Filter requests by status</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="flex items-center gap-2">
					<label for="status-filter" class="text-sm font-medium">Status:</label>
					<select
						id="status-filter"
						bind:value={statusFilter}
						onchange={() => handleStatusFilterChange(statusFilter)}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="">All Statuses</option>
						<option value="PENDING">Pending</option>
						<option value="APPROVED">Approved</option>
						<option value="REJECTED">Rejected</option>
						<option value="CANCELLED">Cancelled</option>
					</select>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Bulk Actions (for reviewers) -->
	{#if data.canReview && data.requests.length > 0}
		<Card.Root>
			<Card.Content class="py-4">
				<div class="flex items-center justify-between">
					<label class="flex items-center gap-2 text-sm font-medium">
						<input
							type="checkbox"
							checked={selectedRequests.size === allRequestIds.length}
							onchange={toggleSelectAll}
							class="h-4 w-4 rounded"
						/>
						<span>Select All ({selectedRequests.size} selected)</span>
					</label>

					{#if selectedRequests.size > 0}
						<div class="flex gap-2">
							<Button
								size="sm"
								variant="default"
								onclick={handleBulkApprove}
								disabled={!canBulkApprove}
							>
								<CheckSquare class="mr-2 h-4 w-4" />
								Approve Selected ({selectedRequests.size})
							</Button>

							<Button
								size="sm"
								variant="destructive"
								onclick={handleBulkReject}
								disabled={!canBulkReject}
							>
								<XSquare class="mr-2 h-4 w-4" />
								Reject Selected ({selectedRequests.size})
							</Button>
						</div>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Requests List -->
	{#if data.requests.length === 0}
		<Card.Root>
			<Card.Content class="py-8">
				<div class="text-center">
					<Clock class="mx-auto h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No rollback requests found</h3>
					<p class="text-muted-foreground">
						{#if data.filters.status}
							Try selecting a different status filter.
						{:else}
							No rollback requests have been submitted yet.
						{/if}
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-4">
			{#each data.requests as request (request.id)}
				<div class="flex items-start gap-4">
					{#if data.canReview}
						<input
							type="checkbox"
							class="mt-4 h-4 w-4 rounded"
							checked={selectedRequests.has(request.id)}
							onchange={() => toggleRequestSelection(request.id)}
						/>
					{/if}

					<div class="flex-1">
						<RollbackRequestCard
							request={{
								id: request.id,
								requestedAt: request.created_at || request.requested_at,
								reason: request.reason,
								status: request.status,
								reviewedBy: request.reviewer_id
									? {
											id: request.reviewer_id,
											fullName: request.reviewer_name || 'Unknown'
										}
									: undefined,
								reviewReason: request.review_notes,
								reviewedAt: request.reviewed_at,
								requestedBy: {
									fullName: request.requester_name,
									email: request.requester_email,
									department: request.requester_department || 'Unknown'
								},
								activityLog: {
									action: request.action,
									resourceType: request.resource_type,
									resourceId: request.resource_id,
									beforeSnapshot: request.before_snapshot,
									afterSnapshot: request.after_snapshot
								}
							}}
							userRole={data.userRole}
							onApprove={handleApprove}
							onReject={handleReject}
						/>
					</div>
				</div>
			{/each}
		</div>
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
