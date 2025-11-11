<!-- Leave Approvals Management Page -->
<!-- T038: Fix leave management pages with standardized error handling -->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		AlertCircle,
		Calendar,
		Check,
		Clock,
		FileText,
		Filter,
		Search,
		TrendingUp,
		Users,
		X
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import RetryButton from '$lib/components/ui/RetryButton.svelte';

	import {
		formatDateRange,
		getLeaveTypeColor,
		leaveStatusOptions,
		leaveTypeOptions
	} from '$lib/graphql/queries/leave-requests';

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
	const user = $derived(data.user);
	const userSession = $derived(data.userSession);
	const leaveRequests = $derived(data.leaveRequests);
	const canApproveLeave = $derived(data.canApproveLeave);
	const canViewAllLeave = $derived(data.canViewAllLeave);

	// Local state for UI
	let selectedView = $state(data.filters.statusFilter || 'pending');
	const selectedRequests = $state<string[]>([]);
	let showApprovalModal = $state(false);
	let showDenialModal = $state(false);
	let showRevertModal = $state(false);
	let currentRequest = $state<any>(null);
	let managerComments = $state('');
	let isSubmitting = $state(false);
	let searchQuery = $state(data.filters.searchTerm || '');
	const statusFilter = $state(data.filters.statusFilter || 'pending');
	const leaveTypeFilter = $state(data.filters.leaveTypeFilter || '');
	let timePeriod = $state<'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'all'>('all');

	// Get metrics for selected time period
	const currentMetrics = $derived.by(() => {
		if (timePeriod === 'all') {
			return {
				total: data.totalRequests,
				pending: data.leaveStats.pendingCount,
				approved: data.leaveStats.approvedCount,
				rejected: data.leaveStats.rejectedCount,
				approvalRate: data.leaveStats.approvalRate,
				totalDaysRequested: data.leaveStats.totalDaysRequested
			};
		}
		return (
			data.leaveStats[timePeriod] || {
				total: 0,
				pending: 0,
				approved: 0,
				rejected: 0,
				approvalRate: 0,
				totalDaysRequested: 0
			}
		);
	});

	// Get period label for descriptions
	const periodLabel = $derived.by(() => {
		switch (timePeriod) {
			case 'weekly':
				return 'this week';
			case 'monthly':
				return 'this month';
			case 'quarterly':
				return 'this quarter';
			case 'yearly':
				return 'this year';
			default:
				return 'all time';
		}
	});

	// Statistics cards data
	const statsCards = $derived([
		{
			title: 'Pending Requests',
			value: timePeriod === 'all' ? data.leaveStats.pendingCount : currentMetrics.pending,
			description: `Awaiting your approval`,
			icon: Clock,
			color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
			iconColor: 'text-yellow-600'
		},
		{
			title: `Approved ${periodLabel === 'all time' ? '(All Time)' : ''}`,
			value: currentMetrics.approved,
			description: `Approved ${periodLabel}`,
			icon: Check,
			color: 'bg-green-50 text-green-700 border-green-200',
			iconColor: 'text-green-600'
		},
		{
			title: 'Days Requested',
			value: currentMetrics.totalDaysRequested,
			description: `Days ${periodLabel}`,
			icon: Calendar,
			color: 'bg-blue-50 text-blue-700 border-blue-200',
			iconColor: 'text-blue-600'
		},
		{
			title: 'Approval Rate',
			value: `${currentMetrics.approvalRate}%`,
			description: `Approval rate ${periodLabel}`,
			icon: TrendingUp,
			color: 'bg-purple-50 text-purple-700 border-purple-200',
			iconColor: 'text-purple-600'
		}
	]);

	// Filter and display logic (server already filters by status)
	const filteredRequests = $derived.by(() => {
		let filtered = leaveRequests;

		// Note: Status filtering is done server-side, no need to filter by selectedView here

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(request) =>
					request.employee?.displayName.toLowerCase().includes(query) ||
					request.leaveType.toLowerCase().includes(query) ||
					request.reason?.toLowerCase().includes(query)
			);
		}

		if (leaveTypeFilter) {
			filtered = filtered.filter((request) => request.leaveType === leaveTypeFilter);
		}

		return filtered;
	});

	// Handlers for approve/deny/revert actions
	async function handleApprove(request: any) {
		currentRequest = request;
		showApprovalModal = true;
	}

	async function handleDeny(request: any) {
		currentRequest = request;
		showDenialModal = true;
	}

	async function handleRevert(request: any) {
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

				// Optimistically remove from UI
				data.leaveRequests = data.leaveRequests.filter((req) => req.id !== tempRequest.id);
				data.leaveStats.pendingCount--;
				data.leaveStats.approvedCount++;
				data.totalRequests = data.leaveRequests.length;

				// Then reload data in background to sync with server
				goto($page.url.pathname + $page.url.search, {
					invalidateAll: true,
					noScroll: true,
					replaceState: true
				});
			} else {
				toast.error(result.data?.message || 'Failed to approve leave request');
			}
		} catch (error) {
			console.error('Failed to approve leave request:', error);
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

				// Close modal first
				showDenialModal = false;
				const tempRequest = currentRequest;
				currentRequest = null;
				managerComments = '';

				// Optimistically remove from UI
				data.leaveRequests = data.leaveRequests.filter((req) => req.id !== tempRequest.id);
				data.leaveStats.pendingCount--;
				data.leaveStats.rejectedCount++;
				data.totalRequests = data.leaveRequests.length;

				// Then reload data in background to sync with server
				goto($page.url.pathname + $page.url.search, {
					invalidateAll: true,
					noScroll: true,
					replaceState: true
				});
			} else {
				toast.error(result.data?.message || 'Failed to deny leave request');
			}
		} catch (error) {
			console.error('Failed to deny leave request:', error);
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

				// Close modal first
				showRevertModal = false;
				const tempRequest = currentRequest;
				currentRequest = null;
				managerComments = '';

				// Optimistically remove from UI
				data.leaveRequests = data.leaveRequests.filter((req) => req.id !== tempRequest.id);

				// Update counts based on previous status
				if (tempRequest.status === 'approved') {
					data.leaveStats.approvedCount--;
				} else if (tempRequest.status === 'rejected') {
					data.leaveStats.rejectedCount--;
				}
				data.leaveStats.pendingCount++;
				data.totalRequests = data.leaveRequests.length;

				// Then reload data in background to sync with server
				goto($page.url.pathname + $page.url.search, {
					invalidateAll: true,
					noScroll: true,
					replaceState: true
				});
			} else {
				toast.error(result.data?.message || 'Failed to revert leave request');
			}
		} catch (error) {
			console.error('Failed to revert leave request:', error);
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
		url.searchParams.set('page', '1'); // Reset to first page
		goto(url.toString());
	}

	function handleStatusFilterChange(status: string) {
		const url = new URL($page.url);
		if (status && status !== 'all') {
			url.searchParams.set('status', status);
		} else {
			url.searchParams.delete('status');
		}
		url.searchParams.set('page', '1');
		goto(url.toString());
	}

	function handleLeaveTypeFilterChange(type: string) {
		const url = new URL($page.url);
		if (type) {
			url.searchParams.set('leaveType', type);
		} else {
			url.searchParams.delete('leaveType');
		}
		url.searchParams.set('page', '1');
		goto(url.toString());
	}

	// Get initials for avatar
	function getInitials(name: string): string {
		return (
			name
				?.split(' ')
				.map((n) => n[0])
				.join('')
				.toUpperCase() || 'U'
		);
	}

	// Get status badge variant
	function getStatusBadgeVariant(
		status: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'approved':
				return 'default';
			case 'pending':
				return 'secondary';
			case 'rejected':
				return 'destructive';
			default:
				return 'outline';
		}
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

		<!-- Time Period Selector -->
		<Card>
			<CardContent class="p-4">
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-medium text-muted-foreground">Statistics Period</h3>
					<Tabs
						value={timePeriod}
						onValueChange={(value) => {
							timePeriod = value as typeof timePeriod;
						}}
						class="w-auto"
					>
						<TabsList class="grid grid-cols-5">
							<TabsTrigger value="weekly" class="text-xs">Weekly</TabsTrigger>
							<TabsTrigger value="monthly" class="text-xs">Monthly</TabsTrigger>
							<TabsTrigger value="quarterly" class="text-xs">Quarterly</TabsTrigger>
							<TabsTrigger value="yearly" class="text-xs">Yearly</TabsTrigger>
							<TabsTrigger value="all" class="text-xs">All Time</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>
			</CardContent>
		</Card>

		<!-- Statistics Cards -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			{#each statsCards as stat}
				{@const StatIcon = stat.icon}
				<Card class={`${stat.color} border`}>
					<CardContent class="p-6">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium opacity-75">{stat.title}</p>
								<p class="mt-2 text-2xl font-bold">{stat.value}</p>
								<p class="mt-1 text-xs opacity-75">{stat.description}</p>
							</div>
							<div class={`${stat.iconColor} opacity-75`}>
								<StatIcon class="h-8 w-8" />
							</div>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>

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
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Filter class="h-5 w-5" />
					Filter Requests
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="flex flex-col gap-4 md:flex-row md:items-end">
					<!-- Search -->
					<div class="flex-1">
						<Label for="search">Search</Label>
						<div class="flex gap-2">
							<Input
								id="search"
								placeholder="Search by employee name, leave type, or reason..."
								bind:value={searchQuery}
								onkeydown={(e) => {
									if (e.key === 'Enter') handleSearch();
								}}
							/>
							<Button onclick={handleSearch} size="sm">
								<Search class="h-4 w-4" />
							</Button>
						</div>
					</div>

					<!-- Status Filter -->
					<div class="w-full md:w-48">
						<Label>Status</Label>
						<Select value={statusFilter} onValueChange={handleStatusFilterChange}>
							<SelectTrigger placeholder="All Statuses" />
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								{#each leaveStatusOptions as status}
									<SelectItem value={status.value}>{status.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>

					<!-- Leave Type Filter -->
					<div class="w-full md:w-48">
						<Label>Leave Type</Label>
						<Select value={leaveTypeFilter} onValueChange={handleLeaveTypeFilterChange}>
							<SelectTrigger placeholder="All Types" />
							<SelectContent>
								<SelectItem value="">All Types</SelectItem>
								{#each leaveTypeOptions as type}
									<SelectItem value={type.value}>{type.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Tabs for different views -->
		<Tabs
			value={selectedView}
			onValueChange={(value) => {
				selectedView = value;
				handleStatusFilterChange(value);
			}}
		>
			<TabsList class="grid w-full grid-cols-4">
				<TabsTrigger value="pending">
					Pending ({data.leaveStats.pendingCount})
				</TabsTrigger>
				<TabsTrigger value="approved">
					Approved ({data.leaveStats.approvedCount})
				</TabsTrigger>
				<TabsTrigger value="rejected">
					Rejected ({data.leaveStats.rejectedCount})
				</TabsTrigger>
				<TabsTrigger value="all">
					All Requests ({data.totalRequests})
				</TabsTrigger>
			</TabsList>

			<TabsContent value={selectedView} class="mt-4">
				<!-- Leave Requests List -->
				<div class="space-y-4" data-testid="hr-leave-requests-table">
					{#if filteredRequests.length === 0}
						<Card>
							<CardContent class="p-8 text-center">
								<AlertCircle class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
								<h3 class="mb-2 text-lg font-semibold text-foreground">No requests found</h3>
								<p class="text-muted-foreground">
									{#if selectedView === 'pending'}
										No pending leave requests at the moment.
									{:else if selectedView === 'approved'}
										No approved leave requests found.
									{:else if selectedView === 'rejected'}
										No rejected leave requests found.
									{:else}
										No leave requests match your current filters.
									{/if}
								</p>
							</CardContent>
						</Card>
					{:else}
						{#each filteredRequests as request}
							<Card class="transition-shadow hover:shadow-md">
								<CardContent class="p-6">
									<div class="flex items-start justify-between">
										<!-- Request Info -->
										<div class="flex flex-1 items-start space-x-4">
											<!-- Employee Avatar -->
											<Avatar class="h-12 w-12">
												<AvatarFallback class="bg-blue-100 text-blue-700">
													{getInitials(request.employee?.displayName || '')}
												</AvatarFallback>
											</Avatar>

											<!-- Request Details -->
											<div class="flex-1 space-y-2">
												<div class="flex items-center gap-3">
													<h3 class="text-lg font-semibold text-foreground">
														{request.employee?.displayName || 'Unknown Employee'}
													</h3>
													<Badge variant={getStatusBadgeVariant(request.status)} class="capitalize">
														{request.status}
													</Badge>
													<Badge
														variant="outline"
														class={`bg-${getLeaveTypeColor(request.leaveType)}-50 text-${getLeaveTypeColor(request.leaveType)}-700 border-${getLeaveTypeColor(request.leaveType)}-200`}
													>
														{leaveTypeOptions.find((t) => t.value === request.leaveType)?.label ||
															request.leaveType}
													</Badge>
												</div>

												<div class="space-y-1 text-sm text-muted-foreground">
													<p>
														<strong>Department:</strong>
														{request.employee?.department?.name || 'N/A'}
													</p>
													<p>
														<strong>Dates:</strong>
														{formatDateRange(request.startDate, request.endDate)}
													</p>
													<p><strong>Duration:</strong> {request.daysRequested} days</p>
													{#if request.reason}
														<p><strong>Reason:</strong> {request.reason}</p>
													{/if}
													{#if request.managerComments}
														<p><strong>Manager Comments:</strong> {request.managerComments}</p>
													{/if}
												</div>

												<div class="text-xs text-muted-foreground">
													Requested on {new Date(request.createdAt).toLocaleDateString()}
												</div>
											</div>
										</div>

										<!-- Actions -->
										{#if canApproveLeave}
											{#if request.status === 'pending'}
												<div class="ml-4 flex gap-2">
													<Button
														size="sm"
														variant="outline"
														onclick={() => handleApprove(request)}
														class="border-green-200 text-green-600 hover:border-green-300 hover:text-green-700"
														data-testid="hr-approve-button"
													>
														<Check class="mr-1 h-4 w-4" />
														Approve
													</Button>
													<Button
														size="sm"
														variant="outline"
														onclick={() => handleDeny(request)}
														class="border-red-200 text-red-600 hover:border-red-300 hover:text-red-700"
														data-testid="hr-reject-button"
													>
														<X class="mr-1 h-4 w-4" />
														Deny
													</Button>
												</div>
											{:else if request.status === 'approved' || request.status === 'rejected'}
												<div class="ml-4">
													<Button
														size="sm"
														variant="outline"
														onclick={() => handleRevert(request)}
														class="border-amber-200 text-amber-600 hover:border-amber-300 hover:text-amber-700"
													>
														<Clock class="mr-1 h-4 w-4" />
														Revert to Pending
													</Button>
												</div>
											{/if}
										{/if}
									</div>
								</CardContent>
							</Card>
						{/each}
					{/if}
				</div>
			</TabsContent>
		</Tabs>
	</div>
</div>

<!-- Approval Modal -->
<Dialog bind:open={showApprovalModal}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Approve Leave Request</DialogTitle>
			<DialogDescription>
				You are about to approve the leave request from {currentRequest?.employee?.displayName}.
			</DialogDescription>
		</DialogHeader>

		{#if currentRequest}
			<div class="space-y-4">
				<div class="rounded-lg bg-muted p-4 dark:bg-muted">
					<h4 class="mb-2 font-semibold">Request Details</h4>
					<div class="space-y-1 text-sm">
						<p><strong>Employee:</strong> {currentRequest.employee?.displayName}</p>
						<p>
							<strong>Leave Type:</strong>
							{leaveTypeOptions.find((t) => t.value === currentRequest.leaveType)?.label}
						</p>
						<p>
							<strong>Dates:</strong>
							{formatDateRange(currentRequest.startDate, currentRequest.endDate)}
						</p>
						<p><strong>Duration:</strong> {currentRequest.daysRequested} days</p>
						{#if currentRequest.reason}
							<p><strong>Reason:</strong> {currentRequest.reason}</p>
						{/if}
					</div>
				</div>

				<div>
					<Label for="approval-comments">Manager Comments (Optional)</Label>
					<Textarea
						id="approval-comments"
						placeholder="Add any comments about this approval..."
						bind:value={managerComments}
						rows={3}
					/>
				</div>
			</div>
		{/if}

		<DialogFooter>
			<Button
				variant="outline"
				onclick={() => {
					showApprovalModal = false;
				}}>Cancel</Button
			>
			<Button onclick={confirmApproval} disabled={isSubmitting}>
				{#if isSubmitting}
					Approving...
				{:else}
					<Check class="mr-2 h-4 w-4" />
					Approve Request
				{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<!-- Denial Modal -->
<Dialog bind:open={showDenialModal}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Deny Leave Request</DialogTitle>
			<DialogDescription>
				You are about to deny the leave request from {currentRequest?.employee?.displayName}.
			</DialogDescription>
		</DialogHeader>

		{#if currentRequest}
			<div class="space-y-4">
				<div class="rounded-lg bg-muted p-4 dark:bg-muted">
					<h4 class="mb-2 font-semibold">Request Details</h4>
					<div class="space-y-1 text-sm">
						<p><strong>Employee:</strong> {currentRequest.employee?.displayName}</p>
						<p>
							<strong>Leave Type:</strong>
							{leaveTypeOptions.find((t) => t.value === currentRequest.leaveType)?.label}
						</p>
						<p>
							<strong>Dates:</strong>
							{formatDateRange(currentRequest.startDate, currentRequest.endDate)}
						</p>
						<p><strong>Duration:</strong> {currentRequest.daysRequested} days</p>
						{#if currentRequest.reason}
							<p><strong>Reason:</strong> {currentRequest.reason}</p>
						{/if}
					</div>
				</div>

				<div>
					<Label for="denial-comments">Reason for Denial (Required)</Label>
					<Textarea
						id="denial-comments"
						placeholder="Please provide a reason for denying this leave request..."
						bind:value={managerComments}
						rows={3}
						class={!managerComments.trim() ? 'border-red-300' : ''}
					/>
					{#if !managerComments.trim()}
						<p class="mt-1 text-sm text-red-600">A reason for denial is required</p>
					{/if}
				</div>
			</div>
		{/if}

		<DialogFooter>
			<Button
				variant="outline"
				onclick={() => {
					showDenialModal = false;
				}}>Cancel</Button
			>
			<Button
				variant="destructive"
				onclick={confirmDenial}
				disabled={isSubmitting || !managerComments.trim()}
			>
				{#if isSubmitting}
					Denying...
				{:else}
					<X class="mr-2 h-4 w-4" />
					Deny Request
				{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<!-- Revert to Pending Modal -->
<Dialog bind:open={showRevertModal}>
	<DialogContent class="max-w-2xl">
		<DialogHeader>
			<DialogTitle>Revert to Pending</DialogTitle>
			<DialogDescription>
				This will change the status of this leave request back to pending for reconsideration.
			</DialogDescription>
		</DialogHeader>

		{#if currentRequest}
			<div class="space-y-4">
				<div class="rounded-lg bg-muted p-4 dark:bg-muted">
					<h4 class="mb-2 font-semibold">Request Details</h4>
					<div class="space-y-1 text-sm">
						<p><strong>Employee:</strong> {currentRequest.employee?.displayName}</p>
						<p>
							<strong>Leave Type:</strong>
							{leaveTypeOptions.find((t) => t.value === currentRequest.leaveType)?.label}
						</p>
						<p>
							<strong>Dates:</strong>
							{formatDateRange(currentRequest.startDate, currentRequest.endDate)}
						</p>
						<p><strong>Duration:</strong> {currentRequest.daysRequested} days</p>
						<p>
							<strong>Current Status:</strong>
							<span class="capitalize">{currentRequest.status}</span>
						</p>
						{#if currentRequest.reason}
							<p><strong>Reason:</strong> {currentRequest.reason}</p>
						{/if}
					</div>
				</div>

				<div>
					<Label for="revert-comments">Reason for Reverting (Optional)</Label>
					<Textarea
						id="revert-comments"
						placeholder="Optionally provide a reason for reverting this request to pending..."
						bind:value={managerComments}
						rows={3}
					/>
				</div>
			</div>
		{/if}

		<DialogFooter>
			<Button
				variant="outline"
				onclick={() => {
					showRevertModal = false;
				}}>Cancel</Button
			>
			<Button
				variant="default"
				onclick={confirmRevert}
				disabled={isSubmitting}
				class="bg-amber-600 hover:bg-amber-700"
			>
				{#if isSubmitting}
					Reverting...
				{:else}
					<Clock class="mr-2 h-4 w-4" />
					Revert to Pending
				{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
