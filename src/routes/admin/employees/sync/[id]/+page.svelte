<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
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
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import {
		AlertCircle,
		CheckCircle2,
		RefreshCw,
		Settings,
		History,
		User,
		ArrowRight,
		ArrowLeft,
		ArrowLeftRight,
		Clock,
		CheckCircle,
		XCircle
	} from '@lucide/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import {
		UPDATE_EMPLOYEE_SYNC_SETTINGS,
		TRIGGER_EMPLOYEE_SYNC
	} from '$lib/graphql/operations/employee-sync';
	import { browser } from '$app/environment';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/stores';

	let { data } = $props();

	let syncStatus = $derived(data.syncStatus);
	let syncHistory = $derived(data.syncHistory || []);
	let total = $derived(data.total || 0);

	// Dialog states
	let settingsDialogOpen = $state(false);
	let syncDialogOpen = $state(false);

	// Form states
	let autoSyncEnabled = $state(true);
	let syncDirection = $state<string>('Bidirectional');
	let selectedSyncDirection = $state('Pull');

	// UI states
	let submitting = $state(false);
	let syncing = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

	const directions = [
		{ value: 'Pull', label: 'Pull from QuickBooks', icon: ArrowLeft },
		{ value: 'Push', label: 'Push to QuickBooks', icon: ArrowRight },
		{ value: 'Bidirectional', label: 'Bidirectional Sync', icon: ArrowLeftRight }
	];

	function openSettingsDialog() {
		if (syncStatus) {
			autoSyncEnabled = syncStatus.autoSyncEnabled;
			syncDirection = syncStatus.syncDirection;
		}
		settingsDialogOpen = true;
	}

	function openSyncDialog() {
		selectedSyncDirection = 'Pull';
		syncDialogOpen = true;
	}

	async function updateSettings() {
		if (!browser || !syncStatus) return;

		submitting = true;
		error = null;
		success = null;

		try {
			const client = createUrqlClient(fetch);
			const result = await client
				.mutation(UPDATE_EMPLOYEE_SYNC_SETTINGS, {
					input: {
						employee_id: syncStatus.employeeId,
						auto_sync_enabled: autoSyncEnabled,
						sync_direction: syncDirection,
						excluded_fields: null
					}
				})
				.toPromise();

			if (result.error) {
				error = result.error.message;
			} else {
				success =
					result.data?.employee_sync?.update_employee_sync_settings?.message ||
					'Settings updated successfully';
				settingsDialogOpen = false;
				await invalidate('app:employee-sync');
			}
		} catch (e: any) {
			error = e.message || 'An error occurred while updating settings';
		} finally {
			submitting = false;
		}
	}

	async function triggerSync() {
		if (!browser || !syncStatus) return;

		syncing = true;
		error = null;
		success = null;

		try {
			const client = createUrqlClient(fetch);
			const result = await client
				.mutation(TRIGGER_EMPLOYEE_SYNC, {
					employeeId: syncStatus.employeeId,
					direction: selectedSyncDirection
				})
				.toPromise();

			if (result.error) {
				error = result.error.message;
			} else {
				success =
					result.data?.employee_sync?.trigger_employee_sync?.message ||
					'Sync triggered successfully';
				syncDialogOpen = false;
				await invalidate('app:employee-sync');
			}
		} catch (e: any) {
			error = e.message || 'An error occurred while triggering sync';
		} finally {
			syncing = false;
		}
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		const date = new Date(dateStr);
		return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
	}

	function getStatusIcon(status: string) {
		switch (status.toLowerCase()) {
			case 'success':
				return CheckCircle;
			case 'failed':
			case 'error':
				return XCircle;
			default:
				return Clock;
		}
	}

	function getStatusBadgeVariant(status: string) {
		switch (status.toLowerCase()) {
			case 'success':
				return 'default' as const;
			case 'failed':
			case 'error':
				return 'destructive' as const;
			default:
				return 'secondary' as const;
		}
	}

	function getDirectionIcon(direction: string) {
		switch (direction) {
			case 'Pull':
				return ArrowLeft;
			case 'Push':
				return ArrowRight;
			case 'Bidirectional':
				return ArrowLeftRight;
			default:
				return ArrowLeftRight;
		}
	}
</script>

<div class="container mx-auto py-8 px-4">
	<!-- Header -->
	<div class="mb-6">
		<div class="flex items-center gap-3 mb-2">
			<User class="h-6 w-6" />
			<h1 class="text-2xl font-bold">
				{syncStatus?.employeeName || 'Employee'} - Sync Management
			</h1>
		</div>
		<p class="text-sm text-muted-foreground">
			Manage QuickBooks sync settings and view sync history for this employee
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

	{#if syncStatus}
		<!-- Sync Status Card -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
			<Card class="lg:col-span-2">
				<CardHeader>
					<div class="flex items-center justify-between">
						<CardTitle>Sync Status</CardTitle>
						<Button onclick={openSettingsDialog} variant="outline" size="sm">
							<Settings class="h-4 w-4 mr-2" />
							Configure
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<p class="text-sm text-muted-foreground">Employee Name</p>
							<p class="font-medium">{syncStatus.employeeName}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">QuickBooks ID</p>
							{#if syncStatus.quickbooksId}
								<code class="bg-muted px-2 py-1 rounded text-sm">
									{syncStatus.quickbooksId}
								</code>
							{:else}
								<p class="text-sm text-muted-foreground">Not synced</p>
							{/if}
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Last Synced</p>
							<p class="font-medium">{formatDate(syncStatus.lastSyncedAt)}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Auto Sync</p>
							<Badge variant={syncStatus.autoSyncEnabled ? 'default' : 'secondary'}>
								{syncStatus.autoSyncEnabled ? 'Enabled' : 'Disabled'}
							</Badge>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Sync Direction</p>
							<Badge variant="outline">
								{@const DirectionIcon = getDirectionIcon(syncStatus.syncDirection)}
								<DirectionIcon class="h-3 w-3 mr-1" />
								{syncStatus.syncDirection}
							</Badge>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Local Changes</p>
							<Badge variant={syncStatus.hasLocalChanges ? 'destructive' : 'default'}>
								{syncStatus.hasLocalChanges ? 'Has Changes' : 'Synchronized'}
							</Badge>
						</div>
					</div>

					{#if syncStatus.excludedFields.length > 0}
						<div class="mt-4 pt-4 border-t">
							<p class="text-sm text-muted-foreground mb-2">Excluded Fields</p>
							<div class="flex flex-wrap gap-2">
								{#each syncStatus.excludedFields as field}
									<Badge variant="secondary">{field}</Badge>
								{/each}
							</div>
						</div>
					{/if}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Actions</CardTitle>
					<CardDescription>Manage employee sync</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					<Button onclick={openSyncDialog} class="w-full">
						<RefreshCw class="h-4 w-4 mr-2" />
						Trigger Sync
					</Button>
					<Button onclick={openSettingsDialog} variant="outline" class="w-full">
						<Settings class="h-4 w-4 mr-2" />
						Configure Settings
					</Button>
				</CardContent>
			</Card>
		</div>

		<!-- Sync History Card -->
		<Card>
			<CardHeader>
				<div class="flex items-center gap-2">
					<History class="h-5 w-5" />
					<CardTitle>Sync History</CardTitle>
				</div>
				<CardDescription>
					{total} sync {total === 1 ? 'operation' : 'operations'} recorded
				</CardDescription>
			</CardHeader>
			<CardContent>
				{#if syncHistory.length === 0}
					<div class="text-center py-12 text-muted-foreground">
						<History class="h-12 w-12 mx-auto mb-3" />
						<p class="font-medium">No sync history</p>
						<p class="text-sm">Sync operations will appear here</p>
					</div>
				{:else}
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Date/Time</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Direction</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Fields Synced</TableHead>
								<TableHead>Errors</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each syncHistory as entry}
								<TableRow>
									<TableCell class="whitespace-nowrap">
										{formatDate(entry.syncedAt)}
									</TableCell>
									<TableCell>
										<Badge variant="outline">{entry.syncType}</Badge>
									</TableCell>
									<TableCell>
										{@const DirectionIcon = getDirectionIcon(entry.direction)}
										<Badge variant="secondary">
											<DirectionIcon class="h-3 w-3 mr-1" />
											{entry.direction}
										</Badge>
									</TableCell>
									<TableCell>
										{@const StatusIcon = getStatusIcon(entry.status)}
										<Badge variant={getStatusBadgeVariant(entry.status)}>
											<StatusIcon class="h-3 w-3 mr-1" />
											{entry.status}
										</Badge>
									</TableCell>
									<TableCell>
										{#if entry.fieldsSynced.length > 0}
											<div class="flex flex-wrap gap-1">
												{#each entry.fieldsSynced.slice(0, 3) as field}
													<Badge variant="outline" class="text-xs">{field}</Badge>
												{/each}
												{#if entry.fieldsSynced.length > 3}
													<Badge variant="outline" class="text-xs">
														+{entry.fieldsSynced.length - 3} more
													</Badge>
												{/if}
											</div>
										{:else}
											<span class="text-muted-foreground text-sm">None</span>
										{/if}
									</TableCell>
									<TableCell>
										{#if entry.errors.length > 0}
											<Badge variant="destructive" class="text-xs">
												{entry.errors.length} error{entry.errors.length === 1 ? '' : 's'}
											</Badge>
										{:else}
											<span class="text-muted-foreground text-sm">None</span>
										{/if}
									</TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				{/if}
			</CardContent>
		</Card>
	{:else}
		<Alert variant="destructive">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription>Employee sync status not found</AlertDescription>
		</Alert>
	{/if}
</div>

<!-- Settings Dialog -->
<Dialog bind:open={settingsDialogOpen}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Configure Sync Settings</DialogTitle>
			<DialogDescription>
				Customize how this employee is synchronized with QuickBooks
			</DialogDescription>
		</DialogHeader>

		<div class="space-y-4">
			<div class="flex items-center gap-2">
				<Switch id="auto-sync" bind:checked={autoSyncEnabled} />
				<Label for="auto-sync">Enable automatic sync</Label>
			</div>

			<div>
				<Label for="sync-direction">Default Sync Direction</Label>
				<Select
					type="single"
					value={syncDirection as any}
					onValueChange={(value: any) => {
						syncDirection = value;
					}}
				>
					<SelectTrigger id="sync-direction">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{#each directions as direction}
							{@const Icon = direction.icon}
							<SelectItem value={direction.value}>
								<div class="flex items-center gap-2">
									<Icon class="h-4 w-4" />
									{direction.label}
								</div>
							</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>
		</div>

		<DialogFooter>
			<Button
				variant="outline"
				onclick={() => {
					settingsDialogOpen = false;
				}}
			>
				Cancel
			</Button>
			<Button onclick={updateSettings} disabled={submitting}>
				{submitting ? 'Saving...' : 'Save Settings'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<!-- Trigger Sync Dialog -->
<Dialog bind:open={syncDialogOpen}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Trigger Employee Sync</DialogTitle>
			<DialogDescription>
				Manually trigger a sync operation for {syncStatus?.employeeName}
			</DialogDescription>
		</DialogHeader>

		<div class="space-y-4">
			<div>
				<Label for="trigger-direction">Sync Direction</Label>
				<Select
					type="single"
					value={selectedSyncDirection as any}
					onValueChange={(value: any) => {
						selectedSyncDirection = value;
					}}
				>
					<SelectTrigger id="trigger-direction">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{#each directions as direction}
							{@const Icon = direction.icon}
							<SelectItem value={direction.value}>
								<div class="flex items-center gap-2">
									<Icon class="h-4 w-4" />
									{direction.label}
								</div>
							</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<Alert>
				<AlertCircle class="h-4 w-4" />
				<AlertDescription>
					This will immediately sync the employee with QuickBooks in the selected direction.
				</AlertDescription>
			</Alert>
		</div>

		<DialogFooter>
			<Button
				variant="outline"
				onclick={() => {
					syncDialogOpen = false;
				}}
			>
				Cancel
			</Button>
			<Button onclick={triggerSync} disabled={syncing}>
				{#if syncing}
					<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
					Syncing...
				{:else}
					<RefreshCw class="h-4 w-4 mr-2" />
					Trigger Sync
				{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
