<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$app/navigation';

	let { data } = $props();
	let conflicts = $derived(data.conflicts);
	let resolving = $state<string | null>(null);

	async function resolveConflict(conflict: any, resolution: 'KEEP_LOCAL' | 'KEEP_REMOTE') {
		resolving = conflict.entityId;

		try {
			const response = await fetch('/api/intuit/resolve-conflict', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					entityType: conflict.entityType,
					entityId: conflict.entityId,
					resolution
				})
			});

			const result = await response.json();

			if (result.success) {
				// Reload the page to refresh conflicts list
				window.location.reload();
			} else {
				alert(`Failed to resolve conflict: ${result.error || 'Unknown error'}`);
			}
		} catch (error) {
			console.error('Error resolving conflict:', error);
			alert('Failed to resolve conflict. Check console for details.');
		} finally {
			resolving = null;
		}
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return 'Never';
		return new Date(dateStr).toLocaleString();
	}
</script>

<div class="container mx-auto py-8 px-4">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Sync Conflicts</h1>
			<p class="text-muted-foreground mt-2">
				Resolve conflicts between local and QuickBooks data
			</p>
		</div>
		<Button variant="outline" onclick={() => goto('/admin/settings/integrations')}>
			← Back to Integrations
		</Button>
	</div>

	{#if conflicts.length === 0}
		<div class="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
			<div class="text-4xl mb-3">✓</div>
			<h2 class="text-xl font-semibold text-green-900 mb-2">No Conflicts</h2>
			<p class="text-green-700">
				All records are in sync. No manual conflict resolution is needed.
			</p>
		</div>
	{:else}
		<div class="rounded-lg border bg-card">
			<div class="p-4 border-b">
				<h2 class="text-lg font-semibold">
					{conflicts.length} Conflict{conflicts.length !== 1 ? 's' : ''} Requiring Resolution
				</h2>
			</div>

			<div class="divide-y">
				{#each conflicts as conflict}
					<div class="p-4">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<div class="flex items-center gap-2 mb-2">
									<span class="font-semibold text-lg">
										{conflict.entityType}
									</span>
									{#if conflict.employeeName}
										<span class="text-foreground font-medium">
											{conflict.employeeName}
										</span>
									{/if}
									{#if conflict.employeeEmail}
										<span class="text-muted-foreground text-sm">
											({conflict.employeeEmail})
										</span>
									{/if}
								</div>

								{#if conflict.quickbooksId && conflict.quickbooksId !== 'unknown'}
									<div class="text-sm text-muted-foreground mb-3">
										QuickBooks ID: {conflict.quickbooksId}
									</div>
								{/if}

								<div class="mt-3 p-4 bg-red-50 border border-red-200 rounded">
									<p class="text-sm text-red-900 font-medium mb-1">⚠️ Sync Conflict</p>
									<p class="text-sm text-red-800">
										{conflict.description}
									</p>
								</div>

								<div class="grid grid-cols-3 gap-4 text-sm mt-3">
									<div>
										<div class="text-muted-foreground">Detected At</div>
										<div class="font-medium">{formatDate(conflict.localModifiedAt)}</div>
									</div>
									<div>
										<div class="text-muted-foreground">Entity ID</div>
										<div class="font-medium">{conflict.entityId}</div>
									</div>
									<div>
										<div class="text-muted-foreground">Last Synced</div>
										<div class="font-medium">{formatDate(conflict.lastSyncedAt)}</div>
									</div>
								</div>
							</div>

							<div class="flex gap-2 ml-4">
								<Button
									variant="outline"
									size="sm"
									disabled={resolving !== null}
									onclick={() => resolveConflict(conflict, 'KEEP_LOCAL')}
								>
									{#if resolving === conflict.entityId}
										Resolving...
									{:else}
										Keep Local
									{/if}
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={resolving !== null}
									onclick={() => resolveConflict(conflict, 'KEEP_REMOTE')}
								>
									{#if resolving === conflict.entityId}
										Resolving...
									{:else}
										Keep QuickBooks
									{/if}
								</Button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
			<h3 class="font-semibold text-blue-900 mb-2">💡 Resolution Tips</h3>
			<ul class="text-sm text-blue-800 space-y-1 list-disc list-inside">
				<li><strong>Keep Local:</strong> Overwrites the QuickBooks version with your local data</li>
				<li>
					<strong>Keep QuickBooks:</strong> Overwrites your local data with the QuickBooks version
				</li>
				<li>Make sure to communicate with your team before resolving conflicts</li>
				<li>Consider the timestamp - the more recent change might be the correct one</li>
			</ul>
		</div>
	{/if}
</div>
