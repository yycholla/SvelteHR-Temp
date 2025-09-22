<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { currentUser } from '$lib/stores/auth';
	import { executeQuery } from '$lib/graphql/client';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import * as Tabs from '$lib/components/ui/tabs';
	import {
		Calendar,
		Clock,
		CheckCircle,
		XCircle,
		AlertTriangle,
		User,
		ArrowLeft,
		RefreshCw,
		Download,
		Filter,
		Plus,
		FileText,
		Search
	} from 'lucide-svelte';

	// Get user ID from URL params
	const userId = $page.params.userId;

	// Check if viewing own leave requests
	const isOwnRequests = $derived($currentUser?.id === userId);

	// State
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchTerm = $state('');
	let statusFilter = $state('all');
	let typeFilter = $state('all');
	let leaveRequests = $state<any[]>([]);
	let userInfo = $state<any>(null);

	// GraphQL query for leave requests
	const GET_USER_LEAVE_REQUESTS = `
		query GetUserLeaveRequests($userId: UUID!) {
			userById(id: $userId) {
				id
				displayName
				email
				jobTitle
				hireDate
			}

			allLeaveRequests(
				condition: { employeeId: $userId }
				orderBy: START_DATE_DESC
			) {
				nodes {
					id
					startDate
					endDate
					status
					reason
					createdAt
					updatedAt
					reviewedBy
				}
			}
		}
	`;

	// Helper functions
	function getStatusColor(status: string) {
		switch (status?.toLowerCase()) {
			case 'approved': return 'default';
			case 'pending': return 'secondary';
			case 'rejected': return 'destructive';
			case 'cancelled': return 'outline';
			default: return 'secondary';
		}
	}

	function getStatusIcon(status: string) {
		switch (status?.toLowerCase()) {
			case 'approved': return CheckCircle;
			case 'pending': return Clock;
			case 'rejected': return XCircle;
			case 'cancelled': return AlertTriangle;
			default: return Clock;
		}
	}

	function formatDate(dateString: string) {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatDateRange(startDate: string, endDate: string) {
		if (!startDate || !endDate) return '-';
		const start = formatDate(startDate);
		const end = formatDate(endDate);
		return start === end ? start : `${start} - ${end}`;
	}

	function calculateDays(startDate: string, endDate: string) {
		if (!startDate || !endDate) return 0;
		const start = new Date(startDate);
		const end = new Date(endDate);
		const diffTime = Math.abs(end.getTime() - start.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
		return diffDays;
	}

	// Computed values
	const filteredRequests = $derived(() => {
		return leaveRequests.filter(request => {
			if (searchTerm && !request.reason?.toLowerCase().includes(searchTerm.toLowerCase())) {
				return false;
			}
			if (statusFilter !== 'all' && request.status?.toLowerCase() !== statusFilter) {
				return false;
			}
			return true;
		});
	});

	const requestStats = $derived(() => {
		const stats = {
			total: leaveRequests.length,
			pending: 0,
			approved: 0,
			rejected: 0,
			totalDays: 0
		};

		leaveRequests.forEach(request => {
			switch (request.status?.toLowerCase()) {
				case 'pending':
					stats.pending++;
					break;
				case 'approved':
					stats.approved++;
					stats.totalDays += calculateDays(request.startDate, request.endDate);
					break;
				case 'rejected':
					stats.rejected++;
					break;
			}
		});

		return stats;
	});

	async function loadLeaveRequests() {
		loading = true;
		error = null;

		try {
			const { client } = await import('$lib/graphql/client');

			const data = await executeQuery(client, GET_USER_LEAVE_REQUESTS, {
				userId
			});

			if (data.errors) {
				throw new Error(data.errors[0].message);
			}

			userInfo = data.userById;
			leaveRequests = data.allLeaveRequests?.nodes || [];
		} catch (err) {
			console.error('Error loading leave requests:', err);
			error = err instanceof Error ? err.message : 'Failed to load leave requests';
		} finally {
			loading = false;
		}
	}

	async function cancelRequest(requestId: string) {
		// TODO: Implement cancel request functionality
		console.log('Cancel request:', requestId);
	}

	onMount(() => {
		loadLeaveRequests();
	});
</script>

<svelte:head>
	<title>{isOwnRequests ? 'My Leave Requests' : 'User Leave Requests'} - SvelteHR</title>
	<meta name="description" content="View and manage leave requests" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="sm" onclick={() => goto('/dashboard')}>
				<ArrowLeft class="h-4 w-4" />
			</Button>

			<div>
				<div class="flex items-center gap-3">
					<Calendar class="h-8 w-8 text-primary" />
					<h1 class="text-3xl font-bold tracking-tight">
						{isOwnRequests ? 'My Leave Requests' : 'User Leave Requests'}
					</h1>
				</div>
				<p class="text-muted-foreground">
					{isOwnRequests ? 'View and manage your leave requests' : 'View user leave request history'}
					{#if userInfo}
						• {userInfo.displayName}
					{/if}
				</p>
			</div>
		</div>

		<div class="flex items-center gap-2">
			{#if isOwnRequests}
				<Button href="/dashboard/users/{userId}/leave/new">
					<Plus class="mr-2 h-4 w-4" />
					New Request
				</Button>
			{/if}
			<Button variant="outline" size="sm" onclick={loadLeaveRequests}>
				<RefreshCw class="h-4 w-4" />
			</Button>
		</div>
	</div>

	<!-- Loading State -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<RefreshCw class="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
				<p class="mt-2 text-muted-foreground">Loading leave requests...</p>
			</div>
		</div>
	{:else if error}
		<!-- Error State -->
		<Card.Root>
			<Card.Content class="py-8">
				<div class="text-center">
					<AlertTriangle class="mx-auto h-12 w-12 text-destructive" />
					<h3 class="mt-4 text-lg font-semibold">Error Loading Leave Requests</h3>
					<p class="text-muted-foreground">{error}</p>
					<Button class="mt-4" onclick={loadLeaveRequests}>
						Try Again
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}

	<!-- Leave Request Statistics -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Requests</Card.Title>
				<FileText class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{requestStats.total}</div>
				<p class="text-xs text-muted-foreground">All time</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Pending</Card.Title>
				<Clock class="h-4 w-4 text-yellow-500" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-yellow-600">{requestStats.pending}</div>
				<p class="text-xs text-muted-foreground">Awaiting approval</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Approved</Card.Title>
				<CheckCircle class="h-4 w-4 text-green-500" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-green-600">{requestStats.approved}</div>
				<p class="text-xs text-muted-foreground">{requestStats.totalDays} total days</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Rejected</Card.Title>
				<XCircle class="h-4 w-4 text-red-500" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-red-600">{requestStats.rejected}</div>
				<p class="text-xs text-muted-foreground">Denied requests</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Search and Filters -->
	<Card.Root>
		<Card.Content class="p-4">
			<div class="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
				<!-- Search -->
				<div class="relative flex-1">
					<Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search requests..."
						bind:value={searchTerm}
						class="pl-10"
					/>
				</div>

				<!-- Status Filter -->
				<Select.Root bind:selected={statusFilter}>
					<Select.Trigger class="w-40">
						<Select.Value placeholder="All statuses" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all">All statuses</Select.Item>
						<Select.Item value="pending">Pending</Select.Item>
						<Select.Item value="approved">Approved</Select.Item>
						<Select.Item value="rejected">Rejected</Select.Item>
						<Select.Item value="cancelled">Cancelled</Select.Item>
					</Select.Content>
				</Select.Root>

				{#if searchTerm || statusFilter !== 'all'}
					<Button
						variant="ghost"
						size="sm"
						onclick={() => {
							searchTerm = '';
							statusFilter = 'all';
						}}
					>
						Clear
					</Button>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Leave Requests List -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Leave Requests ({filteredRequests.length})</Card.Title>
					<Card.Description>Request history and status</Card.Description>
				</div>
				<Button variant="outline" size="sm">
					<Download class="mr-2 h-4 w-4" />
					Export
				</Button>
			</div>
		</Card.Header>
		<Card.Content>
			{#if filteredRequests.length === 0}
				<div class="py-8 text-center">
					<Calendar class="mx-auto h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No Leave Requests</h3>
					<p class="text-muted-foreground">
						{searchTerm || statusFilter !== 'all'
							? 'Try adjusting your search or filters.'
							: 'No leave requests found.'}
					</p>
					{#if isOwnRequests && !searchTerm && statusFilter === 'all'}
						<Button class="mt-4" href="/dashboard/users/{userId}/leave/new">
							<Plus class="mr-2 h-4 w-4" />
							Submit Your First Request
						</Button>
					{/if}
				</div>
			{:else}
				<div class="space-y-4">
					{#each filteredRequests as request (request.id)}
						<div class="rounded-lg border p-4 transition-colors hover:bg-muted/50">
							<div class="flex items-start justify-between">
								<div class="flex-1 space-y-2">
									<div class="flex items-center gap-3">
										<div class="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
											<svelte:component
												this={getStatusIcon(request.status)}
												class="h-4 w-4 {request.status?.toLowerCase() === 'approved' ? 'text-green-500' :
													   request.status?.toLowerCase() === 'pending' ? 'text-yellow-500' :
													   request.status?.toLowerCase() === 'rejected' ? 'text-red-500' : 'text-gray-500'}"
											/>
										</div>
										<div>
											<h4 class="font-semibold">{formatDateRange(request.startDate, request.endDate)}</h4>
											<p class="text-sm text-muted-foreground">
												{calculateDays(request.startDate, request.endDate)} day{calculateDays(request.startDate, request.endDate) !== 1 ? 's' : ''}
											</p>
										</div>
									</div>

									{#if request.reason}
										<p class="text-sm">{request.reason}</p>
									{/if}

									{#if request.reviewedBy}
										<p class="text-xs text-muted-foreground">
											Reviewed by: {request.reviewedBy}
										</p>
									{/if}

									<div class="flex items-center gap-4 text-xs text-muted-foreground">
										<span>Submitted: {formatDate(request.createdAt)}</span>
										{#if request.updatedAt && request.updatedAt !== request.createdAt}
											<span>Updated: {formatDate(request.updatedAt)}</span>
										{/if}
									</div>
								</div>

								<div class="flex items-center gap-2 ml-4">
									<Badge variant={getStatusColor(request.status)}>
										{request.status || 'Unknown'}
									</Badge>

									{#if isOwnRequests && request.status?.toLowerCase() === 'pending'}
										<Button
											variant="outline"
											size="sm"
											onclick={() => cancelRequest(request.id)}
										>
											Cancel
										</Button>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	{/if}
</div>