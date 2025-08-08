<script lang="ts">
	import { goto } from '$app/navigation';
	import { Calendar, Clock, CheckCircle, AlertCircle, Users, Plus, Filter } from 'lucide-svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs';
	import type { LeaveBalance, Leave } from '$lib/schemas/leave';
	import type { PageData } from './$types';

	// Page data from server
	let { data }: { data: PageData } = $props();

	// Local filter states
	let activeTab = $state(data.filters.activeTab);
	let statusFilter = $state(data.filters.status);
	let leaveTypeFilter = $state(data.filters.leaveType);

	// Derived data from server
	const leaveBalances = $derived(data.leaveBalances);
	const leaveRequests = $derived(data.leaveRequests);
	const stats = $derived(data.stats);
	const loading = $state(false);
	const error = $derived(data.error || '');

	// Leave types
	const leaveTypes = [
		'Vacation',
		'Sick',
		'Personal',
		'Maternity',
		'Paternity',
		'Bereavement',
		'Jury Duty',
		'Military'
	];


	// Apply filters by navigating to new URL with query parameters
	async function applyFilters() {
		const params = new URLSearchParams();
		
		if (statusFilter !== 'all') params.set('status', statusFilter);
		if (leaveTypeFilter !== 'all') params.set('leaveType', leaveTypeFilter);
		params.set('tab', activeTab);
		
		const queryString = params.toString();
		const newUrl = queryString ? `/hr/leave?${queryString}` : '/hr/leave';
		
		await goto(newUrl);
	}

	function getStatusVariant(status: string) {
		switch (status?.toLowerCase()) {
			case 'approved': return 'default';
			case 'pending': return 'secondary';
			case 'denied': return 'destructive';
			default: return 'outline';
		}
	}

	function getStatusIcon(status: string) {
		switch (status?.toLowerCase()) {
			case 'approved': return CheckCircle;
			case 'pending': return Clock;
			case 'denied': return AlertCircle;
			default: return Calendar;
		}
	}

	function formatDate(dateString: string | null) {
		if (!dateString) return 'N/A';
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		}).format(new Date(dateString));
	}

	function calculateUsedPercentage(balance: LeaveBalance): number {
		if (!balance.totalDays || balance.totalDays === 0) return 0;
		return Math.round(((balance.usedDays || 0) / balance.totalDays) * 100);
	}

	function getDaysRange(startDate: string, endDate: string): number {
		const start = new Date(startDate);
		const end = new Date(endDate);
		const diffTime = end.getTime() - start.getTime();
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
	}

	async function handleRequestAction(requestId: string, action: 'approve' | 'deny') {
		// TODO: Implement server-side action - for now just log
		console.log(`${action} request ${requestId}`);
		// This would need to be a server action or form submission
	}

	function clearFilters() {
		statusFilter = 'all';
		leaveTypeFilter = 'all';
		applyFilters();
	}

	// Apply filters when any filter changes
	$effect(() => {
		if (activeTab !== data.filters.activeTab || 
		    statusFilter !== data.filters.status || 
		    leaveTypeFilter !== data.filters.leaveType) {
			applyFilters();
		}
	});
</script>

<div class="space-y-6">

	<!-- Summary Cards -->
	<div class="grid gap-4 md:grid-cols-4">
		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Total Employees</CardTitle>
				<Users class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.totalEmployees}</div>
				<p class="text-xs text-muted-foreground">With leave balances</p>
			</CardContent>
		</Card>

		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Pending Requests</CardTitle>
				<Clock class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.pendingRequests}</div>
				<p class="text-xs text-muted-foreground">Awaiting approval</p>
			</CardContent>
		</Card>

		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Approved This Month</CardTitle>
				<CheckCircle class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.approvedRequests}</div>
				<p class="text-xs text-muted-foreground">Recent approvals</p>
			</CardContent>
		</Card>

		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Avg. Balance</CardTitle>
				<Calendar class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.averageBalance}</div>
				<p class="text-xs text-muted-foreground">Days remaining</p>
			</CardContent>
		</Card>
	</div>

	<!-- Tabs for Balances and Requests -->
	<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
		<CardContent class="p-6">
			<Tabs bind:value={activeTab}>
				<TabsList class="grid w-full grid-cols-2">
					<TabsTrigger value="balances">Leave Balances</TabsTrigger>
					<TabsTrigger value="requests">Leave Requests</TabsTrigger>
				</TabsList>

				<!-- Leave Balances Tab -->
				<TabsContent value="balances" class="space-y-4">
					<!-- Filters for Balances -->
					<Card class="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border border-white/40 dark:border-slate-600/40 rounded-lg">
						<CardHeader>
							<CardTitle>Filter Leave Balances</CardTitle>
						</CardHeader>
						<CardContent>
					<div class="flex gap-4">
						<select 
							class="px-3 py-2 border border-input rounded-md bg-background text-foreground"
							bind:value={leaveTypeFilter}
						>
							<option value="all">All Leave Types</option>
							{#each leaveTypes as type}
								<option value={type}>{type}</option>
							{/each}
						</select>
						
						<Button variant="outline" onclick={clearFilters}>
							Clear Filters
						</Button>
					</div>
				</CardContent>
			</Card>

					<!-- Leave Balances List -->
					<Card class="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border border-white/40 dark:border-slate-600/40 rounded-lg">
						<CardHeader>
							<CardTitle>Employee Leave Balances</CardTitle>
							<CardDescription>
								Current leave balances for all employees
							</CardDescription>
						</CardHeader>
				<CardContent>
					{#if loading}
						<div class="flex items-center justify-center py-8">
							<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
						</div>
					{:else if error}
						<div class="text-center py-8">
							<p class="text-destructive">{error}</p>
							<Button variant="outline" class="mt-4" onclick={() => window.location.reload()}>
								Retry
							</Button>
						</div>
					{:else if leaveBalances.length === 0}
						<div class="text-center py-8">
							<Calendar class="mx-auto h-12 w-12 text-muted-foreground/50" />
							<h3 class="mt-4 text-lg font-semibold">No leave balances found</h3>
							<p class="mt-2 text-muted-foreground">
								No leave balances match the selected criteria
							</p>
						</div>
					{:else}
						<div class="space-y-4">
							{#each leaveBalances as balance}
								{@const usedPercentage = calculateUsedPercentage(balance)}
								
								<div class="border border-border/50 rounded-lg p-4">
									<div class="flex items-start justify-between mb-4">
										<div class="flex items-center space-x-4">
											<div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
												<span class="text-sm font-medium text-primary">
													{balance.employee?.firstName?.[0] || ''}{balance.employee?.lastName?.[0] || ''}
												</span>
											</div>
											<div>
												<h3 class="font-medium text-foreground">
													{balance.employee?.firstName} {balance.employee?.lastName}
												</h3>
												<p class="text-sm text-muted-foreground">
													{balance.leaveType} Leave • {balance.year}
												</p>
											</div>
										</div>
										
										<div class="text-right">
											<p class="text-2xl font-bold">
												{balance.remainingDays || 0}
											</p>
											<p class="text-sm text-muted-foreground">days remaining</p>
										</div>
									</div>

									<div class="space-y-2">
										<div class="flex items-center justify-between text-sm">
											<span>Leave Usage</span>
											<span>{balance.usedDays || 0} of {balance.totalDays || 0} days used</span>
										</div>
										<Progress value={usedPercentage} class="h-2" />
									</div>

									<div class="grid grid-cols-3 gap-4 mt-4 text-sm">
										<div>
											<span class="font-medium">Total Allocation:</span>
											<p class="text-muted-foreground">{balance.totalDays || 0} days</p>
										</div>
										<div>
											<span class="font-medium">Used:</span>
											<p class="text-muted-foreground">{balance.usedDays || 0} days</p>
										</div>
										<div>
											<span class="font-medium">Remaining:</span>
											<p class="text-muted-foreground">{balance.remainingDays || 0} days</p>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
					</Card>
				</TabsContent>

				<!-- Leave Requests Tab -->
				<TabsContent value="requests" class="space-y-4">
					<!-- Filters for Requests -->
					<Card class="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border border-white/40 dark:border-slate-600/40 rounded-lg">
						<CardHeader>
							<CardTitle>Filter Leave Requests</CardTitle>
						</CardHeader>
				<CardContent>
					<div class="flex gap-4">
						<select 
							class="px-3 py-2 border border-input rounded-md bg-background text-foreground"
							bind:value={statusFilter}
						>
							<option value="all">All Statuses</option>
							<option value="Pending">Pending</option>
							<option value="Approved">Approved</option>
							<option value="Denied">Denied</option>
						</select>
						
						<Button variant="outline" onclick={clearFilters}>
							Clear Filters
						</Button>
					</div>
				</CardContent>
			</Card>

					<!-- Leave Requests List -->
					<Card class="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border border-white/40 dark:border-slate-600/40 rounded-lg">
						<CardHeader>
							<CardTitle>Leave Requests</CardTitle>
							<CardDescription>
								Review and manage employee leave requests
							</CardDescription>
						</CardHeader>
				<CardContent>
					{#if loading}
						<div class="flex items-center justify-center py-8">
							<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
						</div>
					{:else if error}
						<div class="text-center py-8">
							<p class="text-destructive">{error}</p>
							<Button variant="outline" class="mt-4" onclick={() => window.location.reload()}>
								Retry
							</Button>
						</div>
					{:else if leaveRequests.length === 0}
						<div class="text-center py-8">
							<Calendar class="mx-auto h-12 w-12 text-muted-foreground/50" />
							<h3 class="mt-4 text-lg font-semibold">No leave requests found</h3>
							<p class="mt-2 text-muted-foreground">
								{statusFilter !== 'all' 
									? 'No requests match the selected status'
									: 'No leave requests have been submitted'}
							</p>
						</div>
					{:else}
						<div class="space-y-4">
							{#each leaveRequests as request}
								{@const StatusIcon = getStatusIcon(request.status)}
								{@const daysCount = getDaysRange(request.startDate, request.endDate)}
								
								<div class="border border-border/50 rounded-lg p-4">
									<div class="flex items-start justify-between">
										<div class="flex items-start space-x-4 flex-1">
											<div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
												<span class="text-sm font-medium text-primary">
													{request.employee?.firstName?.[0] || ''}{request.employee?.lastName?.[0] || ''}
												</span>
											</div>
											<div class="flex-1 min-w-0">
												<div class="flex items-center space-x-2 mb-1">
													<h3 class="font-medium text-foreground">
														{request.employee?.firstName} {request.employee?.lastName}
													</h3>
													<div class="flex items-center space-x-1">
														<StatusIcon class="h-4 w-4" />
														<Badge variant={getStatusVariant(request.status)}>
															{request.status}
														</Badge>
													</div>
												</div>
												
												<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-2">
													<div>
														<span class="font-medium">Leave Type:</span>
														<p class="text-muted-foreground">{request.leaveBalance?.leaveType || 'Unknown'}</p>
													</div>
													<div>
														<span class="font-medium">Duration:</span>
														<p class="text-muted-foreground">
															{formatDate(request.startDate)} - {formatDate(request.endDate)}
														</p>
													</div>
													<div>
														<span class="font-medium">Days:</span>
														<p class="text-muted-foreground">{daysCount} days</p>
													</div>
												</div>

												{#if request.reason}
													<div class="mt-3">
														<span class="font-medium text-sm">Reason:</span>
														<p class="text-sm text-muted-foreground mt-1">{request.reason}</p>
													</div>
												{/if}

												{#if request.approvedAt && request.approver}
													<div class="mt-3 text-sm">
														<span class="font-medium">Approved by:</span>
														<span class="text-muted-foreground ml-1">
															{request.approver.firstName} {request.approver.lastName}
														</span>
														<span class="text-muted-foreground ml-2">
															on {formatDate(request.approvedAt)}
														</span>
													</div>
												{/if}
											</div>
										</div>

										{#if request.status === 'Pending'}
											<div class="flex items-center space-x-2 ml-4">
												<Button 
													size="sm" 
													onclick={() => handleRequestAction(request.id, 'approve')}
												>
													Approve
												</Button>
												<Button 
													variant="outline" 
													size="sm"
													onclick={() => handleRequestAction(request.id, 'deny')}
												>
													Deny
												</Button>
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</CardContent>
	</Card>

	<!-- Fixed position add button in bottom right corner -->
	<div class="fixed bottom-6 right-6 z-50">
		<Button class="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200">
			<Plus class="h-5 w-5" />
		</Button>
	</div>
</div>