<script lang="ts">
	// Audit Logs Page - Modern UI
	// Feature: Comprehensive activity tracking with modern design
	// Follows design patterns from employees and tasks pages

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as NativeSelect from '$lib/components/ui/native-select';
	import * as Field from '$lib/components/ui/field';
	import * as Table from '$lib/components/ui/table';
	import {
		Search,
		FileText,
		CheckCircle2,
		Edit3,
		Trash2,
		RotateCcw,
		Eye,
		Download,
		RefreshCw,
		User,
		Database,
		Shield,
		Upload,
		UserPlus,
		UserMinus,
		ThumbsUp,
		ThumbsDown,
		Play
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Local filter state
	let searchQuery = $state(data.filters.searchTerm);
	let selectedAction = $state(data.filters.action);
	let selectedResourceType = $state(data.filters.resourceType);
	let selectedUser = $state(data.filters.userId || '');

	// Statistics cards configuration - All Rust backend action types
	let statsCards = $derived([
		{
			label: 'Total Logs',
			value: data.stats.total,
			icon: FileText,
			color: 'text-primary',
			bgColor: 'bg-primary/10'
		},
		{
			label: 'Creates',
			value: data.stats.creates,
			icon: CheckCircle2,
			color: 'text-green-600',
			bgColor: 'bg-green-100 dark:bg-green-900/30'
		},
		{
			label: 'Updates',
			value: data.stats.updates,
			icon: Edit3,
			color: 'text-blue-600',
			bgColor: 'bg-blue-100 dark:bg-blue-900/30'
		},
		{
			label: 'Deletes',
			value: data.stats.deletes,
			icon: Trash2,
			color: 'text-red-600',
			bgColor: 'bg-red-100 dark:bg-red-900/30'
		},
		{
			label: 'Uploads',
			value: data.stats.uploads,
			icon: Upload,
			color: 'text-purple-600',
			bgColor: 'bg-purple-100 dark:bg-purple-900/30'
		},
		{
			label: 'Assigns',
			value: data.stats.assigns,
			icon: UserPlus,
			color: 'text-cyan-600',
			bgColor: 'bg-cyan-100 dark:bg-cyan-900/30'
		},
		{
			label: 'Unassigns',
			value: data.stats.unassigns,
			icon: UserMinus,
			color: 'text-orange-600',
			bgColor: 'bg-orange-100 dark:bg-orange-900/30'
		},
		{
			label: 'Approves',
			value: data.stats.approves,
			icon: ThumbsUp,
			color: 'text-emerald-600',
			bgColor: 'bg-emerald-100 dark:bg-emerald-900/30'
		},
		{
			label: 'Rejects',
			value: data.stats.rejects,
			icon: ThumbsDown,
			color: 'text-rose-600',
			bgColor: 'bg-rose-100 dark:bg-rose-900/30'
		},
		{
			label: 'Executes',
			value: data.stats.executes,
			icon: Play,
			color: 'text-slate-600',
			bgColor: 'bg-slate-100 dark:bg-slate-900/30'
		},
		{
			label: 'Rollbacks',
			value: data.stats.rollbacks,
			icon: RotateCcw,
			color: 'text-amber-600',
			bgColor: 'bg-amber-100 dark:bg-amber-900/30'
		}
	]);

	// Debounce timer for URL updates
	let urlUpdateTimer: any = null;

	// Update URL with filters
	function updateURL() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (selectedAction) params.set('action', selectedAction);
		if (selectedResourceType) params.set('resourceType', selectedResourceType);
		if (selectedUser) params.set('userId', selectedUser);
		params.set('page', '1'); // Reset to page 1 when filters change

		const queryString = params.toString();
		const newUrl = queryString ? `?${queryString}` : '/dashboard/activities/logs';
		window.history.replaceState({}, '', newUrl);
		goto(newUrl);
	}

	// Handle search input with debounce
	function handleSearchInput(e: Event) {
		searchQuery = (e.target as HTMLInputElement).value;

		if (urlUpdateTimer) clearTimeout(urlUpdateTimer);

		urlUpdateTimer = setTimeout(() => {
			updateURL();
		}, 500);
	}

	// Handle filter changes
	function handleFilterChange() {
		updateURL();
	}

	// Clear all filters
	function clearFilters() {
		searchQuery = '';
		selectedAction = '';
		selectedResourceType = '';
		selectedUser = '';
		goto('/dashboard/activities/logs');
	}

	// Navigate to log detail page
	function handleLogClick(logId: string) {
		goto(`/dashboard/activities/logs/${logId}`);
	}

	// Export logs to CSV
	async function exportLogs() {
		const headers = ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'IP Address'];
		const rows = data.logs.map((log) => [
			new Date(log.createdAt).toLocaleString(),
			log.user?.displayName || log.user?.email || 'Unknown',
			log.action,
			log.resourceType,
			log.resourceId || 'N/A',
			log.ipAddress || 'N/A'
		]);

		const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

		const blob = new Blob([csv], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
	}

	// Get badge variant for action type (matching Rust backend action types)
	function getActionBadge(action: string): { variant: string; class: string } {
		switch (action) {
			case 'CREATE':
				return {
					variant: 'default',
					class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
				};
			case 'UPDATE':
				return {
					variant: 'default',
					class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
				};
			case 'DELETE':
				return {
					variant: 'default',
					class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
				};
			case 'UPLOAD':
				return {
					variant: 'default',
					class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
				};
			case 'ASSIGN':
				return {
					variant: 'default',
					class: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300'
				};
			case 'UNASSIGN':
				return {
					variant: 'default',
					class: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
				};
			case 'APPROVE':
				return {
					variant: 'default',
					class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
				};
			case 'REJECT':
				return {
					variant: 'default',
					class: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
				};
			case 'EXECUTE':
				return {
					variant: 'default',
					class: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300'
				};
			default:
				return {
					variant: 'secondary',
					class: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
				};
		}
	}

	// Format JSON data for display
	function formatJSON(data: any): string {
		if (!data) return '—';
		if (typeof data === 'string') {
			try {
				data = JSON.parse(data);
			} catch {
				return data;
			}
		}
		return JSON.stringify(data, null, 2).substring(0, 100) + '...';
	}

	// Pagination helper
	function changePage(newPage: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', newPage.toString());
		goto(`/dashboard/activities/logs?${params.toString()}`);
	}
</script>

<svelte:head>
	<title>Audit Logs - MountainHR</title>
	<meta name="description" content="View comprehensive system activity logs" />
</svelte:head>

<div class="space-y-6" data-testid="audit-logs-page">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Audit Logs</h1>
			<p class="text-muted-foreground">Comprehensive activity tracking and audit trail</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" size="sm" onclick={() => window.location.reload()}>
				<RefreshCw class="mr-2 h-4 w-4" />
				Refresh
			</Button>
			<Button size="sm" onclick={exportLogs}>
				<Download class="mr-2 h-4 w-4" />
				Export CSV
			</Button>
		</div>
	</div>

	<!-- Statistics Cards - 11 action types total -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
		{#each statsCards as stat}
			{@const Icon = stat.icon}
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between pb-2">
					<Card.Title class="text-sm font-medium text-muted-foreground">
						{stat.label}
					</Card.Title>
					<div class="flex h-8 w-8 items-center justify-center rounded-full {stat.bgColor}">
						<Icon class="h-4 w-4 {stat.color}" />
					</div>
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{stat.value}</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<!-- Filters Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Filter Audit Logs</Card.Title>
			<Card.Description
				>Search and filter activity logs by action, resource, user, and more</Card.Description
			>
		</Card.Header>
		<Card.Content>
			<Field.Group>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					<!-- Search -->
					<Field.Field>
						<Field.Label>Search</Field.Label>
						<div class="relative">
							<Search
								class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
							/>
							<Input
								type="text"
								placeholder="Search logs..."
								value={searchQuery}
								oninput={handleSearchInput}
								class="pl-9"
							/>
						</div>
					</Field.Field>

					<!-- Action Filter -->
					<Field.Field>
						<Field.Label>Action</Field.Label>
						<NativeSelect.Root
							value={selectedAction}
							onchange={(e) => {
								selectedAction = e.currentTarget.value;
								handleFilterChange();
							}}
						>
							<NativeSelect.Option value="">All Actions</NativeSelect.Option>
							{#each data.uniqueActions as action}
								<NativeSelect.Option value={action}>{action}</NativeSelect.Option>
							{/each}
						</NativeSelect.Root>
					</Field.Field>

					<!-- Resource Type Filter -->
					<Field.Field>
						<Field.Label>Resource Type</Field.Label>
						<NativeSelect.Root
							value={selectedResourceType}
							onchange={(e) => {
								selectedResourceType = e.currentTarget.value;
								handleFilterChange();
							}}
						>
							<NativeSelect.Option value="">All Resources</NativeSelect.Option>
							{#each data.uniqueResourceTypes as resourceType}
								<NativeSelect.Option value={resourceType}>{resourceType}</NativeSelect.Option>
							{/each}
						</NativeSelect.Root>
					</Field.Field>

					<!-- User Filter -->
					<Field.Field>
						<Field.Label>User</Field.Label>
						<NativeSelect.Root
							value={selectedUser}
							onchange={(e) => {
								selectedUser = e.currentTarget.value;
								handleFilterChange();
							}}
						>
							<NativeSelect.Option value="">All Users</NativeSelect.Option>
							{#each data.uniqueUsers as user}
								<NativeSelect.Option value={user.id}
									>{user.displayName || user.email}</NativeSelect.Option
								>
							{/each}
						</NativeSelect.Root>
					</Field.Field>
				</div>

				<!-- Clear Filters Button -->
				{#if searchQuery || selectedAction || selectedResourceType || selectedUser}
					<div class="mt-4">
						<Button variant="outline" size="sm" onclick={clearFilters}>Clear Filters</Button>
					</div>
				{/if}
			</Field.Group>
		</Card.Content>
	</Card.Root>

	<!-- Audit Logs Table -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Activity Logs</Card.Title>
			<Card.Description>
				Showing {data.logs.length} grouped resources ({data.totalLogs} total logs)
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.logs.length > 0}
				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Timestamp</Table.Head>
								<Table.Head>User</Table.Head>
								<Table.Head>Action</Table.Head>
								<Table.Head>Resource</Table.Head>
								<Table.Head>Details</Table.Head>
								<Table.Head>IP Address</Table.Head>
								<Table.Head class="text-right">Actions</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.logs as log}
								<Table.Row
									class="cursor-pointer hover:bg-muted/50"
									onclick={() => handleLogClick(log.id)}
								>
									<Table.Cell class="text-xs text-muted-foreground">
										{new Date(log.createdAt).toLocaleString()}
									</Table.Cell>
									<Table.Cell>
										<div class="flex items-center gap-2">
											<div
												class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10"
											>
												<User class="h-4 w-4 text-primary" />
											</div>
											<div>
												<p class="text-sm font-medium">{log.user?.displayName || 'Unknown'}</p>
												<p class="text-xs text-muted-foreground">{log.user?.email || '—'}</p>
											</div>
										</div>
									</Table.Cell>
									<Table.Cell>
										{@const badgeInfo = getActionBadge(log.action)}
										<div class="flex flex-wrap items-center gap-1">
											<Badge variant="secondary" class={badgeInfo.class}>
												{log.action}
											</Badge>
											{#if log.isRollback}
												<Badge
													variant="outline"
													class="bg-amber-100 text-amber-700 dark:bg-amber-900/30"
												>
													<RotateCcw class="mr-1 h-3 w-3" />
													Rollback
												</Badge>
											{/if}
											{#if log.totalEdits > 1}
												<Badge
													variant="outline"
													class="bg-blue-100 text-xs text-blue-700 dark:bg-blue-900/30"
												>
													{log.totalEdits} edits
												</Badge>
											{/if}
										</div>
									</Table.Cell>
									<Table.Cell>
										<div class="flex items-center gap-2">
											<Database class="h-4 w-4 text-muted-foreground" />
											<div>
												<p class="text-sm font-medium">{log.resourceType}</p>
												<p class="font-mono text-xs text-muted-foreground">
													{log.resourceId ? log.resourceId.substring(0, 8) + '...' : 'N/A'}
												</p>
											</div>
										</div>
									</Table.Cell>
									<Table.Cell class="max-w-xs">
										<div
											class="truncate text-xs text-muted-foreground"
											title={formatJSON(log.details)}
										>
											{formatJSON(log.details)}
										</div>
									</Table.Cell>
									<Table.Cell class="font-mono text-xs">{log.ipAddress || '—'}</Table.Cell>
									<Table.Cell class="text-right">
										<Button variant="ghost" size="sm" onclick={() => handleLogClick(log.id)}>
											<Eye class="h-4 w-4" />
										</Button>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{:else}
				<div class="flex flex-col items-center justify-center py-12">
					<Shield class="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
					<h3 class="mb-2 text-lg font-medium">No audit logs found</h3>
					<p class="mb-4 text-sm text-muted-foreground">
						{#if searchQuery || selectedAction || selectedResourceType || selectedUser}
							Try adjusting your filters to see more results
						{:else}
							No activity has been logged yet
						{/if}
					</p>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Pagination -->
	{#if data.pagination.totalPages > 1}
		<Card.Root>
			<Card.Content class="py-4">
				<div class="flex items-center justify-between">
					<p class="text-sm text-muted-foreground">
						Page {data.pagination.page} of {data.pagination.totalPages}
					</p>
					<div class="flex gap-2">
						{#if data.pagination.hasPreviousPage}
							<Button
								variant="outline"
								size="sm"
								onclick={() => changePage(data.pagination.page - 1)}
							>
								Previous
							</Button>
						{/if}
						{#if data.pagination.hasNextPage}
							<Button
								variant="outline"
								size="sm"
								onclick={() => changePage(data.pagination.page + 1)}
							>
								Next
							</Button>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
