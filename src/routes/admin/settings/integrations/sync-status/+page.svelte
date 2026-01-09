<script lang="ts">
	import { goto } from '$app/navigation';
	import { RefreshCw, ArrowLeft } from '@lucide/svelte';

	let { data } = $props();
	let syncStatus = $derived(data.syncStatus);
	let syncHistory = $derived(data.syncHistory);

	function formatDate(dateStr: string | null) {
		if (!dateStr) return 'Never';
		const date = new Date(dateStr);
		return date.toLocaleString();
	}

	function formatRelativeTime(dateStr: string | null) {
		if (!dateStr) return 'Never';
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
		if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
		return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
	}

	function getStatusBadgeClass(status: string) {
		switch (status?.toLowerCase()) {
			case 'success':
				return 'bg-green-100 text-green-700';
			case 'error':
			case 'failed':
				return 'bg-red-100 text-red-700';
			case 'warning':
				return 'bg-yellow-100 text-yellow-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	function getDirectionIcon(direction: string) {
		switch (direction?.toLowerCase()) {
			case 'push':
				return '→';
			case 'pull':
				return '←';
			case 'twoway':
			case 'two_way':
				return '↔';
			default:
				return '•';
		}
	}

	function refreshPage() {
		window.location.reload();
	}
</script>

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Toolbar -->
	<header class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20">
		<div class="flex items-center gap-4 flex-1">
			<h1 class="text-sm font-semibold tracking-tight">QuickBooks Sync Status</h1>
			<div class="h-4 w-px bg-border"></div>
			<span class="text-xs text-muted-foreground">Monitor sync status and history</span>
		</div>
		<div class="flex items-center gap-2">
			<button
				onclick={refreshPage}
				class="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors"
			>
				<RefreshCw class="h-3.5 w-3.5" />
				Refresh
			</button>
			<button
				onclick={() => goto('/admin/settings/integrations')}
				class="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors"
			>
				<ArrowLeft class="h-3.5 w-3.5" />
				Back
			</button>
		</div>
	</header>

	{#if !syncStatus}
		<div class="flex-1 overflow-auto p-4">
			<div class="rounded-sm bg-yellow-100 border border-yellow-200 p-3 text-xs text-yellow-800">
				Unable to load sync status. Please try again later.
			</div>
		</div>
	{:else}
		<div class="flex-1 overflow-auto p-4">
			<!-- KPI Grid -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
				<!-- Last Sync -->
				<div class="rounded-sm border bg-background h-32 p-3 flex flex-col">
					<div class="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Last Sync</div>
					<div class="text-xl font-bold flex-1">
						{formatRelativeTime(syncStatus.lastSyncAt)}
					</div>
					<div class="text-[10px] text-muted-foreground mt-auto">
						{formatDate(syncStatus.lastSyncAt)}
					</div>
				</div>

				<!-- Synced Records -->
				<div class="rounded-sm border bg-green-50 border-green-200 h-32 p-3 flex flex-col">
					<div class="text-[10px] uppercase tracking-wider text-green-700 mb-2">Synced Records</div>
					<div class="text-xl font-bold text-green-900 flex-1">{syncStatus.totalSynced}</div>
					<div class="text-[10px] text-green-600 mt-auto">Up to date</div>
				</div>

				<!-- Pending Changes -->
				<div class="rounded-sm border bg-yellow-50 border-yellow-200 h-32 p-3 flex flex-col">
					<div class="text-[10px] uppercase tracking-wider text-yellow-700 mb-2">Pending Changes</div>
					<div class="text-xl font-bold text-yellow-900 flex-1">{syncStatus.totalPending}</div>
					<div class="text-[10px] text-yellow-600 mt-auto">Awaiting sync</div>
				</div>

				<!-- Conflicts -->
				<div class="rounded-sm border bg-red-50 border-red-200 h-32 p-3 flex flex-col">
					<div class="text-[10px] uppercase tracking-wider text-red-700 mb-2">Conflicts</div>
					<div class="text-xl font-bold text-red-900 flex-1">{syncStatus.totalConflicts}</div>
					<div class="text-[10px] text-red-600 mt-auto">
						{#if syncStatus.totalConflicts > 0}
							<a href="/admin/settings/integrations/conflicts" class="underline hover:text-red-800">
								Review conflicts →
							</a>
						{:else}
							No conflicts
						{/if}
					</div>
				</div>
			</div>

			<!-- Entity Status Tables -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
				<!-- Employees Status -->
				<div class="rounded-sm border bg-background overflow-hidden">
					<div class="p-2 border-b bg-muted/20">
						<h2 class="text-xs font-semibold">Employees Status</h2>
					</div>
					<table class="w-full text-xs">
						<tbody class="divide-y">
							<tr class="hover:bg-muted/20">
								<td class="px-3 py-1.5 text-muted-foreground">Synced</td>
								<td class="px-3 py-1.5 text-right font-medium">{syncStatus.employees.synced}</td>
							</tr>
							<tr class="hover:bg-muted/20">
								<td class="px-3 py-1.5 text-muted-foreground">Local Changes</td>
								<td class="px-3 py-1.5 text-right font-medium text-yellow-600">
									{syncStatus.employees.localChanged}
								</td>
							</tr>
							<tr class="hover:bg-muted/20">
								<td class="px-3 py-1.5 text-muted-foreground">Remote Changes</td>
								<td class="px-3 py-1.5 text-right font-medium text-blue-600">
									{syncStatus.employees.remoteChanged}
								</td>
							</tr>
							<tr class="hover:bg-muted/20">
								<td class="px-3 py-1.5 text-muted-foreground">Conflicts</td>
								<td class="px-3 py-1.5 text-right font-medium text-red-600">
									{syncStatus.employees.conflicts}
								</td>
							</tr>
							<tr class="hover:bg-muted/20">
								<td class="px-3 py-1.5 text-muted-foreground">Errors</td>
								<td class="px-3 py-1.5 text-right font-medium text-red-600">
									{syncStatus.employees.errors}
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<!-- Departments Status -->
				<div class="rounded-sm border bg-background overflow-hidden">
					<div class="p-2 border-b bg-muted/20">
						<h2 class="text-xs font-semibold">Departments Status</h2>
					</div>
					<table class="w-full text-xs">
						<tbody class="divide-y">
							<tr class="hover:bg-muted/20">
								<td class="px-3 py-1.5 text-muted-foreground">Synced</td>
								<td class="px-3 py-1.5 text-right font-medium">{syncStatus.departments.synced}</td>
							</tr>
							<tr class="hover:bg-muted/20">
								<td class="px-3 py-1.5 text-muted-foreground">Local Changes</td>
								<td class="px-3 py-1.5 text-right font-medium text-yellow-600">
									{syncStatus.departments.localChanged}
								</td>
							</tr>
							<tr class="hover:bg-muted/20">
								<td class="px-3 py-1.5 text-muted-foreground">Remote Changes</td>
								<td class="px-3 py-1.5 text-right font-medium text-blue-600">
									{syncStatus.departments.remoteChanged}
								</td>
							</tr>
							<tr class="hover:bg-muted/20">
								<td class="px-3 py-1.5 text-muted-foreground">Conflicts</td>
								<td class="px-3 py-1.5 text-right font-medium text-red-600">
									{syncStatus.departments.conflicts}
								</td>
							</tr>
							<tr class="hover:bg-muted/20">
								<td class="px-3 py-1.5 text-muted-foreground">Errors</td>
								<td class="px-3 py-1.5 text-right font-medium text-red-600">
									{syncStatus.departments.errors}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<!-- Sync History -->
			<div class="rounded-sm border bg-background overflow-hidden">
				<div class="p-2 border-b bg-muted/20">
					<h2 class="text-xs font-semibold">Recent Sync Operations</h2>
				</div>
				<div class="overflow-auto max-h-[500px] relative">
					<table class="w-full text-xs border-collapse">
						<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
							<tr>
								<th class="px-3 py-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground text-left border-r last:border-r-0">Time</th>
								<th class="px-3 py-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground text-left border-r last:border-r-0">Type</th>
								<th class="px-3 py-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground text-center border-r last:border-r-0">Dir</th>
								<th class="px-3 py-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground text-right border-r last:border-r-0">Pushed</th>
								<th class="px-3 py-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground text-right border-r last:border-r-0">Pulled</th>
								<th class="px-3 py-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground text-right border-r last:border-r-0">Updated</th>
								<th class="px-3 py-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground text-right border-r last:border-r-0">Skipped</th>
								<th class="px-3 py-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground text-center border-r last:border-r-0">Conflicts</th>
								<th class="px-3 py-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground text-left">Status</th>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#if syncHistory.length === 0}
								<tr>
									<td colspan="9" class="px-4 py-8 text-center text-muted-foreground text-xs">
										No sync history available
									</td>
								</tr>
							{:else}
								{#each syncHistory as log}
									<tr class="hover:bg-muted/20 transition-colors group">
										<td class="px-3 py-1.5 border-r last:border-r-0 whitespace-nowrap">
											<div class="font-medium text-xs">{formatRelativeTime(log.createdAt)}</div>
											<div class="text-[10px] text-muted-foreground">
												{formatDate(log.createdAt)}
											</div>
										</td>
										<td class="px-3 py-1.5 border-r last:border-r-0 capitalize">
											{log.syncType || 'N/A'}
										</td>
										<td class="px-3 py-1.5 border-r last:border-r-0 text-center text-sm">
											{getDirectionIcon(log.changeDirection || log.direction)}
										</td>
										<td class="px-3 py-1.5 border-r last:border-r-0 text-right font-mono">{log.pushedCount || 0}</td>
										<td class="px-3 py-1.5 border-r last:border-r-0 text-right font-mono">{log.pulledCount || 0}</td>
										<td class="px-3 py-1.5 border-r last:border-r-0 text-right font-mono">{log.updatedCount || 0}</td>
										<td class="px-3 py-1.5 border-r last:border-r-0 text-right font-mono">{log.skippedCount || 0}</td>
										<td class="px-3 py-1.5 border-r last:border-r-0 text-center">
											{#if log.conflictDetected}
												<span class="text-red-600 font-semibold">✓</span>
											{:else}
												<span class="text-muted-foreground">—</span>
											{/if}
										</td>
										<td class="px-3 py-1.5">
											<span
												class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium {getStatusBadgeClass(
													log.status
												)}"
											>
												{log.status || 'Unknown'}
											</span>
											{#if log.errorMessage}
												<div class="text-[10px] text-red-600 mt-0.5 truncate max-w-xs" title={log.errorMessage}>
													{log.errorMessage}
												</div>
											{/if}
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}
</div>
