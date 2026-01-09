<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$app/navigation';
	import { invalidate } from '$app/navigation';
	import { errorStore, showSuccess } from '$lib/stores/error.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { AlertTriangle, ArrowLeft, CheckCircle2 } from '@lucide/svelte';

	let { data } = $props();
	let conflicts = $derived(data.conflicts);
	let resolving = $state<string | null>(null);
	let confirmDialogOpen = $state(false);
	let pendingResolution = $state<{ conflict: any; resolution: 'KEEP_LOCAL' | 'KEEP_REMOTE' } | null>(
		null
	);

	// Conflict permissions from server
	const perms = $derived(data.conflictPermissions || {
		canViewConflicts: false,
		canResolveConflicts: false,
		canBulkResolveConflicts: false,
	});

	function openConfirmDialog(conflict: any, resolution: 'KEEP_LOCAL' | 'KEEP_REMOTE') {
		pendingResolution = { conflict, resolution };
		confirmDialogOpen = true;
	}

	async function confirmResolve() {
		if (!pendingResolution) return;

		confirmDialogOpen = false;
		await resolveConflict(pendingResolution.conflict, pendingResolution.resolution);
		pendingResolution = null;
	}

	function cancelResolve() {
		confirmDialogOpen = false;
		pendingResolution = null;
	}

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
				// Show success toast
				const action = resolution === 'KEEP_LOCAL' ? 'local data' : 'QuickBooks data';
				showSuccess(`Conflict resolved: Kept ${action} for ${conflict.employeeName || conflict.entityType}`);

				// Invalidate data to trigger reactive refresh
				await invalidate('app:conflicts');
			} else {
				// Show error toast
				errorStore.add({
					message: `Failed to resolve conflict: ${result.error || 'Unknown error'}`,
					type: 'error',
					details: result
				});
			}
		} catch (error) {
			console.error('Error resolving conflict:', error);
			errorStore.add({
				message: 'Failed to resolve conflict. Please try again.',
				type: 'error',
				details: error
			});
		} finally {
			resolving = null;
		}
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return 'Never';
		return new Date(dateStr).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getResolutionLabel(resolution: 'KEEP_LOCAL' | 'KEEP_REMOTE'): string {
		return resolution === 'KEEP_LOCAL' ? 'local data' : 'QuickBooks data';
	}

	const totalConflicts = $derived(conflicts.length);
	const resolvableConflicts = $derived(
		conflicts.filter(
			(c: any) =>
				!c.description.includes('has no email address') &&
				!c.description.includes('has no name') &&
				!c.description.includes('no longer exists in QuickBooks')
		).length
	);
	const actionRequiredConflicts = $derived(totalConflicts - resolvableConflicts);
</script>

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Toolbar -->
	<header class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20">
		<div class="flex items-center gap-3">
			<button
				onclick={() => goto('/admin/settings/integrations')}
				class="flex items-center gap-1.5 h-8 px-2.5 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors"
			>
				<ArrowLeft class="h-3.5 w-3.5" />
				Back
			</button>
			<div class="h-4 w-px bg-border"></div>
			<h1 class="text-sm font-semibold tracking-tight">Sync Conflicts</h1>
		</div>
	</header>

	{#if totalConflicts > 0}
		<!-- KPI Grid -->
		<div class="flex-shrink-0 grid grid-cols-3 gap-3 p-3 border-b bg-muted/5">
			<div class="flex flex-col justify-between h-32 rounded-sm border bg-background p-3">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Conflicts</span>
					<AlertTriangle class="h-3.5 w-3.5 text-red-500" />
				</div>
				<div>
					<div class="text-2xl font-bold tracking-tight">{totalConflicts}</div>
					<div class="text-[10px] text-muted-foreground mt-0.5">Requiring attention</div>
				</div>
			</div>

			<div class="flex flex-col justify-between h-32 rounded-sm border bg-background p-3">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Resolvable</span>
					<CheckCircle2 class="h-3.5 w-3.5 text-blue-500" />
				</div>
				<div>
					<div class="text-2xl font-bold tracking-tight">{resolvableConflicts}</div>
					<div class="text-[10px] text-muted-foreground mt-0.5">Can be resolved now</div>
				</div>
			</div>

			<div class="flex flex-col justify-between h-32 rounded-sm border bg-background p-3">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Action Required</span>
					<AlertTriangle class="h-3.5 w-3.5 text-yellow-500" />
				</div>
				<div>
					<div class="text-2xl font-bold tracking-tight">{actionRequiredConflicts}</div>
					<div class="text-[10px] text-muted-foreground mt-0.5">Needs external action</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Conflicts List -->
	<div class="flex-1 overflow-auto min-h-0 p-3 space-y-3">
		{#if totalConflicts === 0}
			<div class="flex flex-col items-center justify-center h-full">
				<div class="rounded-sm border bg-green-50/50 border-green-200 p-8 text-center max-w-md">
					<CheckCircle2 class="h-12 w-12 text-green-600 mx-auto mb-3" />
					<h2 class="text-sm font-semibold text-green-900 mb-1">No Conflicts</h2>
					<p class="text-xs text-green-700">
						All records are in sync. No manual conflict resolution is needed.
					</p>
				</div>
			</div>
		{:else}
			{#each conflicts as conflict}
				<div class="border rounded-lg bg-background">
					<!-- Header -->
					<div class="flex items-start justify-between p-3 border-b bg-muted/5">
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									{conflict.entityType}
								</span>
								{#if conflict.employeeName}
									<span class="text-sm font-medium">
										{conflict.employeeName}
									</span>
								{/if}
							</div>
							{#if conflict.employeeEmail}
								<div class="text-[10px] text-muted-foreground font-mono">
									{conflict.employeeEmail}
								</div>
							{/if}
						</div>

						<!-- Action Buttons or Instructions -->
						<div class="flex gap-1.5 ml-4">
							{#if conflict.description.includes('has no email address') || conflict.description.includes('has no name')}
								<div class="text-[10px] bg-yellow-50 border border-yellow-200 rounded px-2 py-1.5 max-w-[200px]">
									<p class="font-semibold text-yellow-900 mb-0.5">Action Required</p>
									<p class="text-yellow-800">
										{#if conflict.description.includes('has no email address')}
											Add email in QuickBooks
										{:else if conflict.description.includes('has no name')}
											Add name in QuickBooks
										{/if}
									</p>
								</div>
							{:else if conflict.description.includes('no longer exists in QuickBooks')}
								<div class="text-[10px] bg-yellow-50 border border-yellow-200 rounded px-2 py-1.5 max-w-[200px]">
									<p class="font-semibold text-yellow-900 mb-0.5">Action Required</p>
									<p class="text-yellow-800">Manually unlink or deactivate</p>
								</div>
							{:else}
								<button
									class="h-7 px-2.5 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors disabled:opacity-50"
									disabled={resolving !== null}
									onclick={() => openConfirmDialog(conflict, 'KEEP_LOCAL')}
								>
									{#if resolving === conflict.entityId}
										Resolving...
									{:else}
										Keep Local
									{/if}
								</button>
								<button
									class="h-7 px-2.5 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors disabled:opacity-50"
									disabled={resolving !== null}
									onclick={() => openConfirmDialog(conflict, 'KEEP_REMOTE')}
								>
									{#if resolving === conflict.entityId}
										Resolving...
									{:else}
										Keep QuickBooks
									{/if}
								</button>
							{/if}
						</div>
					</div>

					<!-- Content -->
					<div class="p-3 space-y-3">
						<!-- Conflict Description -->
						<div class="p-2.5 bg-red-50/80 border border-red-200 rounded-sm">
							<div class="flex items-start gap-2">
								<AlertTriangle class="h-3.5 w-3.5 text-red-600 flex-shrink-0 mt-0.5" />
								<div class="flex-1 min-w-0">
									<p class="text-xs font-medium text-red-900 mb-0.5">Sync Conflict</p>
									<p class="text-xs text-red-800 leading-relaxed">
										{conflict.description}
									</p>
								</div>
							</div>
						</div>

						<!-- Metadata Grid -->
						<div class="grid grid-cols-3 gap-3">
							{#if conflict.quickbooksId && conflict.quickbooksId !== 'unknown'}
								<div>
									<div class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">QuickBooks ID</div>
									<div class="text-xs font-mono">{conflict.quickbooksId}</div>
								</div>
							{/if}
							<div>
								<div class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Entity ID</div>
								<div class="text-xs font-mono">{conflict.entityId}</div>
							</div>
							<div>
								<div class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Detected At</div>
								<div class="text-xs">{formatDate(conflict.localModifiedAt)}</div>
							</div>
							<div>
								<div class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Last Synced</div>
								<div class="text-xs">{formatDate(conflict.lastSyncedAt)}</div>
							</div>
						</div>
					</div>
				</div>
			{/each}

			<!-- Resolution Tips -->
			<div class="border rounded-lg bg-blue-50/30 border-blue-200 p-3">
				<h3 class="text-xs font-semibold text-blue-900 mb-2">Resolution Tips</h3>
				<ul class="text-[10px] text-blue-800 space-y-1 list-disc list-inside leading-relaxed">
					<li><strong>Keep Local:</strong> Overwrites QuickBooks with your local data</li>
					<li><strong>Keep QuickBooks:</strong> Overwrites local data with QuickBooks version</li>
					<li>Communicate with your team before resolving conflicts</li>
					<li>Consider timestamps - more recent changes might be correct</li>
				</ul>
			</div>
		{/if}
	</div>
</div>

<!-- Confirmation Dialog -->
<Dialog.Root bind:open={confirmDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="text-sm">Confirm Conflict Resolution</Dialog.Title>
			<Dialog.Description class="text-xs">
				{#if pendingResolution}
					Are you sure you want to keep
					<strong>{getResolutionLabel(pendingResolution.resolution)}</strong>
					for
					<strong>
						{pendingResolution.conflict.employeeName ||
							pendingResolution.conflict.entityType}
					</strong>?
					<div class="mt-3 p-2.5 bg-yellow-50 border border-yellow-200 rounded-sm">
						<p class="text-[10px] text-yellow-900 font-semibold mb-1">Warning</p>
						<p class="text-[10px] text-yellow-800 leading-relaxed">
							This will overwrite the other version and cannot be undone. Make sure you've
							communicated with your team about this decision.
						</p>
					</div>
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="gap-2">
			<button
				class="h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors"
				onclick={cancelResolve}
			>
				Cancel
			</button>
			<button
				class="h-8 px-3 rounded-sm bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors"
				onclick={confirmResolve}
			>
				Confirm Resolution
			</button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
