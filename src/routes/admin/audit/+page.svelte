<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Calendar, Download, FileText, Filter, Search } from '@lucide/svelte';

	const { data } = $props();

	let searchQuery = $state('');
	let filters = $state({
		action: data.filters.action,
		user: data.filters.user,
		dateFrom: data.filters.dateFrom,
		dateTo: data.filters.dateTo
	});

	// Filtered logs based on search query
	const filteredLogs = $derived(
		data.auditLogs.filter(
			(log: {
				action?: string;
				resourceType?: string;
				userByUserId?: { email?: string };
				ipAddress?: string;
			}) => {
				if (!searchQuery) return true;
				const query = searchQuery.toLowerCase();
				return (
					log.action?.toLowerCase().includes(query) ||
					log.resourceType?.toLowerCase().includes(query) ||
					log.userByUserId?.email?.toLowerCase().includes(query) ||
					log.ipAddress?.includes(query)
				);
			}
		)
	);

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
		const rows = filteredLogs.map(
			(log: {
				createdAt: string | Date;
				userByUserId?: { email?: string };
				action: string;
				resourceType: string;
				resourceId: string;
				ipAddress?: string;
			}) => [
				new Date(log.createdAt).toLocaleString(),
				log.userByUserId?.email || 'Unknown',
				log.action,
				log.resourceType,
				log.resourceId,
				log.ipAddress || ''
			]
		);

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

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Toolbar -->
	<header
		class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20"
	>
		<div class="flex items-center gap-4 flex-1">
			<h1 class="text-sm font-semibold tracking-tight">Audit Logs</h1>
			<div class="h-4 w-px bg-border"></div>

			<!-- Search -->
			<div class="relative w-64">
				<Search
					class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
				/>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search logs..."
					class="w-full h-8 rounded-sm border border-input bg-background pl-8 pr-3 text-xs focus:border-primary focus:outline-none transition-colors"
				/>
			</div>
		</div>
		<button
			onclick={exportLogs}
			class="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors"
		>
			<Download class="h-3.5 w-3.5" />
			Export
		</button>
	</header>

	<!-- Filters Bar -->
	<div class="flex-shrink-0 p-2 border-b bg-muted/5 flex items-center gap-2 overflow-x-auto">
		<select
			bind:value={filters.action}
			onchange={applyFilters}
			class="h-8 rounded-sm border border-input bg-background px-2 text-xs focus:border-primary focus:outline-none min-w-[120px]"
		>
			<option value="">Action: All</option>
			{#each data.uniqueActions as action}
				<option value={action}>{action}</option>
			{/each}
		</select>

		<input
			type="text"
			bind:value={filters.user}
			onblur={applyFilters}
			placeholder="Filter by user..."
			class="h-8 rounded-sm border border-input bg-background px-2 text-xs focus:border-primary focus:outline-none min-w-[150px]"
		/>

		<div class="flex items-center gap-1 bg-background border border-input rounded-sm px-2 h-8">
			<Calendar class="h-3.5 w-3.5 text-muted-foreground" />
			<input
				type="date"
				bind:value={filters.dateFrom}
				onchange={applyFilters}
				class="bg-transparent text-xs focus:outline-none w-24"
			/>
			<span class="text-[10px] text-muted-foreground">-</span>
			<input
				type="date"
				bind:value={filters.dateTo}
				onchange={applyFilters}
				class="bg-transparent text-xs focus:outline-none w-24"
			/>
		</div>

		{#if filters.action || filters.user || filters.dateFrom || filters.dateTo}
			<button
				onclick={clearFilters}
				class="h-8 px-3 rounded-sm border border-input bg-muted/50 text-xs hover:bg-accent transition-colors ml-auto"
			>
				Clear Filters
			</button>
		{/if}
	</div>

	<!-- Error message -->
	{#if data.error}
		<div class="flex-shrink-0 p-4 pb-0">
			<div
				class="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20"
			>
				{data.error}
			</div>
		</div>
	{/if}

	<!-- Audit Logs Table -->
	<div class="flex-1 overflow-auto min-h-0 relative bg-background">
		<table class="w-full text-sm text-left border-collapse">
			<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
				<tr>
					<th
						class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-40"
						>Timestamp</th
					>
					<th
						class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-48"
						>User</th
					>
					<th
						class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-32"
						>Action</th
					>
					<th
						class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-48"
						>Resource</th
					>
					<th
						class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
						>Changes</th
					>
					<th
						class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right w-32"
						>IP Address</th
					>
				</tr>
			</thead>
			<tbody class="divide-y">
				{#each filteredLogs as log (log.id)}
					<tr
						class="hover:bg-muted/30 cursor-pointer transition-colors group"
						onclick={() => goto(`/admin/audit/${log.id}`)}
					>
						<td
							class="px-3 py-1.5 border-r last:border-r-0 text-xs text-muted-foreground whitespace-nowrap"
						>
							{new Date(log.createdAt).toLocaleString()}
						</td>
						<td class="px-3 py-1.5 border-r last:border-r-0">
							<div class="truncate max-w-[180px]">
								<span class="font-medium text-xs block"
									>{log.userByUserId?.displayName || 'Unknown'}</span
								>
								<span class="text-[10px] text-muted-foreground block truncate"
									>{log.userByUserId?.email || '—'}</span
								>
							</div>
						</td>
						<td class="px-3 py-1.5 border-r last:border-r-0">
							<span
								class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium {getActionBadgeColor(
									log.action
								)}"
							>
								{log.action}
							</span>
						</td>
						<td class="px-3 py-1.5 border-r last:border-r-0">
							<div class="truncate max-w-[180px]">
								<span class="font-medium text-xs block">{log.resourceType}</span>
								<span class="text-[10px] text-muted-foreground block font-mono"
									>{log.resourceId}</span
								>
							</div>
						</td>
						<td
							class="px-3 py-1.5 border-r last:border-r-0 text-xs truncate max-w-xs"
							title={formatChanges(log.changes)}
						>
							{formatChanges(log.changes)}
						</td>
						<td class="px-3 py-1.5 text-xs font-mono text-right text-muted-foreground">
							{log.ipAddress || '—'}
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="px-4 py-12 text-center text-muted-foreground text-xs">
							No audit logs found matching your criteria
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	{#if data.pagination.totalPages > 1}
		<footer
			class="flex-shrink-0 border-t bg-muted/20 px-3 py-1.5 flex items-center justify-between text-xs"
		>
			<div class="text-muted-foreground">
				Page {data.pagination.page} of {data.pagination.totalPages} ({data.totalCount} logs)
			</div>
			<div class="flex gap-1">
				<button
					disabled={data.pagination.page <= 1}
					onclick={() => goto(`?page=${data.pagination.page - 1}`)}
					class="px-2 py-0.5 rounded hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent"
				>
					Prev
				</button>
				<button
					disabled={data.pagination.page >= data.pagination.totalPages}
					onclick={() => goto(`?page=${data.pagination.page + 1}`)}
					class="px-2 py-0.5 rounded hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent"
				>
					Next
				</button>
			</div>
		</footer>
	{/if}
</div>
