<!-- Leave Approvals Management Page -->
<!-- T038: Fix leave management pages with standardized error handling -->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { logger } from '$lib/utils/logger';
	import { page } from '$app/stores';
	import { AlertCircle, FileText } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import RetryButton from '$lib/components/ui/RetryButton.svelte';

	// Import decomposed components
	import LeaveStats from './components/LeaveStats.svelte';
	import LeaveFilters from './components/LeaveFilters.svelte';
	import LeaveList from './components/LeaveList.svelte';
	import LeaveApprovalModal from './components/LeaveApprovalModal.svelte';
	import LeaveDenialModal from './components/LeaveDenialModal.svelte';
	import LeaveRevertModal from './components/LeaveRevertModal.svelte';

	// Page data from server
	interface Props {
		data: {
			user: any;
			userSession: any;
			leaveRequests: any[];
			totalRequests: number;
			leaveStats: any;
			filters: any;
			permissions: string[];
			canApproveLeave: boolean;
			canViewAllLeave: boolean;
			loadedAt: string;
			error?: {
				message: string;
				details: string;
				retryable: boolean;
			};
		};
	}

	const { data }: Props = $props();

	// Derived state using Svelte 5 runes
	const leaveRequests = $derived(data.leaveRequests);
	const canApproveLeave = $derived(data.canApproveLeave);
	const canViewAllLeave = $derived(data.canViewAllLeave);

	// Local state for UI
	let selectedView = $state(data.filters.statusFilter || 'pending');
	let showApprovalModal = $state(false);
	let showDenialModal = $state(false);
	let showRevertModal = $state(false);
	let currentRequest = $state<any>(null);
	let managerComments = $state('');
	let isSubmitting = $state(false);
	let searchQuery = $state(data.filters.searchTerm || '');
	let statusFilter = $state(data.filters.statusFilter || 'pending');
	let leaveTypeFilter = $state(data.filters.leaveTypeFilter || '');

	// Filter and display logic (server already filters by status)
	const filteredRequests = $derived.by(() => {
		let filtered = leaveRequests;

		// Note: Status filtering is done server-side, no need to filter by selectedView here if strictly following server data,
		// BUT selectedView tabs switch views client-side usually if data is loaded?
		// In the original code: "server already filters by status".
		// But tabs change `selectedView`.
		// If data.leaveRequests contains ALL requests, then we filter client side.
		// If data.leaveRequests only contains filtered requests, then tabs might be broken if they expect client filtering.
		// However, `data.leaveRequests` comes from server `leaveRequests` query which usually filters.
		// But let's look at `applyFilters` logic (original code).
		// `handleStatusFilterChange` calls `goto`. So it's server-side filtering.
		// So `selectedView` changes should trigger navigation?
		// In original code:
		/*
		<Tabs value={selectedView} onValueChange={(value) => {
			selectedView = value;
			handleStatusFilterChange(value);
		}}>
		*/
		// Yes, changing tab calls `handleStatusFilterChange` which calls `goto`.
		// So `filteredRequests` derived is only for Search and LeaveType client-side filtering on top of server data?
		// Or maybe `searchQuery` also triggers server reload?
		// `handleSearch` calls `goto`.
		// `handleLeaveTypeFilterChange` calls `goto`.
		// So ALL filtering is server-side triggered.
		// The `filteredRequests` derived block in original code:
		/*
		const filteredRequests = $derived.by(() => {
			let filtered = leaveRequests;
			// ...
			if (searchQuery) ... client side filtering
			if (leaveTypeFilter) ... client side filtering
			return filtered;
		});
		*/
		// It seems it does BOTH? It applies client-side filtering on the returned dataset.
		// This is useful for "optimistic" filtering or refining the current page's results.
		// I will keep the logic as is.

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(request: any) =>
					request.employee?.displayName.toLowerCase().includes(query) ||
					request.leaveType.toLowerCase().includes(query) ||
					request.reason?.toLowerCase().includes(query)
			);
		}

		if (leaveTypeFilter) {
			filtered = filtered.filter((request: any) => request.leaveType === leaveTypeFilter);
		}

		return filtered;
	});

	// Handlers for approve/deny/revert actions
	function handleApprove(request: any) {
		currentRequest = request;
		showApprovalModal = true;
	}

	function handleDeny(request: any) {
		currentRequest = request;
		showDenialModal = true;
	}

	function handleRevert(request: any) {
		currentRequest = request;
		showRevertModal = true;
	}

	async function confirmApproval() {
		if (!currentRequest || !canApproveLeave) return;

		isSubmitting = true;

		try {
			const formData = new FormData();
			formData.append('id', currentRequest.id);
			formData.append('comments', managerComments || 'Approved');

			const response = await fetch('?/approve', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'success') {
				toast.success('Leave request approved successfully');

				// Close modal first
				showApprovalModal = false;
				const tempRequest = currentRequest;
				currentRequest = null;
				managerComments = '';

				// Optimistically remove from UI (if we want, or rely on reload)
				// The original code did manual updates to data.leaveRequests and stats.
				// Since `data` is a prop, modifying it directly is... allowed in Svelte 5 if it's not $state?
				// But `data` is from props. `leaveRequests` is derived.
				// We can't easily mutate `data` prop to affect `leaveRequests` derived unless we copy it to a state.
				// However, `goto` with `invalidateAll` will reload the page data.
				// The original code: `data.leaveRequests = ...` works in Svelte 4/legacy if data is mutable.
				// In Svelte 5, props are readonly.
				// So the optimistic update might fail if I don't handle it.
				// But `goto` will refresh it.
				// I'll rely on `goto`.

				goto($page.url.pathname + $page.url.search, {
					invalidateAll: true,
					noScroll: true,
					replaceState: true
				});
			} else {
				toast.error(result.data?.message || 'Failed to approve leave request');
			}
		} catch (error) {
			logger.error('Failed to approve leave request:', error as Error);
			toast.error('Failed to approve leave request');
		} finally {
			isSubmitting = false;
		}
	}

	async function confirmDenial() {
		if (!currentRequest || !canApproveLeave || !managerComments.trim()) return;

		isSubmitting = true;

		try {
			const formData = new FormData();
			formData.append('id', currentRequest.id);
			formData.append('comments', managerComments);

			const response = await fetch('?/deny', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'success') {
				toast.success('Leave request denied');

				showDenialModal = false;
				currentRequest = null;
				managerComments = '';

				goto($page.url.pathname + $page.url.search, {
					invalidateAll: true,
					noScroll: true,
					replaceState: true
				});
			} else {
				toast.error(result.data?.message || 'Failed to deny leave request');
			}
		} catch (error) {
			logger.error('Failed to deny leave request:', error as Error);
			toast.error('Failed to deny leave request');
		} finally {
			isSubmitting = false;
		}
	}

	async function confirmRevert() {
		if (!currentRequest || !canApproveLeave) return;

		isSubmitting = true;

		try {
			const formData = new FormData();
			formData.append('id', currentRequest.id);
			formData.append('comments', managerComments || 'Reverted to pending for reconsideration');

			const response = await fetch('?/revertToPending', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'success') {
				toast.success('Leave request reverted to pending');

				showRevertModal = false;
				currentRequest = null;
				managerComments = '';

				goto($page.url.pathname + $page.url.search, {
					invalidateAll: true,
					noScroll: true,
					replaceState: true
				});
			} else {
				toast.error(result.data?.message || 'Failed to revert leave request');
			}
		} catch (error) {
			logger.error('Failed to revert leave request:', error as Error);
			toast.error('Failed to revert leave request');
		} finally {
			isSubmitting = false;
		}
	}

	// Navigation handlers for filtering
	function handleSearch() {
		const url = new URL($page.url);
		if (searchQuery) {
			url.searchParams.set('search', searchQuery);
		} else {
			url.searchParams.delete('search');
		}
		url.searchParams.set('page', '1');
		goto(url.toString());
	}

	function handleStatusFilterChange(status: string | string[]) {
		const statusValue = Array.isArray(status) ? status[0] : status;
		statusFilter = statusValue; // Update local state
		const url = new URL($page.url);
		if (statusValue && statusValue !== 'all') {
			url.searchParams.set('status', statusValue);
		} else {
			url.searchParams.delete('status');
		}
		url.searchParams.set('page', '1');
		goto(url.toString());
	}

	function handleLeaveTypeFilterChange(type: string | string[]) {
		const typeValue = Array.isArray(type) ? type[0] : type;
		leaveTypeFilter = typeValue; // Update local state
		const url = new URL($page.url);
		if (typeValue) {
			url.searchParams.set('leaveType', typeValue);
		} else {
			url.searchParams.delete('leaveType');
		}
		url.searchParams.set('page', '1');
		goto(url.toString());
	}
</script>

<svelte:head>
	<title>Leave Approvals - MountainHR</title>
	<meta
		name="description"
		content="Review and manage pending leave requests from your team members"
	/>
</svelte:head>

<div class="min-h-screen bg-background">
	<div class="container mx-auto space-y-6 p-4">
		<!-- Header -->
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-foreground">Leave Approvals</h1>
				<p class="text-muted-foreground">
					Review and manage pending leave requests from your team members
				</p>
			</div>

			{#if canViewAllLeave}
				<Button variant="outline" href="/dashboard/management/leave/all">
					<FileText class="mr-2 h-4 w-4" />
					View All Leave
				</Button>
			{/if}
		</div>

		<!-- Statistics Section -->
		<LeaveStats
			totalRequests={data.totalRequests}
			leaveStats={data.leaveStats}
		/>

		<!-- Error Display -->
		{#if data.error}
			<Card class="border-destructive bg-destructive/5">
				<CardContent class="p-6">
					<div class="flex items-center justify-between" data-testid="error-container">
						<div class="flex items-center gap-3">
							<AlertCircle class="h-5 w-5 text-destructive" />
							<div>
								<h3 class="font-semibold text-destructive" data-testid="error-message">
									{data.error.message}
								</h3>
								{#if data.error.details}
									<p class="mt-1 text-sm text-muted-foreground">
										{data.error.details}
									</p>
								{/if}
							</div>
						</div>
						{#if data.error.retryable}
							<RetryButton on:retry={() => window.location.reload()} class="ml-4" />
						{/if}
					</div>
				</CardContent>
			</Card>
		{/if}

		<!-- Filters -->
		<LeaveFilters
			bind:searchQuery
			bind:statusFilter
			bind:leaveTypeFilter
			onSearch={handleSearch}
			onStatusChange={handleStatusFilterChange}
			onLeaveTypeChange={handleLeaveTypeFilterChange}
		/>

		<!-- Leave Requests List with Tabs -->
		<LeaveList
			{filteredRequests}
			leaveStats={data.leaveStats}
			totalRequests={data.totalRequests}
			bind:selectedView
			{canApproveLeave}
			onViewChange={handleStatusFilterChange}
			onApprove={handleApprove}
			onDeny={handleDeny}
			onRevert={handleRevert}
		/>
	</div>
</div>

<!-- Modals -->
<LeaveApprovalModal
	bind:open={showApprovalModal}
	{currentRequest}
	bind:managerComments
	{isSubmitting}
	onClose={() => (showApprovalModal = false)}
	onConfirm={confirmApproval}
/>

<LeaveDenialModal
	bind:open={showDenialModal}
	{currentRequest}
	bind:managerComments
	{isSubmitting}
	onClose={() => (showDenialModal = false)}
	onConfirm={confirmDenial}
/>

<LeaveRevertModal
	bind:open={showRevertModal}
	{currentRequest}
	bind:managerComments
	{isSubmitting}
	onClose={() => (showRevertModal = false)}
	onConfirm={confirmRevert}
/>