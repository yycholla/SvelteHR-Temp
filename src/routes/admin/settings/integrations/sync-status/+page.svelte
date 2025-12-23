<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$app/navigation';
	import { RefreshCw } from '@lucide/svelte';

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
				return 'bg-green-100 text-green-800 border-green-200';
			case 'error':
			case 'failed':
				return 'bg-red-100 text-red-800 border-red-200';
			case 'warning':
				return 'bg-yellow-100 text-yellow-800 border-yellow-200';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-200';
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

<div class="container mx-auto py-8 px-4">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">QuickBooks Sync Dashboard</h1>
			<p class="text-muted-foreground mt-2">Monitor sync status and history</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" size="sm" onclick={refreshPage}>
				<RefreshCw class="h-4 w-4 mr-2" />
				Refresh
			</Button>
			<Button variant="outline" onclick={() => goto('/admin/settings/integrations')}>
				← Back to Integrations
			</Button>
		</div>
	</div>

	{#if !syncStatus}
		<div class="rounded-lg border bg-yellow-50 border-yellow-200 p-6">
			<p class="text-yellow-800">Unable to load sync status. Please try again later.</p>
		</div>
	{:else}
		<!-- Overall Status Card -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
			<div class="rounded-lg border bg-card p-4">
				<div class="text-sm text-muted-foreground mb-1">Last Sync</div>
				<div class="text-2xl font-bold">
					{formatRelativeTime(syncStatus.lastSyncAt)}
				</div>
				<div class="text-xs text-muted-foreground mt-1">
					{formatDate(syncStatus.lastSyncAt)}
				</div>
			</div>

			<div class="rounded-lg border bg-green-50 border-green-200 p-4">
				<div class="text-sm text-green-700 mb-1">Synced Records</div>
				<div class="text-2xl font-bold text-green-900">{syncStatus.totalSynced}</div>
				<div class="text-xs text-green-600 mt-1">✓ Up to date</div>
			</div>

			<div class="rounded-lg border bg-yellow-50 border-yellow-200 p-4">
				<div class="text-sm text-yellow-700 mb-1">Pending Changes</div>
				<div class="text-2xl font-bold text-yellow-900">{syncStatus.totalPending}</div>
				<div class="text-xs text-yellow-600 mt-1">⚠ Awaiting sync</div>
			</div>

			<div class="rounded-lg border bg-red-50 border-red-200 p-4">
				<div class="text-sm text-red-700 mb-1">Conflicts</div>
				<div class="text-2xl font-bold text-red-900">{syncStatus.totalConflicts}</div>
				<div class="text-xs text-red-600 mt-1">
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
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
			<!-- Employees Status -->
			<div class="rounded-lg border bg-card">
				<div class="p-4 border-b">
					<h2 class="text-lg font-semibold">Employees Status</h2>
				</div>
				<div class="p-4">
					<table class="w-full text-sm">
						<tbody class="divide-y">
							<tr>
								<td class="py-2 text-muted-foreground">Synced</td>
								<td class="py-2 text-right font-medium">{syncStatus.employees.synced}</td>
							</tr>
							<tr>
								<td class="py-2 text-muted-foreground">Local Changes</td>
								<td class="py-2 text-right font-medium text-yellow-600">
									{syncStatus.employees.localChanged}
								</td>
							</tr>
							<tr>
								<td class="py-2 text-muted-foreground">Remote Changes</td>
								<td class="py-2 text-right font-medium text-blue-600">
									{syncStatus.employees.remoteChanged}
								</td>
							</tr>
							<tr>
								<td class="py-2 text-muted-foreground">Conflicts</td>
								<td class="py-2 text-right font-medium text-red-600">
									{syncStatus.employees.conflicts}
								</td>
							</tr>
							<tr>
								<td class="py-2 text-muted-foreground">Errors</td>
								<td class="py-2 text-right font-medium text-red-600">
									{syncStatus.employees.errors}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<!-- Departments Status -->
			<div class="rounded-lg border bg-card">
				<div class="p-4 border-b">
					<h2 class="text-lg font-semibold">Departments Status</h2>
				</div>
				<div class="p-4">
					<table class="w-full text-sm">
						<tbody class="divide-y">
							<tr>
								<td class="py-2 text-muted-foreground">Synced</td>
								<td class="py-2 text-right font-medium">{syncStatus.departments.synced}</td>
							</tr>
							<tr>
								<td class="py-2 text-muted-foreground">Local Changes</td>
								<td class="py-2 text-right font-medium text-yellow-600">
									{syncStatus.departments.localChanged}
								</td>
							</tr>
							<tr>
								<td class="py-2 text-muted-foreground">Remote Changes</td>
								<td class="py-2 text-right font-medium text-blue-600">
									{syncStatus.departments.remoteChanged}
								</td>
							</tr>
							<tr>
								<td class="py-2 text-muted-foreground">Conflicts</td>
								<td class="py-2 text-right font-medium text-red-600">
									{syncStatus.departments.conflicts}
								</td>
							</tr>
							<tr>
								<td class="py-2 text-muted-foreground">Errors</td>
								<td class="py-2 text-right font-medium text-red-600">
									{syncStatus.departments.errors}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- Sync History -->
		<div class="rounded-lg border bg-card">
			<div class="p-4 border-b">
				<h2 class="text-lg font-semibold">Recent Sync Operations</h2>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="bg-muted/50">
						<tr class="border-b">
							<th class="px-4 py-3 text-left font-medium">Time</th>
							<th class="px-4 py-3 text-left font-medium">Type</th>
							<th class="px-4 py-3 text-center font-medium">Direction</th>
							<th class="px-4 py-3 text-right font-medium">Pushed</th>
							<th class="px-4 py-3 text-right font-medium">Pulled</th>
							<th class="px-4 py-3 text-right font-medium">Updated</th>
							<th class="px-4 py-3 text-right font-medium">Skipped</th>
							<th class="px-4 py-3 text-center font-medium">Conflicts</th>
							<th class="px-4 py-3 text-left font-medium">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#if syncHistory.length === 0}
							<tr>
								<td colspan="9" class="px-4 py-8 text-center text-muted-foreground">
									No sync history available
								</td>
							</tr>
						{:else}
							{#each syncHistory as log}
								<tr class="hover:bg-muted/30">
									<td class="px-4 py-3">
										<div class="font-medium">{formatRelativeTime(log.createdAt)}</div>
										<div class="text-xs text-muted-foreground">
											{formatDate(log.createdAt)}
										</div>
									</td>
									<td class="px-4 py-3">
										<span class="capitalize">{log.syncType || 'N/A'}</span>
									</td>
									<td class="px-4 py-3 text-center text-lg">
										{getDirectionIcon(log.changeDirection || log.direction)}
									</td>
									<td class="px-4 py-3 text-right">{log.pushedCount || 0}</td>
									<td class="px-4 py-3 text-right">{log.pulledCount || 0}</td>
									<td class="px-4 py-3 text-right">{log.updatedCount || 0}</td>
									<td class="px-4 py-3 text-right">{log.skippedCount || 0}</td>
									<td class="px-4 py-3 text-center">
										{#if log.conflictDetected}
											<span class="text-red-600">✓</span>
										{:else}
											<span class="text-muted-foreground">-</span>
										{/if}
									</td>
									<td class="px-4 py-3">
										<span
											class="inline-flex items-center px-2 py-1 rounded text-xs font-medium border {getStatusBadgeClass(
												log.status
											)}"
										>
											{log.status || 'Unknown'}
										</span>
										{#if log.errorMessage}
											<div class="text-xs text-red-600 mt-1" title={log.errorMessage}>
												{log.errorMessage.substring(0, 50)}{log.errorMessage.length > 50
													? '...'
													: ''}
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

		<!-- Help Section -->
		<div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
			<h3 class="font-semibold text-blue-900 mb-2">📊 Dashboard Guide</h3>
			<ul class="text-sm text-blue-800 space-y-1 list-disc list-inside">
				<li>
					<strong>Synced Records:</strong> Total number of employees and departments successfully synced
				</li>
				<li>
					<strong>Pending Changes:</strong> Records with local or remote changes awaiting sync
				</li>
				<li>
					<strong>Conflicts:</strong> Records changed on both sides - requires manual resolution
				</li>
				<li>
					<strong>Direction Icons:</strong> → (Push to QB), ← (Pull from QB), ↔ (Two-way sync)
				</li>
			</ul>
		</div>
	{/if}
</div>
