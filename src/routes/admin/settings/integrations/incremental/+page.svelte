<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import {
		AlertCircle,
		CheckCircle2,
		RefreshCw,
		Zap,
		Info,
		Trash2,
		Clock,
		Database
	} from '@lucide/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import {
		ENABLE_INCREMENTAL_SYNC,
		DISABLE_INCREMENTAL_SYNC,
		CLEAR_SYNC_TOKENS,
		FORCE_FULL_SYNC_ONCE
	} from '$lib/graphql/operations/incremental-sync';
	import { browser } from '$app/environment';
	import { invalidate } from '$app/navigation';

	let { data } = $props();

	let settings = $derived(data.settings);

	// Dialog states
	let clearTokensDialogOpen = $state(false);
	let forceFullSyncDialogOpen = $state(false);

	// Form states
	let selectedEntityType = $state<string>('All');
	let selectedForceEntityType = $state<string>('All');

	// UI states
	let toggling = $state(false);
	let clearing = $state(false);
	let forcing = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

	const entityTypes = [
		{ value: 'All', label: 'All Entities' },
		{ value: 'Employee', label: 'Employees Only' },
		{ value: 'Department', label: 'Departments Only' }
	];

	async function toggleIncrementalSync(enable: boolean) {
		if (!browser) return;

		toggling = true;
		error = null;
		success = null;

		try {
			const client = createUrqlClient(fetch);
			const mutation = enable ? ENABLE_INCREMENTAL_SYNC : DISABLE_INCREMENTAL_SYNC;
			const result = await client.mutation(mutation, {}).toPromise();

			if (result.error) {
				error = result.error.message;
			} else {
				const responseData = enable
					? result.data?.incremental_sync?.enable_incremental_sync
					: result.data?.incremental_sync?.disable_incremental_sync;
				success = responseData?.message || 'Settings updated successfully';
				await invalidate('app:incremental-sync');
			}
		} catch (e: unknown) {
			error = (e as Error).message || 'An error occurred while updating settings';
		} finally {
			toggling = false;
		}
	}

	function openClearTokensDialog() {
		selectedEntityType = 'All';
		clearTokensDialogOpen = true;
	}

	function openForceFullSyncDialog() {
		selectedForceEntityType = 'All';
		forceFullSyncDialogOpen = true;
	}

	async function clearTokens() {
		if (!browser) return;

		clearing = true;
		error = null;
		success = null;

		try {
			const client = createUrqlClient(fetch);
			const result = await client
				.mutation(CLEAR_SYNC_TOKENS, {
					entityType: selectedEntityType === 'All' ? null : selectedEntityType
				})
				.toPromise();

			if (result.error) {
				error = result.error.message;
			} else {
				success =
					result.data?.incremental_sync?.clear_sync_tokens?.message ||
					'Sync tokens cleared successfully';
				clearTokensDialogOpen = false;
				await invalidate('app:incremental-sync');
			}
		} catch (e: unknown) {
			error = (e as Error).message || 'An error occurred while clearing tokens';
		} finally {
			clearing = false;
		}
	}

	async function forceFullSync() {
		if (!browser) return;

		forcing = true;
		error = null;
		success = null;

		try {
			const client = createUrqlClient(fetch);
			const result = await client
				.mutation(FORCE_FULL_SYNC_ONCE, {
					entityType: selectedForceEntityType
				})
				.toPromise();

			if (result.error) {
				error = result.error.message;
			} else {
				success =
					result.data?.incremental_sync?.force_full_sync_once?.message ||
					'Full sync queued successfully';
				forceFullSyncDialogOpen = false;
				await invalidate('app:incremental-sync');
			}
		} catch (e: unknown) {
			error = (e as Error).message || 'An error occurred while queuing full sync';
		} finally {
			forcing = false;
		}
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		const date = new Date(dateStr);
		return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
	}

	function refresh() {
		invalidate('app:incremental-sync');
	}
</script>

<svelte:head>
	<title>Incremental Sync - MountainHR Admin</title>
</svelte:head>

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Toolbar -->
	<header
		class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20"
	>
		<div class="flex items-center gap-4">
			<h1 class="text-sm font-semibold tracking-tight">Incremental Sync Configuration</h1>
			<div class="h-4 w-px bg-border"></div>
			<div class="flex items-center gap-2 text-xs text-muted-foreground">
				<Zap class="h-3.5 w-3.5" />
				<span>Optimize sync performance with incremental mode</span>
			</div>
		</div>
		<Button variant="ghost" size="sm" onclick={refresh} class="h-8 w-8 p-0">
			<RefreshCw class="h-4 w-4" />
		</Button>
	</header>

	<div class="flex-1 overflow-auto bg-muted/5">
		<!-- Alerts -->
		{#if data.error}
			<div class="p-4 border-b bg-background">
				<Alert variant="destructive">
					<AlertCircle class="h-4 w-4" />
					<AlertDescription>{data.error}</AlertDescription>
				</Alert>
			</div>
		{/if}

		{#if error}
			<div class="p-4 border-b bg-background">
				<Alert variant="destructive">
					<AlertCircle class="h-4 w-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			</div>
		{/if}

		{#if success}
			<div class="p-4 border-b bg-background">
				<Alert>
					<CheckCircle2 class="h-4 w-4" />
					<AlertDescription>{success}</AlertDescription>
				</Alert>
			</div>
		{/if}

		{#if settings}
			{#if settings.description}
				<div class="p-4 border-b bg-background">
					<Alert>
						<Info class="h-4 w-4" />
						<AlertDescription>
							{settings.description}
						</AlertDescription>
					</Alert>
				</div>
			{/if}

			<!-- KPI Metrics -->
			<div class="grid grid-cols-1 md:grid-cols-3 border-b">
				<!-- Sync Status -->
				<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
							>Sync Mode</span
						>
						<Zap class="h-4 w-4 text-muted-foreground" />
					</div>
					<div>
						<div class="flex items-center gap-2">
							<Badge variant={settings.enabled ? 'default' : 'secondary'} class="text-sm">
								{settings.enabled ? 'Incremental' : 'Full Sync'}
							</Badge>
							<Switch
								checked={settings.enabled}
								onCheckedChange={(checked) => toggleIncrementalSync(checked)}
								disabled={toggling}
							/>
						</div>
						<div class="mt-1 text-xs text-muted-foreground">
							{#if settings.enabled}
								Syncing only changes
							{:else}
								Full sync on every operation
							{/if}
						</div>
					</div>
				</div>

				<!-- Last Full Sync -->
				<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
							>Last Full Sync</span
						>
						<Clock class="h-4 w-4 text-muted-foreground" />
					</div>
					<div>
						<div
							class="text-lg font-bold tracking-tight truncate"
							title={formatDate(settings.lastFullSyncAt)}
						>
							{formatDate(settings.lastFullSyncAt)}
						</div>
						<div class="mt-1 text-xs text-muted-foreground">Baseline for incremental</div>
					</div>
				</div>

				<!-- Active Tokens -->
				<div class="p-6 bg-background flex flex-col justify-between h-32">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
							>Active Tokens</span
						>
						<Database class="h-4 w-4 text-muted-foreground" />
					</div>
					<div>
						<div class="text-3xl font-bold tracking-tight">
							{[settings.employeeSyncToken, settings.departmentSyncToken].filter(Boolean).length}
						</div>
						<div class="mt-1 text-xs text-muted-foreground">of 2 entity types tracked</div>
					</div>
				</div>
			</div>

			<!-- Sync Tokens Table -->
			{#if settings.enabled}
				<div class="border-b bg-background p-6">
					<h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
						<Database class="h-4 w-4 text-primary" />
						Sync Token Status
					</h3>
					<div class="border rounded-lg overflow-hidden">
						<table class="w-full text-sm text-left">
							<thead
								class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm text-xs uppercase text-muted-foreground"
							>
								<tr>
									<th class="px-4 py-3 font-medium">Entity Type</th>
									<th class="px-4 py-3 font-medium">Sync Token</th>
									<th class="px-4 py-3 font-medium">Status</th>
								</tr>
							</thead>
							<tbody class="divide-y">
								<tr class="hover:bg-muted/10">
									<td class="px-4 py-3 font-medium">Employees</td>
									<td class="px-4 py-3">
										{#if settings.employeeSyncToken}
											<code class="text-xs bg-muted px-2 py-1 rounded">
												{settings.employeeSyncToken.slice(0, 32)}...
											</code>
										{:else}
											<span class="text-muted-foreground text-xs">No token</span>
										{/if}
									</td>
									<td class="px-4 py-3">
										{#if settings.employeeSyncToken}
											<Badge variant="default" class="text-xs">Active</Badge>
										{:else}
											<Badge variant="secondary" class="text-xs">Inactive</Badge>
										{/if}
									</td>
								</tr>
								<tr class="hover:bg-muted/10">
									<td class="px-4 py-3 font-medium">Departments</td>
									<td class="px-4 py-3">
										{#if settings.departmentSyncToken}
											<code class="text-xs bg-muted px-2 py-1 rounded">
												{settings.departmentSyncToken.slice(0, 32)}...
											</code>
										{:else}
											<span class="text-muted-foreground text-xs">No token</span>
										{/if}
									</td>
									<td class="px-4 py-3">
										{#if settings.departmentSyncToken}
											<Badge variant="default" class="text-xs">Active</Badge>
										{:else}
											<Badge variant="secondary" class="text-xs">Inactive</Badge>
										{/if}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			{/if}

			<!-- Sync Actions -->
			<div class="border-b bg-background p-6">
				<h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
					<RefreshCw class="h-4 w-4 text-primary" />
					Sync Actions
				</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<!-- Force Full Sync Action -->
					<div class="p-4 border rounded-lg">
						<div class="flex items-center gap-2 mb-3">
							<RefreshCw class="h-5 w-5" />
							<h4 class="font-semibold">Force Full Sync (One-Time)</h4>
						</div>
						<p class="text-sm text-muted-foreground mb-4">
							Queue a one-time full sync without disabling incremental mode. Useful for verifying
							data integrity.
						</p>
						<Button onclick={openForceFullSyncDialog} variant="outline" class="w-full">
							<RefreshCw class="h-4 w-4 mr-2" />
							Force Full Sync
						</Button>
					</div>

					<!-- Clear Tokens Action -->
					<div class="p-4 border rounded-lg">
						<div class="flex items-center gap-2 mb-3">
							<Trash2 class="h-5 w-5" />
							<h4 class="font-semibold">Clear Sync Tokens</h4>
						</div>
						<p class="text-sm text-muted-foreground mb-4">
							Clear sync tokens to force a full sync on the next scheduled sync operation. This
							resets incremental tracking.
						</p>
						<Button onclick={openClearTokensDialog} variant="outline" class="w-full">
							<Trash2 class="h-4 w-4 mr-2" />
							Clear Tokens
						</Button>
					</div>
				</div>
			</div>
		{:else}
			<div class="p-4 border-b bg-background">
				<Alert variant="destructive">
					<AlertCircle class="h-4 w-4" />
					<AlertDescription>Failed to load incremental sync settings</AlertDescription>
				</Alert>
			</div>
		{/if}
	</div>
</div>

<!-- Clear Tokens Dialog -->
<Dialog bind:open={clearTokensDialogOpen}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Clear Sync Tokens</DialogTitle>
			<DialogDescription>
				This will clear sync tokens and force a full sync on the next scheduled operation.
			</DialogDescription>
		</DialogHeader>

		<div class="space-y-4">
			<div>
				<Label for="clear-entity-type">Entity Type</Label>
				<Select
					type="single"
					value={selectedEntityType as any}
					onValueChange={(value: any) => {
						selectedEntityType = value;
					}}
				>
					<SelectTrigger id="clear-entity-type">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{#each entityTypes as type}
							<SelectItem value={type.value}>{type.label}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<Alert>
				<AlertCircle class="h-4 w-4" />
				<AlertDescription>
					Clearing tokens will cause the next sync to process all entities, which may take longer
					and use more API calls.
				</AlertDescription>
			</Alert>
		</div>

		<DialogFooter>
			<Button
				variant="outline"
				onclick={() => {
					clearTokensDialogOpen = false;
				}}
			>
				Cancel
			</Button>
			<Button variant="destructive" onclick={clearTokens} disabled={clearing}>
				{clearing ? 'Clearing...' : 'Clear Tokens'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<!-- Force Full Sync Dialog -->
<Dialog bind:open={forceFullSyncDialogOpen}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Force Full Sync</DialogTitle>
			<DialogDescription>
				Queue a one-time full sync. Incremental mode will resume after this sync completes.
			</DialogDescription>
		</DialogHeader>

		<div class="space-y-4">
			<div>
				<Label for="force-entity-type">Entity Type</Label>
				<Select
					type="single"
					value={selectedForceEntityType as any}
					onValueChange={(value: any) => {
						selectedForceEntityType = value;
					}}
				>
					<SelectTrigger id="force-entity-type">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{#each entityTypes as type}
							<SelectItem value={type.value}>{type.label}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<Alert>
				<Info class="h-4 w-4" />
				<AlertDescription>
					This will queue a full sync job for immediate execution. Incremental sync will
					automatically resume after completion.
				</AlertDescription>
			</Alert>
		</div>

		<DialogFooter>
			<Button
				variant="outline"
				onclick={() => {
					forceFullSyncDialogOpen = false;
				}}
			>
				Cancel
			</Button>
			<Button onclick={forceFullSync} disabled={forcing}>
				{#if forcing}
					<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
					Queueing...
				{:else}
					<RefreshCw class="h-4 w-4 mr-2" />
					Queue Full Sync
				{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
