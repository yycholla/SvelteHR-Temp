<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import Avatar from '$lib/components/ui/avatar/avatar.svelte';
	import AvatarFallback from '$lib/components/ui/avatar/avatar-fallback.svelte';
	import {
		Search,
		Filter,
		Plus,
		CheckCircle,
		XCircle,
		Clock,
		Calendar,
		User,
		FileText,
		MoreVertical,
		Plane,
		CalendarDays,
		TrendingUp,
		Users,
		AlertCircle
	} from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Form state
	let searchQuery = $state(data.filters.search || '');
	let statusFilter = $state(data.filters.status || '');
	let typeFilter = $state(data.filters.type || '');

	// Filter options
	const statusOptions = [
		{ value: '', label: 'All Status' },
		{ value: 'pending', label: 'Pending Approval' },
		{ value: 'approved', label: 'Approved' },
		{ value: 'rejected', label: 'Rejected' },
		{ value: 'cancelled', label: 'Cancelled' }
	];

	// Dynamic leave type options from API
	const typeOptions = $derived([
		{ value: '', label: 'All Leave Types' },
		...data.leaveTypes.map((type) => ({
			value: type.name.toLowerCase().replace(/\s+/g, '_'),
			label: type.name
		}))
	]);

	// Apply filters
	function applyFilters() {
		const params = new URLSearchParams();
		if (searchQuery.trim()) params.append('search', searchQuery);
		if (statusFilter) params.append('status', statusFilter);
		if (typeFilter) params.append('type', typeFilter);

		const query = params.toString();
		goto(`/leave${query ? '?' + query : ''}`, { replaceState: true });
	}

	// Clear filters
	function clearFilters() {
		searchQuery = '';
		statusFilter = '';
		typeFilter = '';
		goto('/leave', { replaceState: true });
	}

	// Get status badge variant
	function getStatusBadge(status: string) {
		switch (status.toLowerCase()) {
			case 'approved':
				return { variant: 'success', label: 'Approved', icon: CheckCircle };
			case 'rejected':
				return { variant: 'destructive', label: 'Rejected', icon: XCircle };
			case 'pending':
				return { variant: 'warning', label: 'Pending', icon: Clock };
			case 'cancelled':
				return { variant: 'default', label: 'Cancelled', icon: XCircle };
			default:
				return { variant: 'default', label: status, icon: Clock };
		}
	}

	// Format date
	function formatDate(dateString: string) {
		if (!dateString) return 'N/A';
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString();
		} catch {
			return 'Invalid date';
		}
	}

	// Calculate date range
	function formatDateRange(startDate: string, endDate: string) {
		if (!startDate || !endDate) return 'Invalid range';
		try {
			const start = new Date(startDate);
			const end = new Date(endDate);
			if (start.toDateString() === end.toDateString()) {
				return start.toLocaleDateString();
			}
			return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
		} catch {
			return 'Invalid range';
		}
	}

	// Get initials for avatar
	function getInitials(name: string) {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	// Calculate leave usage percentage
	const leaveUsagePercentage = $derived(() => {
		const total = data.stats.myAvailableLeave + data.stats.myUsedLeave;
		if (total === 0) return 0;
		return Math.round((data.stats.myUsedLeave / total) * 100);
	});
</script>

<div class="container mx-auto max-w-7xl space-y-6 px-6 pt-6 pb-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1
				class="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-3xl font-bold text-transparent"
			>
				Leave Management
			</h1>
			<p class="mt-2 text-muted-foreground">
				Manage leave requests and track time off for your team
			</p>
		</div>
		<Button class="rounded-xl transition-all duration-200 hover:scale-[1.02]">
			<Plus class="mr-2 h-4 w-4" />
			Request Leave
		</Button>
	</div>

	<!-- Personal Leave Overview -->
	<Card class="rounded-2xl border border-border bg-white shadow-lg">
		<CardHeader>
			<CardTitle class="flex items-center">
				<User class="mr-2 h-5 w-5 text-primary" />
				Your Leave Summary
			</CardTitle>
			<CardDescription>Track your personal leave balance and usage</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-4">
				<div class="space-y-2">
					<p class="text-sm font-medium text-muted-foreground">Available Leave</p>
					<p class="text-2xl font-bold text-primary">{data.stats.myAvailableLeave} days</p>
				</div>
				<div class="space-y-2">
					<p class="text-sm font-medium text-muted-foreground">Used Leave</p>
					<p class="text-2xl font-bold text-orange-600">{data.stats.myUsedLeave} days</p>
				</div>
				<div class="space-y-2">
					<p class="text-sm font-medium text-muted-foreground">Pending Requests</p>
					<p class="text-2xl font-bold text-yellow-600">{data.stats.myPendingRequests}</p>
				</div>
				<div class="space-y-4">
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium text-muted-foreground">Usage</span>
							<span class="text-sm font-bold text-primary">{leaveUsagePercentage()}%</span>
						</div>
						<Progress value={leaveUsagePercentage()} class="h-2" />
					</div>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Team Statistics -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-4">
		<Card
			class="rounded-2xl border border-border bg-white shadow-lg transition-all duration-200 hover:shadow-xl"
		>
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Total Requests</p>
						<p class="text-2xl font-bold text-foreground">{data.stats.totalRequests}</p>
					</div>
					<div class="rounded-full bg-primary/10 p-3">
						<FileText class="h-5 w-5 text-primary" />
					</div>
				</div>
			</CardContent>
		</Card>

		<Card
			class="rounded-2xl border border-border bg-white shadow-lg transition-all duration-200 hover:shadow-xl"
		>
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Approved</p>
						<p class="text-2xl font-bold text-green-600">{data.stats.approved}</p>
					</div>
					<div class="rounded-full bg-green-100 p-3">
						<CheckCircle class="h-5 w-5 text-green-600" />
					</div>
				</div>
			</CardContent>
		</Card>

		<Card
			class="rounded-2xl border border-border bg-white shadow-lg transition-all duration-200 hover:shadow-xl"
		>
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Pending</p>
						<p class="text-2xl font-bold text-yellow-600">{data.stats.pending}</p>
					</div>
					<div class="rounded-full bg-yellow-100 p-3">
						<Clock class="h-5 w-5 text-yellow-600" />
					</div>
				</div>
			</CardContent>
		</Card>

		<Card
			class="rounded-2xl border border-border bg-white shadow-lg transition-all duration-200 hover:shadow-xl"
		>
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Rejected</p>
						<p class="text-2xl font-bold text-red-600">{data.stats.rejected}</p>
					</div>
					<div class="rounded-full bg-red-100 p-3">
						<XCircle class="h-5 w-5 text-red-600" />
					</div>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Leave Types -->
	{#if data.leaveTypes.length > 0}
		<Card class="rounded-2xl border border-border bg-white shadow-lg">
			<CardHeader>
				<CardTitle class="flex items-center">
					<CalendarDays class="mr-2 h-5 w-5 text-primary" />
					Available Leave Types
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each data.leaveTypes as leaveType}
						<div
							class="rounded-xl border border-border p-4 transition-all duration-200 hover:bg-muted/30"
						>
							<div class="mb-2 flex items-start justify-between">
								<h3 class="font-semibold text-foreground">{leaveType.name}</h3>
								<Badge variant="outline" class="text-xs">
									{leaveType.maxDays} days max
								</Badge>
							</div>
							{#if leaveType.description}
								<p class="mb-2 text-sm text-muted-foreground">{leaveType.description}</p>
							{/if}
							<div class="flex items-center text-xs text-muted-foreground">
								{#if leaveType.requiresApproval}
									<AlertCircle class="mr-1 h-3 w-3" />
									<span>Requires approval</span>
								{:else}
									<CheckCircle class="mr-1 h-3 w-3" />
									<span>Auto-approved</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Filters -->
	<Card class="rounded-2xl border border-border bg-white shadow-lg">
		<CardHeader class="pb-4">
			<CardTitle class="flex items-center text-lg font-semibold">
				<Filter class="mr-2 h-5 w-5 text-primary" />
				Filters
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-5">
				<div class="space-y-2">
					<Label for="search">Search Requests</Label>
					<div class="relative">
						<Search class="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
						<Input
							id="search"
							bind:value={searchQuery}
							placeholder="Search by employee or reason..."
							class="rounded-xl pl-10"
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									applyFilters();
								}
							}}
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="status">Status</Label>
					<select
						id="status"
						bind:value={statusFilter}
						class="w-full rounded-xl border-border bg-background px-3 py-2 transition-all duration-200 focus:bg-background"
					>
						{#each statusOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<div class="space-y-2">
					<Label for="type">Leave Type</Label>
					<select
						id="type"
						bind:value={typeFilter}
						class="w-full rounded-xl border-border bg-background px-3 py-2 transition-all duration-200 focus:bg-background"
					>
						{#each typeOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<div class="col-span-2 flex items-end space-x-2">
					<Button onclick={applyFilters} class="flex-1 rounded-xl">Apply</Button>
					<Button variant="outline" onclick={clearFilters} class="rounded-xl">Clear</Button>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Leave Requests List -->
	<Card class="rounded-2xl border border-border bg-white shadow-lg">
		<CardHeader>
			<CardTitle>Leave Requests ({data.leaveRequests.length})</CardTitle>
		</CardHeader>
		<CardContent>
			{#if data.leaveRequests.length === 0}
				<div class="py-12 text-center">
					<Plane class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
					<h3 class="mb-2 text-lg font-semibold text-muted-foreground">No Leave Requests Found</h3>
					<p class="text-muted-foreground">
						{data.isUsingMockData
							? 'Connect to your API to see real leave requests.'
							: 'No requests match your current filters.'}
					</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each data.leaveRequests as request}
						{@const statusBadge = getStatusBadge(request.status)}
						{@const StatusIcon = statusBadge.icon}

						<div
							class="rounded-xl border border-border p-4 transition-all duration-200 hover:bg-muted/30"
						>
							<div class="flex items-start justify-between">
								<div class="flex-1 space-y-3">
									<div class="flex items-center space-x-3">
										<h3 class="font-semibold text-foreground">
											{request.employeeName}
										</h3>
										<Badge variant={statusBadge.variant} class="text-xs">
											<StatusIcon class="mr-1 h-3 w-3" />
											{statusBadge.label}
										</Badge>
										<Badge variant="outline" class="text-xs">
											<CalendarDays class="mr-1 h-3 w-3" />
											{request.leaveType}
										</Badge>
										<Badge variant="secondary" class="text-xs">
											{request.days}
											{request.days === 1 ? 'day' : 'days'}
										</Badge>
									</div>

									<div class="flex items-center space-x-6 text-sm text-muted-foreground">
										<div class="flex items-center space-x-1">
											<Calendar class="h-4 w-4" />
											<span>{formatDateRange(request.startDate, request.endDate)}</span>
										</div>
										<div class="flex items-center space-x-1">
											<FileText class="h-4 w-4" />
											<span>Applied: {formatDate(request.appliedDate)}</span>
										</div>
										{#if request.approvedDate}
											<div class="flex items-center space-x-1">
												<CheckCircle class="h-4 w-4" />
												<span>Approved: {formatDate(request.approvedDate)}</span>
											</div>
										{/if}
									</div>

									{#if request.reason}
										<div class="rounded-lg bg-muted/50 p-3">
											<p class="text-sm text-foreground">
												<strong>Reason:</strong>
												{request.reason}
											</p>
										</div>
									{/if}

									{#if request.comments}
										<div class="rounded-lg bg-muted/50 p-3">
											<p class="text-sm text-foreground">
												<strong>Comments:</strong>
												{request.comments}
											</p>
										</div>
									{/if}

									{#if request.approvedByName && request.approvedByName !== 'N/A'}
										<div class="flex items-center space-x-2 text-xs text-muted-foreground">
											<User class="h-3 w-3" />
											<span>Approved by: {request.approvedByName}</span>
										</div>
									{/if}
								</div>

								<div class="flex items-center space-x-2">
									<Avatar size="sm">
										<AvatarFallback class="bg-primary/10 text-xs text-primary">
											{getInitials(request.employeeName)}
										</AvatarFallback>
									</Avatar>
									<Button variant="ghost" size="sm" class="h-8 w-8 p-0">
										<MoreVertical class="h-4 w-4" />
									</Button>
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Pagination -->
				{#if data.totalPages > 1}
					<div class="mt-6 flex items-center justify-between">
						<p class="text-sm text-muted-foreground">
							Showing {(data.page - 1) * data.limit + 1} to {Math.min(
								data.page * data.limit,
								data.totalCount
							)} of {data.totalCount} requests
						</p>
						<div class="flex items-center space-x-2">
							<Button
								variant="outline"
								size="sm"
								disabled={data.page <= 1}
								onclick={() => goto(`/leave?page=${data.page - 1}`)}
								class="rounded-lg"
							>
								Previous
							</Button>
							<span class="text-sm font-medium">
								Page {data.page} of {data.totalPages}
							</span>
							<Button
								variant="outline"
								size="sm"
								disabled={!data.hasMore}
								onclick={() => goto(`/leave?page=${data.page + 1}`)}
								class="rounded-lg"
							>
								Next
							</Button>
						</div>
					</div>
				{/if}
			{/if}
		</CardContent>
	</Card>
</div>
