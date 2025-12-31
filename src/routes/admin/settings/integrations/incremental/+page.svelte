<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
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
				const data = enable
					? result.data?.incremental_sync?.enable_incremental_sync
					: result.data?.incremental_sync?.disable_incremental_sync;
				success = data?.message || 'Settings updated successfully';
				await invalidate('app:incremental-sync');
			}
		} catch (e: any) {
			error = e.message || 'An error occurred while updating settings';
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
				success = result.data?.incremental_sync?.clear_sync_tokens?.message || 'Sync tokens cleared successfully';
				clearTokensDialogOpen = false;
				await invalidate('app:incremental-sync');
			}
		} catch (e: any) {
			error = e.message || 'An error occurred while clearing tokens';
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
				success = result.data?.incremental_sync?.force_full_sync_once?.message || 'Full sync queued successfully';
				forceFullSyncDialogOpen = false;
				await invalidate('app:incremental-sync');
			}
		} catch (e: any) {
			error = e.message || 'An error occurred while queuing full sync';
		} finally {
			forcing = false;
		}
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		const date = new Date(dateStr);
		return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
	}
</script>

<div class="container mx-auto py-8 px-4">
	<!-- Header -->
	<div class="mb-6">
		<div class="flex items-center gap-3 mb-2">
			<Zap class="h-6 w-6" />
			<h1 class="text-2xl font-bold">Incremental Sync Configuration</h1>
		</div>
		<p class="text-sm text-muted-foreground">
			Toggle between full sync and incremental sync modes to optimize performance
		</p>
	</div>

	{#if data.error}
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription>{data.error}</AlertDescription>
		</Alert>
	{/if}

	{#if error}
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription>{error}</AlertDescription>
		</Alert>
	{/if}

	{#if success}
		<Alert class="mb-6">
			<CheckCircle2 class="h-4 w-4" />
			<AlertDescription>{success}</AlertDescription>
		</Alert>
	{/if}

	{#if settings}
		<!-- Info Alert -->
		<Alert class="mb-6">
			<Info class="h-4 w-4" />
			<AlertDescription>
				{settings.description}
			</AlertDescription>
		</Alert>

		<!-- Main Settings Card -->
		<Card class="mb-6">
			<CardHeader>
				<CardTitle>Sync Mode</CardTitle>
				<CardDescription>
					Choose between incremental and full sync modes
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-6">
					<div class="flex items-center justify-between p-4 border rounded-lg">
						<div class="flex-1">
							<div class="flex items-center gap-3 mb-2">
								<Zap class="h-5 w-5" />
								<h3 class="font-semibold">Incremental Sync Mode</h3>
								<Badge variant={settings.enabled ? 'default' : 'secondary'}>
									{settings.enabled ? 'Enabled' : 'Disabled'}
								</Badge>
							</div>
							<p class="text-sm text-muted-foreground">
								{#if settings.enabled}
									Syncing only changes since last sync. Reduces API calls and improves performance.
								{:else}
									Full sync mode active. All entities are synced on every operation.
								{/if}
							</p>
						</div>
						<Switch
							checked={settings.enabled}
							onCheckedChange={(checked) => toggleIncrementalSync(checked)}
							disabled={toggling}
						/>
					</div>

					{#if settings.enabled}
						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div class="p-4 border rounded-lg">
								<div class="flex items-center gap-2 mb-2">
									<Clock class="h-4 w-4 text-muted-foreground" />
									<p class="text-sm font-medium">Last Full Sync</p>
								</div>
								<p class="text-lg font-semibold">{formatDate(settings.lastFullSyncAt)}</p>
							</div>

							<div class="p-4 border rounded-lg">
								<div class="flex items-center gap-2 mb-2">
									<Database class="h-4 w-4 text-muted-foreground" />
									<p class="text-sm font-medium">Employee Token</p>
								</div>
								{#if settings.employeeSyncToken}
									<code class="text-xs bg-muted px-2 py-1 rounded">
										{settings.employeeSyncToken.slice(0, 20)}...
									</code>
								{:else}
									<p class="text-sm text-muted-foreground">No token</p>
								{/if}
							</div>

							<div class="p-4 border rounded-lg">
								<div class="flex items-center gap-2 mb-2">
									<Database class="h-4 w-4 text-muted-foreground" />
									<p class="text-sm font-medium">Department Token</p>
								</div>
								{#if settings.departmentSyncToken}
									<code class="text-xs bg-muted px-2 py-1 rounded">
										{settings.departmentSyncToken.slice(0, 20)}...
									</code>
								{:else}
									<p class="text-sm text-muted-foreground">No token</p>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</CardContent>
		</Card>

		<!-- Actions Card -->
		<Card>
			<CardHeader>
				<CardTitle>Sync Actions</CardTitle>
				<CardDescription>
					Advanced sync operations and token management
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="p-4 border rounded-lg">
						<div class="flex items-center gap-2 mb-3">
							<RefreshCw class="h-5 w-5" />
							<h3 class="font-semibold">Force Full Sync (One-Time)</h3>
						</div>
						<p class="text-sm text-muted-foreground mb-4">
							Queue a one-time full sync without disabling incremental mode. Useful for verifying data integrity.
						</p>
						<Button onclick={openForceFullSyncDialog} variant="outline" class="w-full">
							<RefreshCw class="h-4 w-4 mr-2" />
							Force Full Sync
						</Button>
					</div>

					<div class="p-4 border rounded-lg">
						<div class="flex items-center gap-2 mb-3">
							<Trash2 class="h-5 w-5" />
							<h3 class="font-semibold">Clear Sync Tokens</h3>
						</div>
						<p class="text-sm text-muted-foreground mb-4">
							Clear sync tokens to force a full sync on the next scheduled sync operation. This resets incremental tracking.
						</p>
						<Button onclick={openClearTokensDialog} variant="outline" class="w-full">
							<Trash2 class="h-4 w-4 mr-2" />
							Clear Tokens
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	{:else}
		<Alert variant="destructive">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription>Failed to load incremental sync settings</AlertDescription>
		</Alert>
	{/if}
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
					Clearing tokens will cause the next sync to process all entities, which may take longer and use more API calls.
				</AlertDescription>
			</Alert>
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={() => { clearTokensDialogOpen = false; }}>
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
					This will queue a full sync job for immediate execution. Incremental sync will automatically resume after completion.
				</AlertDescription>
			</Alert>
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={() => { forceFullSyncDialogOpen = false; }}>
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
