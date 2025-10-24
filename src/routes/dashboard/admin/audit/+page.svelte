<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Search, Filter, FileText, Download, Calendar } from '@lucide/svelte';

	let { data } = $props();

	let searchQuery = $state('');
	let filters = $state({
		action: data.filters.action,
		user: data.filters.user,
		dateFrom: data.filters.dateFrom,
		dateTo: data.filters.dateTo
	});

	// Filtered logs based on search query
	let filteredLogs = $derived(data.auditLogs.filter((log) => {
		if (!searchQuery) return true;
		const query = searchQuery.toLowerCase();
		return (
			log.action?.toLowerCase().includes(query) ||
			log.resourceType?.toLowerCase().includes(query) ||
			log.userByUserId?.email?.toLowerCase().includes(query) ||
			log.ipAddress?.includes(query)
		);
	}));

	function applyFilters() {
		const params = new URLSearchParams($page.url.searchParams);
		if (filters.action) params.set('action', filters.action);
		else params.delete('action');
		if (filters.user) params.set('user', filters.user);
		else params.delete('user');
		if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
		else params.delete('dateFrom');
		if (filters.dateTo) params.set('dateTo', filters.dateTo);
		else params.delete('dateTo');
		goto(`${$page.url.pathname}?${params.toString()}`);
	}

	function clearFilters() {
		filters = { action: '', user: '', dateFrom: '', dateTo: '' };
		goto($page.url.pathname);
	}

	function exportLogs() {
		// Convert logs to CSV format
		const headers = ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'IP Address'];
		const rows = filteredLogs.map((log) => [
			new Date(log.createdAt).toLocaleString(),
			log.userByUserId?.email || 'Unknown',
			log.action,
			log.resourceType,
			log.resourceId,
			log.ipAddress
		]);

		const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

		// Create download link
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
	}

	function formatChanges(changes: any): string {
		if (!changes) return '—';
		if (typeof changes === 'string') {
			try {
				changes = JSON.parse(changes);
			} catch {
				return changes;
			}
		}
		return Object.entries(changes)
			.map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
			.join(', ');
	}

	function getActionBadgeColor(action: string): string {
		if (action.includes('CREATE')) return 'bg-green-100 text-green-700';
		if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-700';
		if (action.includes('DELETE')) return 'bg-red-100 text-red-700';
		return 'bg-gray-100 text-gray-700';
	}
</script>

<div class="space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Audit Logs</h1>
			<p class="text-muted-foreground">View all system activity and changes</p>
		</div>
		<button
			onclick={exportLogs}
			class="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
		>
			<Download class="h-4 w-4" />
			Export CSV
		</button>
	</div>

	<!-- Error message -->
	{#if data.error}
		<div class="rounded-md bg-destructive/10 p-4 text-destructive">
			{data.error}
		</div>
	{/if}

	<!-- Search and Filters -->
	<div class="flex flex-col gap-4 lg:flex-row">
		<!-- Search -->
		<div class="relative flex-1">
			<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search logs by action, user, resource, or IP..."
				class="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
			/>
		</div>

		<!-- Filters -->
		<div class="flex flex-wrap gap-2">
			<select
				bind:value={filters.action}
				onchange={applyFilters}
				class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
			>
				<option value="">All Actions</option>
				{#each data.uniqueActions as action}
					<option value={action}>{action}</option>
				{/each}
			</select>

			<input
				type="text"
				bind:value={filters.user}
				onblur={applyFilters}
				placeholder="Filter by user"
				class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
			/>

			<div class="flex items-center gap-2">
				<Calendar class="h-4 w-4 text-muted-foreground" />
				<input
					type="date"
					bind:value={filters.dateFrom}
					onchange={applyFilters}
					class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
				/>
				<span class="text-sm text-muted-foreground">to</span>
				<input
					type="date"
					bind:value={filters.dateTo}
					onchange={applyFilters}
					class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
				/>
			</div>

			{#if filters.action || filters.user || filters.dateFrom || filters.dateTo}
				<button
					onclick={clearFilters}
					class="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
				>
					Clear
				</button>
			{/if}
		</div>
	</div>

	<!-- Audit Logs Table -->
	<div class="overflow-x-auto rounded-md border">
		<table class="w-full text-sm">
			<thead class="border-b bg-muted/50">
				<tr>
					<th class="px-4 py-3 text-left font-medium">Timestamp</th>
					<th class="px-4 py-3 text-left font-medium">User</th>
					<th class="px-4 py-3 text-left font-medium">Action</th>
					<th class="px-4 py-3 text-left font-medium">Resource</th>
					<th class="px-4 py-3 text-left font-medium">Changes</th>
					<th class="px-4 py-3 text-left font-medium">IP Address</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredLogs as log (log.id)}
					<tr class="border-b hover:bg-muted/50">
						<td class="px-4 py-3 text-xs text-muted-foreground">
							{new Date(log.createdAt).toLocaleString()}
						</td>
						<td class="px-4 py-3">
							<div>
								<p class="font-medium">{log.userByUserId?.displayName || 'Unknown'}</p>
								<p class="text-xs text-muted-foreground">{log.userByUserId?.email || '—'}</p>
							</div>
						</td>
						<td class="px-4 py-3">
							<span class="rounded-full px-2 py-1 text-xs font-medium {getActionBadgeColor(log.action)}">
								{log.action}
							</span>
						</td>
						<td class="px-4 py-3">
							<div>
								<p class="font-medium">{log.resourceType}</p>
								<p class="text-xs text-muted-foreground">ID: {log.resourceId}</p>
							</div>
						</td>
						<td class="px-4 py-3 max-w-xs truncate" title={formatChanges(log.changes)}>
							{formatChanges(log.changes)}
						</td>
						<td class="px-4 py-3 text-xs font-mono">{log.ipAddress || '—'}</td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="px-4 py-8 text-center text-muted-foreground">
							No audit logs found
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	{#if data.pagination.totalPages > 1}
		<div class="flex items-center justify-between">
			<p class="text-sm text-muted-foreground">
				Page {data.pagination.page} of {data.pagination.totalPages} ({data.totalCount} total logs)
			</p>
			<div class="flex gap-2">
				{#if data.pagination.page > 1}
					<a
						href="?page={data.pagination.page - 1}"
						class="rounded-md border px-3 py-2 text-sm hover:bg-accent"
					>
						Previous
					</a>
				{/if}
				{#if data.pagination.page < data.pagination.totalPages}
					<a
						href="?page={data.pagination.page + 1}"
						class="rounded-md border px-3 py-2 text-sm hover:bg-accent"
					>
						Next
					</a>
				{/if}
			</div>
		</div>
	{/if}
</div>
