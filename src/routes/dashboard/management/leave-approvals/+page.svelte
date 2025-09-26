<!-- Leave Approvals Management Page -->
<!-- T038: Fix leave management pages with standardized error handling -->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		Calendar,
		Check,
		X,
		Clock,
		AlertCircle,
		Users,
		TrendingUp,
		FileText,
		Search,
		Filter
	} from 'lucide-svelte';
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

	import {
		formatDateRange,
		getLeaveTypeColor,
		leaveTypeOptions,
		leaveStatusOptions,
		createLeaveManagementOperations
	} from '$lib/graphql/leave-management-operations';

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
		};
	}

	let { data }: Props = $props();

	// Derived state using Svelte 5 runes
	const user = $derived(data.user);
	const userSession = $derived(data.userSession);
	const leaveRequests = $derived(data.leaveRequests);
	const canApproveLeave = $derived(data.canApproveLeave);
	const canViewAllLeave = $derived(data.canViewAllLeave);

	// Local state for UI
	let selectedView = $state('pending');
	let selectedRequests = $state<string[]>([]);
	let showApprovalModal = $state(false);
	let showDenialModal = $state(false);
	let currentRequest = $state<any>(null);
	let managerComments = $state('');
	let isSubmitting = $state(false);
	let searchQuery = $state(data.filters.searchTerm || '');
	let statusFilter = $state(data.filters.statusFilter || 'pending');
	let leaveTypeFilter = $state(data.filters.leaveTypeFilter || '');

	// Statistics cards data
	const statsCards = $derived([
		{
			title: 'Pending Requests',
			value: data.leaveStats.pendingCount,
			description: 'Awaiting your approval',
			icon: Clock,
			color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
			iconColor: 'text-yellow-600'
		},
		{
			title: 'Approved This Month',
			value: data.leaveStats.approvedCount,
			description: 'Successfully approved',
			icon: Check,
			color: 'bg-green-50 text-green-700 border-green-200',
			iconColor: 'text-green-600'
		},
		{
			title: 'Total Days Requested',
			value: data.leaveStats.totalDaysRequested,
			description: 'Days across all requests',
			icon: Calendar,
			color: 'bg-blue-50 text-blue-700 border-blue-200',
			iconColor: 'text-blue-600'
		},
		{
			title: 'Approval Rate',
			value: `${data.leaveStats.approvalRate}%`,
			description: 'Historical approval rate',
			icon: TrendingUp,
			color: 'bg-purple-50 text-purple-700 border-purple-200',
			iconColor: 'text-purple-600'
		}
	]);

	// Filter and display logic
	const filteredRequests = $derived(() => {
		let filtered = leaveRequests;

		if (selectedView !== 'all') {
			filtered = filtered.filter((request) => request.status === selectedView);
		}

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

	// Handlers for approve/deny actions
	async function handleApprove(request: any) {
		currentRequest = request;
		showApprovalModal = true;
	}

	async function handleDeny(request: any) {
		currentRequest = request;
		showDenialModal = true;
	}

	async function confirmApproval() {
		if (!currentRequest || !canApproveLeave) return;

		isSubmitting = true;

		try {
			// In a real app, this would be a form action or API call
			// For now, we'll use client-side operations for the action
			const leaveOps = createLeaveManagementOperations(null);

			await leaveOps.approveLeaveRequest({
				id: currentRequest.id,
				notes: managerComments,
				userCredentials: {
					userId: userSession.userId,
					userEmail: userSession.userEmail,
					role: userSession.role,
					accessToken: userSession.accessToken
				}
			});

			toast.success('Leave request approved successfully');

			// Refresh the page to get updated data
			goto($page.url.pathname, { invalidateAll: true });

			// Close modal and reset state
			showApprovalModal = false;
			currentRequest = null;
			managerComments = '';
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
			const leaveOps = createLeaveManagementOperations(null);

			await leaveOps.denyLeaveRequest({
				id: currentRequest.id,
				notes: managerComments,
				userCredentials: {
					userId: userSession.userId,
					userEmail: userSession.userEmail,
					role: userSession.role,
					accessToken: userSession.accessToken
				}
			});

			toast.success('Leave request denied');

			// Refresh the page to get updated data
			goto($page.url.pathname, { invalidateAll: true });

			// Close modal and reset state
			showDenialModal = false;
			currentRequest = null;
			managerComments = '';
		} catch (error) {
			console.error('Failed to deny leave request:', error);
			toast.error('Failed to deny leave request');
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
	<title>Leave Approvals - SvelteHR</title>
	<meta
		name="description"
		content="Review and manage pending leave requests from your team members"
	/>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="container mx-auto space-y-6 p-4">
		<!-- Header -->
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-gray-900">Leave Approvals</h1>
				<p class="text-gray-600">Review and manage pending leave requests from your team members</p>
			</div>

			{#if canViewAllLeave}
				<Button variant="outline" href="/dashboard/management/leave/all">
					<FileText class="mr-2 h-4 w-4" />
					View All Leave
				</Button>
			{/if}
		</div>

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
				<div class="space-y-4">
					{#if filteredRequests.length === 0}
						<Card>
							<CardContent class="p-8 text-center">
								<AlertCircle class="mx-auto mb-4 h-12 w-12 text-gray-400" />
								<h3 class="mb-2 text-lg font-semibold text-gray-700">No requests found</h3>
								<p class="text-gray-500">
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
													<h3 class="text-lg font-semibold text-gray-900">
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

												<div class="space-y-1 text-sm text-gray-600">
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

												<div class="text-xs text-gray-400">
													Requested on {new Date(request.createdAt).toLocaleDateString()}
												</div>
											</div>
										</div>

										<!-- Actions -->
										{#if canApproveLeave && request.status === 'pending'}
											<div class="ml-4 flex gap-2">
												<Button
													size="sm"
													variant="outline"
													onclick={() => handleApprove(request)}
													class="border-green-200 text-green-600 hover:border-green-300 hover:text-green-700"
												>
													<Check class="mr-1 h-4 w-4" />
													Approve
												</Button>
												<Button
													size="sm"
													variant="outline"
													onclick={() => handleDeny(request)}
													class="border-red-200 text-red-600 hover:border-red-300 hover:text-red-700"
												>
													<X class="mr-1 h-4 w-4" />
													Deny
												</Button>
											</div>
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
				<div class="rounded-lg bg-gray-50 p-4">
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
				<div class="rounded-lg bg-gray-50 p-4">
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
