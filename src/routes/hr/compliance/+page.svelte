<script lang="ts">
	import { goto } from '$app/navigation';
	import { Shield, AlertTriangle, CheckCircle, Clock, Users, FileCheck } from 'lucide-svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import type { PageData } from './$types';

	// Page data from server
	let { data }: { data: PageData } = $props();

	// Local filter states (initialized from server data)
	let statusFilter = $state(data.filters.status);
	let employeeFilter = $state('all');
	let itemTypeFilter = $state(data.filters.itemType);

	// Derived data from server
	const complianceItems = $derived(data.complianceItems || []);
	const serverStats = $derived(data.stats);
	const loading = $state(false);
	const error = $derived(data.error || '');

	// Calculate compliance statistics from items
	const complianceStats = $derived(() => {
		const items = complianceItems || [];
		const totalItems = items.length;
		const activeItems = items.filter(item => item.status === 'Active').length;
		const expiringSoon = items.filter(item => item.status === 'ExpiringSoon').length;
		const expired = items.filter(item => item.status === 'Expired').length;
		const complianceRate = totalItems > 0 ? Math.round((activeItems / totalItems) * 100) : 100;
		
		return {
			totalItems,
			activeItems,
			expiringSoon,
			expired,
			complianceRate
		};
	});

	// Apply filters by navigating to new URL with query parameters
	async function applyFilters() {
		const params = new URLSearchParams();
		
		if (statusFilter !== 'all') params.set('status', statusFilter);
		if (itemTypeFilter !== 'all') params.set('itemType', itemTypeFilter);
		
		const queryString = params.toString();
		const newUrl = queryString ? `/hr/compliance?${queryString}` : '/hr/compliance';
		
		await goto(newUrl);
	}

	function getStatusVariant(status: string) {
		switch (status) {
			case 'Active': return 'default';
			case 'ExpiringSoon': return 'secondary';
			case 'Expired': return 'destructive';
			case 'PendingReview': return 'outline';
			default: return 'outline';
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'Active': return CheckCircle;
			case 'ExpiringSoon': return Clock;
			case 'Expired': return AlertTriangle;
			case 'PendingReview': return FileCheck;
			default: return Shield;
		}
	}

	function formatDate(dateString: string | null) {
		if (!dateString) return 'No date';
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		}).format(new Date(dateString));
	}

	function clearFilters() {
		statusFilter = 'all';
		employeeFilter = 'all';
		itemTypeFilter = 'all';
		applyFilters();
	}

	// Apply filters when status or type filter changes
	$effect(() => {
		if (statusFilter !== data.filters.status || itemTypeFilter !== data.filters.itemType) {
			applyFilters();
		}
	});

	function getDaysUntilExpiration(dateString: string | Date) {
		const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
		const today = new Date();
		const diffTime = date.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays;
	}

	// Get compliance items grouped by status
	const complianceByStatus = $derived(() => {
		const items = complianceItems || [];
		const grouped = {
			active: items.filter(item => item.status === 'Active'),
			expiringSoon: items.filter(item => item.status === 'ExpiringSoon'),
			expired: items.filter(item => item.status === 'Expired'),
			pendingReview: items.filter(item => item.status === 'PendingReview')
		};
		return grouped;
	});
</script>

<div class="space-y-6">
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
		</div>
	{:else if error}
		<div class="text-center py-12">
			<p class="text-destructive">{error}</p>
			<Button variant="outline" class="mt-4" onclick={() => window.location.reload()}>
				Retry
			</Button>
		</div>
	{:else}
		<!-- Compliance Overview -->
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Items</CardTitle>
					<Shield class="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{complianceStats.totalItems}</div>
					<p class="text-xs text-muted-foreground">Compliance items tracked</p>
				</CardContent>
			</Card>

			<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Active</CardTitle>
					<CheckCircle class="h-4 w-4 text-green-600" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{complianceStats.activeItems}</div>
					<p class="text-xs text-muted-foreground">Currently compliant</p>
				</CardContent>
			</Card>

			<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Expiring Soon</CardTitle>
					<Clock class="h-4 w-4 text-yellow-600" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{complianceStats.expiringSoon}</div>
					<p class="text-xs text-muted-foreground">Require attention</p>
				</CardContent>
			</Card>

			<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Compliance Rate</CardTitle>
					<AlertTriangle class="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{complianceStats.complianceRate}%</div>
					<Progress value={complianceStats.complianceRate} class="mt-2" />
				</CardContent>
			</Card>
		</div>

		<!-- Compliance Status Sections -->
		{#if complianceByStatus.expiringSoon.length > 0}
			<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-yellow-200/50 dark:border-yellow-800/50 rounded-lg shadow-xl">
				<CardHeader>
					<div class="flex items-center space-x-2">
						<Clock class="h-5 w-5 text-yellow-600" />
						<CardTitle class="text-yellow-800 dark:text-yellow-200">Items Expiring Soon</CardTitle>
					</div>
					<CardDescription>
						Compliance items that require immediate attention
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-3">
						{#each complianceByStatus.expiringSoon as item}
							{@const daysUntil = getDaysUntilExpiration(item.expirationDate)}
							<div class="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
								<div class="flex-1">
									<div class="flex items-center space-x-3">
										<div class="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/40 rounded-full flex items-center justify-center">
											<span class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
												{item.employee.firstName[0]}{item.employee.lastName[0]}
											</span>
										</div>
										<div>
											<p class="font-medium text-yellow-900 dark:text-yellow-100">
												{item.employee.firstName} {item.employee.lastName}
											</p>
											<p class="text-sm text-yellow-700 dark:text-yellow-300">{item.itemType}</p>
										</div>
									</div>
								</div>
								<div class="text-right">
									<p class="text-sm font-medium text-yellow-900 dark:text-yellow-100">
										Expires in {daysUntil} days
									</p>
									<p class="text-xs text-yellow-700 dark:text-yellow-300">
										{formatDate(item.expirationDate)}
									</p>
								</div>
							</div>
						{/each}
					</div>
				</CardContent>
			</Card>
		{/if}

		{#if complianceByStatus.expired.length > 0}
			<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-red-200/50 dark:border-red-800/50 rounded-lg shadow-xl">
				<CardHeader>
					<div class="flex items-center space-x-2">
						<AlertTriangle class="h-5 w-5 text-red-600" />
						<CardTitle class="text-red-800 dark:text-red-200">Expired Items</CardTitle>
					</div>
					<CardDescription>
						Compliance items that have expired and need immediate action
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-3">
						{#each complianceByStatus.expired as item}
							<div class="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
								<div class="flex-1">
									<div class="flex items-center space-x-3">
										<div class="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
											<span class="text-sm font-medium text-red-800 dark:text-red-200">
												{item.employee.firstName[0]}{item.employee.lastName[0]}
											</span>
										</div>
										<div>
											<p class="font-medium text-red-900 dark:text-red-100">
												{item.employee.firstName} {item.employee.lastName}
											</p>
											<p class="text-sm text-red-700 dark:text-red-300">{item.itemType}</p>
										</div>
									</div>
								</div>
								<div class="text-right">
									<Badge variant="destructive">Expired</Badge>
									<p class="text-xs text-red-700 dark:text-red-300 mt-1">
										{formatDate(item.expirationDate)}
									</p>
								</div>
							</div>
						{/each}
					</div>
				</CardContent>
			</Card>
		{/if}

		<!-- All Compliance Items -->
		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader>
				<CardTitle>All Compliance Items</CardTitle>
				<CardDescription>
					Complete overview of all compliance tracking items
				</CardDescription>
			</CardHeader>
			<CardContent>
				{#if complianceItems.length === 0}
					<div class="text-center py-8">
						<Shield class="mx-auto h-12 w-12 text-muted-foreground/50" />
						<h3 class="mt-4 text-lg font-semibold">No compliance items</h3>
						<p class="mt-2 text-muted-foreground">
							Start tracking compliance by adding your first item.
						</p>
					</div>
				{:else}
					<div class="overflow-hidden rounded-md border">
						<table class="w-full">
							<thead class="bg-muted/50">
								<tr class="border-b">
									<th class="text-left p-4 font-medium">Employee</th>
									<th class="text-left p-4 font-medium">Item Type</th>
									<th class="text-left p-4 font-medium">Status</th>
									<th class="text-left p-4 font-medium">Expiration</th>
									<th class="text-left p-4 font-medium">Last Review</th>
									<th class="text-left p-4 font-medium">Notes</th>
								</tr>
							</thead>
							<tbody>
								{#each complianceItems as item}
									{@const StatusIcon = getStatusIcon(item.status)}
									{@const daysUntil = getDaysUntilExpiration(item.expirationDate)}
									<tr class="border-b hover:bg-muted/30 transition-colors">
										<td class="p-4">
											<div class="flex items-center space-x-3">
												<div class="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
													<span class="text-xs font-medium text-primary">
														{item.employee.firstName[0]}{item.employee.lastName[0]}
													</span>
												</div>
												<div>
													<p class="text-sm font-medium">{item.employee.firstName} {item.employee.lastName}</p>
												</div>
											</div>
										</td>
										<td class="p-4">
											<p class="text-sm">{item.itemType}</p>
										</td>
										<td class="p-4">
											<div class="flex items-center space-x-2">
												<StatusIcon class="h-4 w-4" />
												<Badge variant={getStatusVariant(item.status)}>
													{item.status}
												</Badge>
											</div>
										</td>
										<td class="p-4">
											<div>
												<p class="text-sm">{formatDate(item.expirationDate)}</p>
												{#if item.status !== 'Expired'}
													<p class="text-xs text-muted-foreground">
														{daysUntil > 0 ? `${daysUntil} days left` : 'Expired'}
													</p>
												{/if}
											</div>
										</td>
										<td class="p-4">
											<p class="text-sm">{formatDate(item.lastReviewDate)}</p>
										</td>
										<td class="p-4">
											<p class="text-sm text-muted-foreground truncate max-w-xs" title={item.notes}>
												{item.notes || 'No notes'}
											</p>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</CardContent>
		</Card>
	{/if}

	<!-- Fixed position add button in bottom right corner -->
	<div class="fixed bottom-6 right-6 z-50">
		<Button class="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200">
			<Shield class="h-5 w-5" />
		</Button>
	</div>
</div>