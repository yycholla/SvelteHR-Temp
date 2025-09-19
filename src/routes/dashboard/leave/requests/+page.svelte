<script lang="ts">
	import { onMount } from 'svelte';
	import { queryStore } from '@urql/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { currentUser, hasRole } from '$lib/stores/auth';
	import RoleGuard from '$lib/components/auth/RoleGuard.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Calendar, Plus, Search, Check, X, RefreshCw, Clock, User, List } from 'lucide-svelte';

	// Import our new GraphQL operations
	import {
		GET_MY_LEAVE_REQUESTS_QUERY,
		GET_TEAM_LEAVE_REQUESTS_QUERY,
		GET_PENDING_LEAVE_REQUESTS_QUERY,
		type LeaveRequest,
		type LeaveRequestStatus
	} from '$lib/graphql/leave-management-operations';

	// State
	let searchTerm = $state('');
	let currentTab = $state('my');

	// Create client and queries
	const client = createUrqlClient();
	let myLeaveQuery: any = $state(null);
	let teamLeaveQuery: any = $state(null);
	let pendingLeaveQuery: any = $state(null);

	let myQueryState = $state({ fetching: true, error: null, data: null });
	let teamQueryState = $state({ fetching: false, error: null, data: null });
	let pendingQueryState = $state({ fetching: false, error: null, data: null });

	onMount(() => {
		try {
			// Initialize my leave requests query
			myLeaveQuery = queryStore({
				client,
				query: GET_MY_LEAVE_REQUESTS_QUERY,
				variables: {}
			});

			// Initialize team leave requests if user is manager
			if ($currentUser && hasRole(['manager', 'hr', 'admin'])) {
				teamLeaveQuery = queryStore({
					client,
					query: GET_TEAM_LEAVE_REQUESTS_QUERY,
					variables: {}
				});

				pendingLeaveQuery = queryStore({
					client,
					query: GET_PENDING_LEAVE_REQUESTS_QUERY,
					variables: {}
				});
			}
		} catch (error) {
			console.error('Error initializing leave queries:', error);
		}
	});

	// Update query states
	$effect(() => {
		if (myLeaveQuery) {
			const unsubscribe = myLeaveQuery.subscribe((state: any) => {
				myQueryState = {
					fetching: state.fetching,
					error: state.error,
					data: state.data
				};
			});
			return unsubscribe;
		}
	});

	$effect(() => {
		if (teamLeaveQuery) {
			const unsubscribe = teamLeaveQuery.subscribe((state: any) => {
				teamQueryState = {
					fetching: state.fetching,
					error: state.error,
					data: state.data
				};
			});
			return unsubscribe;
		}
	});

	$effect(() => {
		if (pendingLeaveQuery) {
			const unsubscribe = pendingLeaveQuery.subscribe((state: any) => {
				pendingQueryState = {
					fetching: state.fetching,
					error: state.error,
					data: state.data
				};
			});
			return unsubscribe;
		}
	});

	// Get current data based on active tab
	const getCurrentData = $derived(() => {
		switch (currentTab) {
			case 'my':
				return myQueryState.data?.allLeaveRequests?.nodes || [];
			case 'team':
				return teamQueryState.data?.allLeaveRequests?.nodes || [];
			case 'pending':
				return pendingQueryState.data?.allLeaveRequests?.nodes || [];
			default:
				return [];
		}
	});

	const getCurrentLoading = $derived(() => {
		switch (currentTab) {
			case 'my':
				return myQueryState.fetching;
			case 'team':
				return teamQueryState.fetching;
			case 'pending':
				return pendingQueryState.fetching;
			default:
				return false;
		}
	});

	const getCurrentError = $derived(() => {
		switch (currentTab) {
			case 'my':
				return myQueryState.error;
			case 'team':
				return teamQueryState.error;
			case 'pending':
				return pendingQueryState.error;
			default:
				return null;
		}
	});

	// Filter requests based on search
	const filteredRequests = $derived(() => {
		if (!searchTerm) return getCurrentData;
		const search = searchTerm.toLowerCase();
		return getCurrentData.filter(
			(req: LeaveRequest) =>
				req.type?.toLowerCase().includes(search) ||
				req.reason?.toLowerCase().includes(search) ||
				req.status?.toLowerCase().includes(search)
		);
	});

	// Get status badge variant
	const getStatusVariant = (status: LeaveRequestStatus) => {
		switch (status) {
			case 'PENDING':
				return 'secondary';
			case 'APPROVED':
				return 'default';
			case 'REJECTED':
				return 'destructive';
			case 'CANCELLED':
				return 'outline';
			default:
				return 'outline';
		}
	};

	// Get type badge variant
	const getTypeVariant = (type: string) => {
		switch (type) {
			case 'VACATION':
				return 'default';
			case 'SICK':
				return 'secondary';
			case 'PERSONAL':
				return 'outline';
			default:
				return 'outline';
		}
	};

	// Format date
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString();
	};

	// Calculate days between dates
	const calculateDays = (startDate: string, endDate: string) => {
		const start = new Date(startDate);
		const end = new Date(endDate);
		const diffTime = Math.abs(end.getTime() - start.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays + 1; // Include both start and end dates
	};

	// Refresh data
	const refresh = () => {
		if (currentTab === 'my' && myLeaveQuery?.rerun) {
			myLeaveQuery.rerun({ requestPolicy: 'network-only' });
		} else if (currentTab === 'team' && teamLeaveQuery?.rerun) {
			teamLeaveQuery.rerun({ requestPolicy: 'network-only' });
		} else if (currentTab === 'pending' && pendingLeaveQuery?.rerun) {
			pendingLeaveQuery.rerun({ requestPolicy: 'network-only' });
		}
	};

	// Get pending count for badge
	const pendingCount = $derived(() => {
		return pendingQueryState.data?.allLeaveRequests?.nodes?.length || 0;
	});
</script>

<svelte:head>
	<title>Leave Requests - SvelteHR</title>
	<meta name="description" content="Manage leave requests and time off" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
		<div>
			<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
				<Calendar class="h-8 w-8" />
				Leave Requests
			</h1>
			<p class="text-muted-foreground">View and manage leave requests and time off</p>
		</div>

		<div class="flex items-center space-x-2">
			<Button href="/dashboard/leave/new">
				<Plus class="mr-2 h-4 w-4" />
				Request Leave
			</Button>

			<Button variant="outline" size="sm" onclick={refresh} disabled={getCurrentLoading}>
				<RefreshCw class="h-4 w-4 {getCurrentLoading ? 'animate-spin' : ''}" />
			</Button>
		</div>
	</div>

	<!-- Tabs -->
	<Tabs.Root bind:value={currentTab} class="w-full">
		<Tabs.List class="grid w-full grid-cols-3">
			<Tabs.Trigger value="my" class="flex items-center gap-2">
				<User class="h-4 w-4" />
				My Requests
			</Tabs.Trigger>
			<RoleGuard permissions={['manager:*', 'hr:*', 'admin:*']}>
				<Tabs.Trigger value="team" class="flex items-center gap-2">
					<List class="h-4 w-4" />
					Team Requests
				</Tabs.Trigger>
				<Tabs.Trigger value="pending" class="flex items-center gap-2">
					<Clock class="h-4 w-4" />
					Pending Approval
					{#if pendingCount > 0}
						<Badge variant="secondary" class="ml-1">{pendingCount}</Badge>
					{/if}
				</Tabs.Trigger>
			</RoleGuard>
		</Tabs.List>

		<!-- Search -->
		<Card.Root>
			<Card.Content class="p-6">
				<div class="relative">
					<Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
					<Input placeholder="Search leave requests..." bind:value={searchTerm} class="pl-10" />
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Results count -->
		{#if !getCurrentLoading}
			<div class="text-sm text-muted-foreground">
				Found {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
			</div>
		{/if}

		<!-- Tab Content -->
		<Tabs.Content value="my" class="space-y-4">
			{#if getCurrentLoading && !getCurrentData.length}
				<div class="flex items-center justify-center py-12">
					<div class="flex items-center space-x-2">
						<RefreshCw class="h-4 w-4 animate-spin" />
						<p>Loading your leave requests...</p>
					</div>
				</div>
			{:else if getCurrentError}
				<Card.Root>
					<Card.Content class="py-8">
						<div class="space-y-4 text-center">
							<h3 class="text-lg font-semibold">Failed to load leave requests</h3>
							<p class="text-muted-foreground">{getCurrentError.message}</p>
							<Button variant="outline" onclick={refresh}>Try Again</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{:else if filteredRequests.length === 0}
				<Card.Root>
					<Card.Content class="py-12">
						<div class="space-y-4 text-center">
							<Calendar class="mx-auto h-12 w-12 text-muted-foreground" />
							<h3 class="text-lg font-semibold">No leave requests found</h3>
							<p class="text-muted-foreground">
								{#if searchTerm}
									Try adjusting your search terms.
								{:else}
									Get started by submitting your first leave request.
								{/if}
							</p>
							<Button href="/dashboard/leave/new">
								<Plus class="mr-2 h-4 w-4" />
								Request Leave
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{:else}
				<Card.Root>
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Type</Table.Head>
								<Table.Head>Start Date</Table.Head>
								<Table.Head>End Date</Table.Head>
								<Table.Head>Days</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head>Reason</Table.Head>
								<Table.Head>Submitted</Table.Head>
								<Table.Head class="w-24">Actions</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each filteredRequests as request (request.id)}
								<Table.Row>
									<Table.Cell>
										<Badge variant={getTypeVariant(request.type)}>
											{request.type}
										</Badge>
									</Table.Cell>
									<Table.Cell>
										<span class="text-sm">{formatDate(request.startDate)}</span>
									</Table.Cell>
									<Table.Cell>
										<span class="text-sm">{formatDate(request.endDate)}</span>
									</Table.Cell>
									<Table.Cell>
										<span class="text-sm font-medium">
											{calculateDays(request.startDate, request.endDate)}
										</span>
									</Table.Cell>
									<Table.Cell>
										<Badge variant={getStatusVariant(request.status)}>
											{request.status}
										</Badge>
									</Table.Cell>
									<Table.Cell>
										<span class="text-sm">{request.reason || '-'}</span>
									</Table.Cell>
									<Table.Cell>
										<span class="text-sm text-muted-foreground">
											{formatDate(request.createdAt)}
										</span>
									</Table.Cell>
									<Table.Cell>
										<div class="flex items-center space-x-1">
											{#if request.status === 'PENDING'}
												<RoleGuard permissions={['manager:*', 'hr:*', 'admin:*']}>
													<Button variant="ghost" size="sm">
														<Check class="h-4 w-4" />
													</Button>
													<Button variant="ghost" size="sm">
														<X class="h-4 w-4" />
													</Button>
												</RoleGuard>
											{/if}
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</Card.Root>
			{/if}
		</Tabs.Content>

		<Tabs.Content value="team" class="space-y-4">
			<!-- Similar structure to "my" tab but shows team requests -->
			{#if getCurrentLoading && !getCurrentData.length}
				<div class="flex items-center justify-center py-12">
					<div class="flex items-center space-x-2">
						<RefreshCw class="h-4 w-4 animate-spin" />
						<p>Loading team leave requests...</p>
					</div>
				</div>
			{:else if getCurrentError}
				<Card.Root>
					<Card.Content class="py-8">
						<div class="space-y-4 text-center">
							<h3 class="text-lg font-semibold">Failed to load team requests</h3>
							<p class="text-muted-foreground">{getCurrentError.message}</p>
							<Button variant="outline" onclick={refresh}>Try Again</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{:else if filteredRequests.length === 0}
				<Card.Root>
					<Card.Content class="py-12">
						<div class="space-y-4 text-center">
							<Calendar class="mx-auto h-12 w-12 text-muted-foreground" />
							<h3 class="text-lg font-semibold">No team requests found</h3>
							<p class="text-muted-foreground">No leave requests from your team members.</p>
						</div>
					</Card.Content>
				</Card.Root>
			{:else}
				<Card.Root>
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Employee</Table.Head>
								<Table.Head>Type</Table.Head>
								<Table.Head>Start Date</Table.Head>
								<Table.Head>End Date</Table.Head>
								<Table.Head>Days</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head>Submitted</Table.Head>
								<Table.Head class="w-24">Actions</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each filteredRequests as request (request.id)}
								<Table.Row>
									<Table.Cell>
										<div class="font-medium">{request.employee?.displayName || 'Unknown'}</div>
										<div class="text-sm text-muted-foreground">{request.employee?.email}</div>
									</Table.Cell>
									<Table.Cell>
										<Badge variant={getTypeVariant(request.type)}>
											{request.type}
										</Badge>
									</Table.Cell>
									<Table.Cell>
										<span class="text-sm">{formatDate(request.startDate)}</span>
									</Table.Cell>
									<Table.Cell>
										<span class="text-sm">{formatDate(request.endDate)}</span>
									</Table.Cell>
									<Table.Cell>
										<span class="text-sm font-medium">
											{calculateDays(request.startDate, request.endDate)}
										</span>
									</Table.Cell>
									<Table.Cell>
										<Badge variant={getStatusVariant(request.status)}>
											{request.status}
										</Badge>
									</Table.Cell>
									<Table.Cell>
										<span class="text-sm text-muted-foreground">
											{formatDate(request.createdAt)}
										</span>
									</Table.Cell>
									<Table.Cell>
										<div class="flex items-center space-x-1">
											{#if request.status === 'PENDING'}
												<Button variant="ghost" size="sm">
													<Check class="h-4 w-4" />
												</Button>
												<Button variant="ghost" size="sm">
													<X class="h-4 w-4" />
												</Button>
											{/if}
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</Card.Root>
			{/if}
		</Tabs.Content>

		<Tabs.Content value="pending" class="space-y-4">
			<!-- Similar structure for pending requests that need approval -->
			{#if getCurrentLoading && !getCurrentData.length}
				<div class="flex items-center justify-center py-12">
					<div class="flex items-center space-x-2">
						<RefreshCw class="h-4 w-4 animate-spin" />
						<p>Loading pending requests...</p>
					</div>
				</div>
			{:else if getCurrentError}
				<Card.Root>
					<Card.Content class="py-8">
						<div class="space-y-4 text-center">
							<h3 class="text-lg font-semibold">Failed to load pending requests</h3>
							<p class="text-muted-foreground">{getCurrentError.message}</p>
							<Button variant="outline" onclick={refresh}>Try Again</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{:else if filteredRequests.length === 0}
				<Card.Root>
					<Card.Content class="py-12">
						<div class="space-y-4 text-center">
							<Clock class="mx-auto h-12 w-12 text-muted-foreground" />
							<h3 class="text-lg font-semibold">No pending requests</h3>
							<p class="text-muted-foreground">All leave requests have been processed.</p>
						</div>
					</Card.Content>
				</Card.Root>
			{:else}
				<Card.Root>
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Employee</Table.Head>
								<Table.Head>Type</Table.Head>
								<Table.Head>Start Date</Table.Head>
								<Table.Head>End Date</Table.Head>
								<Table.Head>Days</Table.Head>
								<Table.Head>Reason</Table.Head>
								<Table.Head>Submitted</Table.Head>
								<Table.Head class="w-32">Actions</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each filteredRequests as request (request.id)}
								<Table.Row>
									<Table.Cell>
										<div class="font-medium">{request.employee?.displayName || 'Unknown'}</div>
										<div class="text-sm text-muted-foreground">{request.employee?.email}</div>
									</Table.Cell>
									<Table.Cell>
										<Badge variant={getTypeVariant(request.type)}>
											{request.type}
										</Badge>
									</Table.Cell>
									<Table.Cell>
										<span class="text-sm">{formatDate(request.startDate)}</span>
									</Table.Cell>
									<Table.Cell>
										<span class="text-sm">{formatDate(request.endDate)}</span>
									</Table.Cell>
									<Table.Cell>
										<span class="text-sm font-medium">
											{calculateDays(request.startDate, request.endDate)}
										</span>
									</Table.Cell>
									<Table.Cell>
										<span class="text-sm">{request.reason || '-'}</span>
									</Table.Cell>
									<Table.Cell>
										<span class="text-sm text-muted-foreground">
											{formatDate(request.createdAt)}
										</span>
									</Table.Cell>
									<Table.Cell>
										<div class="flex items-center space-x-1">
											<Button
												variant="outline"
												size="sm"
												class="text-green-600 hover:text-green-700"
											>
												<Check class="h-4 w-4" />
											</Button>
											<Button variant="outline" size="sm" class="text-red-600 hover:text-red-700">
												<X class="h-4 w-4" />
											</Button>
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</Card.Root>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>
