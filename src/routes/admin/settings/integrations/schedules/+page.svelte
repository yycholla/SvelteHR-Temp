<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import {
		AlertCircle,
		CheckCircle2,
		RefreshCw,
		ArrowLeft,
		Clock,
		Plus,
		Edit,
		Trash2,
		Power,
		PowerOff,
		Calendar,
		Filter,
		History,
		Zap
	} from '@lucide/svelte';
	import { invalidate, goto } from '$app/navigation';
	import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
	import {
		CREATE_SYNC_SCHEDULE,
		UPDATE_SYNC_SCHEDULE,
		DELETE_SYNC_SCHEDULE,
		TOGGLE_SYNC_SCHEDULE
	} from '$lib/graphql/operations/sync-schedule';
	import { browser } from '$app/environment';

	let { data } = $props();
	let schedules = $derived(data.schedules);
	let selectedSchedule = $derived(data.selectedSchedule);
	let history = $derived(data.history);
	let filters = $derived(data.filters || {});

	let refreshing = $state(false);
	let selectedEnabled = $state('all');
	let selectedEntityType = $state('all');
	let showCreateDialog = $state(false);
	let showEditDialog = $state(false);
	let showDeleteDialog = $state(false);
	let scheduleToEdit = $state<any>(null);
	let scheduleToDelete = $state<any>(null);
	let submitting = $state(false);

	// Form state for create/edit
	let formData = $state({
		name: '',
		description: '',
		cronExpression: '0 0 2 * * *', // Default: 2 AM daily
		entityType: 'Employee',
		syncDirection: 'Pull',
		enabled: true,
		businessHoursOnly: false,
		timezone: 'UTC'
	});

	$effect(() => {
		if (filters.enabled !== undefined) selectedEnabled = filters.enabled ? 'true' : 'all';
		if (filters.entityType) selectedEntityType = filters.entityType;
	});

	// Entity types
	const entityTypes = [
		{ value: 'all', label: 'All Types' },
		{ value: 'Employee', label: 'Employees' },
		{ value: 'Department', label: 'Departments' },
		{ value: 'Both', label: 'Both' }
	];

	// Sync directions
	const syncDirections = [
		{ value: 'Pull', label: 'Pull from QuickBooks' },
		{ value: 'Push', label: 'Push to QuickBooks' },
		{ value: 'Bidirectional', label: 'Bidirectional Sync' }
	];

	// Preset cron expressions
	const cronPresets = [
		{ value: '0 0 2 * * *', label: 'Daily at 2 AM' },
		{ value: '0 0 */6 * * *', label: 'Every 6 hours' },
		{ value: '0 0 9 * * 1-5', label: 'Weekdays at 9 AM' },
		{ value: '0 30 14 * * *', label: 'Daily at 2:30 PM' },
		{ value: '0 0 0 * * 0', label: 'Weekly on Sunday' },
		{ value: 'custom', label: 'Custom Expression' }
	];

	// Timezones (common ones)
	const timezones = [
		{ value: 'UTC', label: 'UTC' },
		{ value: 'America/New_York', label: 'Eastern Time' },
		{ value: 'America/Chicago', label: 'Central Time' },
		{ value: 'America/Denver', label: 'Mountain Time' },
		{ value: 'America/Los_Angeles', label: 'Pacific Time' }
	];

	async function refreshData() {
		refreshing = true;
		await invalidate('app:schedules');
		refreshing = false;
	}

	function viewSchedule(scheduleId: string) {
		goto(`?scheduleId=${scheduleId}`);
	}

	function backToList() {
		goto('/admin/settings/integrations/schedules');
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (selectedEnabled === 'true') params.set('enabled', 'true');
		if (selectedEntityType !== 'all') params.set('entityType', selectedEntityType);
		goto(`?${params.toString()}`);
	}

	function openCreateDialog() {
		formData = {
			name: '',
			description: '',
			cronExpression: '0 0 2 * * *',
			entityType: 'Employee',
			syncDirection: 'Pull',
			enabled: true,
			businessHoursOnly: false,
			timezone: 'UTC'
		};
		showCreateDialog = true;
	}

	function openEditDialog(schedule: any) {
		scheduleToEdit = schedule;
		formData = {
			name: schedule.name,
			description: schedule.description || '',
			cronExpression: schedule.cronExpression,
			entityType: schedule.entityType,
			syncDirection: schedule.syncDirection,
			enabled: schedule.enabled,
			businessHoursOnly: schedule.businessHoursOnly,
			timezone: schedule.timezone
		};
		showEditDialog = true;
	}

	function openDeleteDialog(schedule: any) {
		scheduleToDelete = schedule;
		showDeleteDialog = true;
	}

	async function createSchedule() {
		if (!browser) return;

		submitting = true;
		try {
			const client = createUrqlClient(fetch);
			const result = await client
				.mutation(CREATE_SYNC_SCHEDULE, {
					input: {
						name: formData.name,
						description: formData.description || null,
						cron_expression: formData.cronExpression,
						entity_type: formData.entityType,
						sync_direction: formData.syncDirection,
						enabled: formData.enabled,
						business_hours_only: formData.businessHoursOnly,
						timezone: formData.timezone
					}
				})
				.toPromise();

			if (result.error) {
				alert('Failed to create schedule: ' + result.error.message);
			} else {
				showCreateDialog = false;
				await refreshData();
			}
		} catch (e) {
			alert('An error occurred: ' + e);
		} finally {
			submitting = false;
		}
	}

	async function updateSchedule() {
		if (!browser || !scheduleToEdit) return;

		submitting = true;
		try {
			const client = createUrqlClient(fetch);
			const result = await client
				.mutation(UPDATE_SYNC_SCHEDULE, {
					input: {
						schedule_id: scheduleToEdit.id,
						name: formData.name !== scheduleToEdit.name ? formData.name : null,
						description: formData.description !== scheduleToEdit.description ? formData.description : null,
						cron_expression: formData.cronExpression !== scheduleToEdit.cronExpression ? formData.cronExpression : null,
						entity_type: formData.entityType !== scheduleToEdit.entityType ? formData.entityType : null,
						sync_direction: formData.syncDirection !== scheduleToEdit.syncDirection ? formData.syncDirection : null,
						enabled: formData.enabled !== scheduleToEdit.enabled ? formData.enabled : null,
						business_hours_only: formData.businessHoursOnly !== scheduleToEdit.businessHoursOnly ? formData.businessHoursOnly : null,
						timezone: formData.timezone !== scheduleToEdit.timezone ? formData.timezone : null
					}
				})
				.toPromise();

			if (result.error) {
				alert('Failed to update schedule: ' + result.error.message);
			} else {
				showEditDialog = false;
				scheduleToEdit = null;
				await refreshData();
			}
		} catch (e) {
			alert('An error occurred: ' + e);
		} finally {
			submitting = false;
		}
	}

	async function deleteSchedule() {
		if (!browser || !scheduleToDelete) return;

		submitting = true;
		try {
			const client = createUrqlClient(fetch);
			const result = await client
				.mutation(DELETE_SYNC_SCHEDULE, {
					scheduleId: scheduleToDelete.id
				})
				.toPromise();

			if (result.error) {
				alert('Failed to delete schedule: ' + result.error.message);
			} else {
				showDeleteDialog = false;
				scheduleToDelete = null;
				await refreshData();
			}
		} catch (e) {
			alert('An error occurred: ' + e);
		} finally {
			submitting = false;
		}
	}

	async function toggleSchedule(schedule: any) {
		if (!browser) return;

		try {
			const client = createUrqlClient(fetch);
			const result = await client
				.mutation(TOGGLE_SYNC_SCHEDULE, {
					scheduleId: schedule.id,
					enabled: !schedule.enabled
				})
				.toPromise();

			if (result.error) {
				alert('Failed to toggle schedule: ' + result.error.message);
			} else {
				await refreshData();
			}
		} catch (e) {
			alert('An error occurred: ' + e);
		}
	}

	function formatDate(dateStr: string): string {
		if (!dateStr) return 'N/A';
		const date = new Date(dateStr);
		return date.toLocaleString();
	}

	function formatDuration(ms: number | null): string {
		if (!ms) return 'N/A';
		if (ms < 1000) return `${ms}ms`;
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds}s`;
	}

	function getStatusColor(status: string): string {
		switch (status.toLowerCase()) {
			case 'success':
			case 'completed':
				return 'text-green-600 bg-green-50 border-green-200';
			case 'running':
			case 'processing':
				return 'text-blue-600 bg-blue-50 border-blue-200';
			case 'pending':
				return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			case 'failed':
			case 'error':
				return 'text-red-600 bg-red-50 border-red-200';
			default:
				return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	}
</script>

<div class="container mx-auto py-8 px-4">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-4">
			{#if selectedSchedule}
				<Button onclick={backToList} variant="outline" size="sm">
					<ArrowLeft class="h-4 w-4 mr-2" />
					Back to Schedules
				</Button>
			{/if}
			<div>
				<h1 class="text-2xl font-bold flex items-center gap-2">
					<Calendar class="h-6 w-6" />
					{selectedSchedule ? 'Schedule Details' : 'Sync Schedules'}
				</h1>
				<p class="text-sm text-muted-foreground mt-1">
					{selectedSchedule
						? 'View schedule execution history and configuration'
						: 'Automated QuickBooks synchronization schedules'}
				</p>
			</div>
		</div>
		<div class="flex gap-2">
			{#if !selectedSchedule}
				<Button onclick={openCreateDialog} size="sm">
					<Plus class="h-4 w-4 mr-2" />
					New Schedule
				</Button>
			{/if}
			<Button onclick={refreshData} disabled={refreshing} variant="outline" size="sm">
				<RefreshCw class="h-4 w-4 mr-2 {refreshing ? 'animate-spin' : ''}" />
				Refresh
			</Button>
		</div>
	</div>

	{#if data.error}
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription>{data.error}</AlertDescription>
		</Alert>
	{/if}

	{#if selectedSchedule}
		<!-- Schedule Detail View -->
		<div class="space-y-6">
			<!-- Schedule Info -->
			<Card>
				<CardHeader>
					<div class="flex items-start justify-between">
						<div>
							<CardTitle>{selectedSchedule.name}</CardTitle>
							<CardDescription>{selectedSchedule.description || 'No description'}</CardDescription>
						</div>
						<div class="flex gap-2">
							<Button onclick={() => toggleSchedule(selectedSchedule)} variant="outline" size="sm">
								{#if selectedSchedule.enabled}
									<PowerOff class="h-4 w-4 mr-2" />
									Disable
								{:else}
									<Power class="h-4 w-4 mr-2" />
									Enable
								{/if}
							</Button>
							<Button onclick={() => openEditDialog(selectedSchedule)} variant="outline" size="sm">
								<Edit class="h-4 w-4 mr-2" />
								Edit
							</Button>
							<Button onclick={() => openDeleteDialog(selectedSchedule)} variant="destructive" size="sm">
								<Trash2 class="h-4 w-4 mr-2" />
								Delete
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div class="grid grid-cols-2 md:grid-cols-4 gap-6">
						<div>
							<p class="text-sm text-muted-foreground">Status</p>
							<Badge variant={selectedSchedule.enabled ? 'default' : 'secondary'}>
								{selectedSchedule.enabled ? 'Enabled' : 'Disabled'}
							</Badge>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Entity Type</p>
							<p class="text-lg font-medium">{selectedSchedule.entityType}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Direction</p>
							<p class="text-lg font-medium">{selectedSchedule.syncDirection}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Timezone</p>
							<p class="text-lg font-medium">{selectedSchedule.timezone}</p>
						</div>
					</div>

					<div class="mt-6 pt-6 border-t">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
							<div>
								<span class="text-muted-foreground">Cron Expression:</span>
								<code class="ml-2 px-2 py-1 bg-muted rounded font-mono text-xs">{selectedSchedule.cronExpression}</code>
							</div>
							<div>
								<span class="text-muted-foreground">Business Hours Only:</span>
								<span class="ml-2 font-medium">{selectedSchedule.businessHoursOnly ? 'Yes' : 'No'}</span>
							</div>
							{#if selectedSchedule.lastRunAt}
								<div>
									<span class="text-muted-foreground">Last Run:</span>
									<span class="ml-2 font-medium">{formatDate(selectedSchedule.lastRunAt)}</span>
								</div>
							{/if}
							{#if selectedSchedule.nextRunAt}
								<div>
									<span class="text-muted-foreground">Next Run:</span>
									<span class="ml-2 font-medium">{formatDate(selectedSchedule.nextRunAt)}</span>
								</div>
							{/if}
						</div>
					</div>
				</CardContent>
			</Card>

			<!-- Execution History -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<History class="h-5 w-5" />
						Execution History
					</CardTitle>
					<CardDescription>Recent schedule executions</CardDescription>
				</CardHeader>
				<CardContent>
					{#if history.length === 0}
						<div class="text-center py-12 text-muted-foreground">
							<Clock class="h-12 w-12 mx-auto mb-3" />
							<p class="font-medium">No execution history</p>
							<p class="text-sm">This schedule hasn't run yet</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each history as run}
								<div class="border rounded-lg p-4">
									<div class="flex items-start justify-between mb-2">
										<div class="flex-1">
											<div class="flex items-center gap-2 mb-1">
												<div
													class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border {getStatusColor(
														run.status
													)}"
												>
													{run.status}
												</div>
												<p class="text-sm text-muted-foreground">
													{formatDate(run.startedAt)}
												</p>
											</div>
											{#if run.completedAt}
												<p class="text-xs text-muted-foreground">
													Duration: {formatDuration(run.executionTimeMs)}
												</p>
											{/if}
										</div>
										<div class="text-right text-sm">
											{#if run.recordsSynced !== null}
												<p class="text-muted-foreground">
													<span class="font-medium text-foreground">{run.recordsSynced}</span> records synced
												</p>
											{/if}
											{#if run.errorsCount}
												<p class="text-red-600">
													<span class="font-medium">{run.errorsCount}</span> errors
												</p>
											{/if}
										</div>
									</div>

									{#if run.errorMessage}
										<div class="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
											<AlertCircle class="inline h-4 w-4 mr-1" />
											{run.errorMessage}
										</div>
									{/if}

									{#if run.recordsPushed || run.recordsPulled}
										<div class="mt-2 flex gap-4 text-xs text-muted-foreground">
											{#if run.recordsPushed}
												<span>Pushed: {run.recordsPushed}</span>
											{/if}
											{#if run.recordsPulled}
												<span>Pulled: {run.recordsPulled}</span>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>
	{:else}
		<!-- Schedules List View -->
		<div class="space-y-6">
			<!-- Statistics -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card>
					<CardHeader class="pb-2">
						<CardDescription>Total Schedules</CardDescription>
					</CardHeader>
					<CardContent>
						<p class="text-3xl font-bold">{data.total}</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader class="pb-2">
						<CardDescription>Enabled</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="flex items-center gap-2">
							<CheckCircle2 class="h-8 w-8 text-green-500" />
							<p class="text-3xl font-bold">
								{schedules.filter((s: any) => s.enabled).length}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader class="pb-2">
						<CardDescription>Disabled</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="flex items-center gap-2">
							<PowerOff class="h-8 w-8 text-gray-400" />
							<p class="text-3xl font-bold">
								{schedules.filter((s: any) => !s.enabled).length}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader class="pb-2">
						<CardDescription>Next Run</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="flex items-center gap-2">
							<Zap class="h-8 w-8 text-purple-500" />
							<p class="text-sm font-medium">
								{#if schedules.filter((s: any) => s.enabled && s.nextRunAt).length > 0}
									{formatDate(schedules.filter((s: any) => s.enabled && s.nextRunAt).sort((a: any, b: any) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime())[0]?.nextRunAt).split(',')[0]}
								{:else}
									None scheduled
								{/if}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			<!-- Filters -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Filter class="h-5 w-5" />
						Filters
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Select
							value={selectedEnabled as any}
							onValueChange={(value: any) => {
								selectedEnabled = value;
								applyFilters();
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder="Filter by status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								<SelectItem value="true">Enabled Only</SelectItem>
							</SelectContent>
						</Select>

						<Select
							value={selectedEntityType as any}
							onValueChange={(value: any) => {
								selectedEntityType = value;
								applyFilters();
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder="Filter by entity type" />
							</SelectTrigger>
							<SelectContent>
								{#each entityTypes as type}
									<SelectItem value={type.value}>{type.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			<!-- Schedules List -->
			<Card>
				<CardHeader>
					<CardTitle>Sync Schedules</CardTitle>
					<CardDescription>Manage automated synchronization schedules</CardDescription>
				</CardHeader>
				<CardContent>
					{#if schedules.length === 0}
						<div class="text-center py-12 text-muted-foreground">
							<Calendar class="h-12 w-12 mx-auto mb-3" />
							<p class="font-medium">No schedules configured</p>
							<p class="text-sm">Create a schedule to automate QuickBooks synchronization</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each schedules as schedule}
								<button
									onclick={() => viewSchedule(schedule.id)}
									class="w-full text-left border rounded-lg p-4 hover:bg-muted/30 transition-colors"
								>
									<div class="flex items-start justify-between mb-2">
										<div class="flex-1">
											<div class="flex items-center gap-2 mb-1">
												<p class="font-medium">{schedule.name}</p>
												<Badge variant={schedule.enabled ? 'default' : 'secondary'}>
													{schedule.enabled ? 'Enabled' : 'Disabled'}
												</Badge>
												<Badge variant="outline">{schedule.entityType}</Badge>
												<Badge variant="outline">{schedule.syncDirection}</Badge>
											</div>
											<p class="text-sm text-muted-foreground">
												{schedule.description || 'No description'}
											</p>
										</div>
										<div class="text-right text-sm">
											{#if schedule.nextRunAt}
												<p class="text-muted-foreground">
													Next: {formatDate(schedule.nextRunAt)}
												</p>
											{/if}
											{#if schedule.lastRunStatus}
												<div
													class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border mt-1 {getStatusColor(
														schedule.lastRunStatus
													)}"
												>
													{schedule.lastRunStatus}
												</div>
											{/if}
										</div>
									</div>

									<div class="flex gap-4 text-xs text-muted-foreground">
										<span class="font-mono">{schedule.cronExpression}</span>
										<span>{schedule.timezone}</span>
										{#if schedule.businessHoursOnly}
											<span>Business hours only</span>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>
	{/if}
</div>

<!-- Create Schedule Dialog -->
<Dialog bind:open={showCreateDialog}>
	<DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
		<DialogHeader>
			<DialogTitle>Create Sync Schedule</DialogTitle>
			<DialogDescription>
				Set up a new automated synchronization schedule with QuickBooks
			</DialogDescription>
		</DialogHeader>

		<div class="space-y-4">
			<div>
				<Label for="name">Schedule Name *</Label>
				<Input id="name" bind:value={formData.name} placeholder="Daily Employee Sync" />
			</div>

			<div>
				<Label for="description">Description</Label>
				<Textarea
					id="description"
					bind:value={formData.description}
					placeholder="Synchronizes employee data daily..."
				/>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<Label for="entityType">Entity Type *</Label>
					<Select
						value={formData.entityType as any}
						onValueChange={(value: any) => {
							formData.entityType = value;
						}}
					>
						<SelectTrigger id="entityType">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{#each entityTypes.filter((t) => t.value !== 'all') as type}
								<SelectItem value={type.value}>{type.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>

				<div>
					<Label for="syncDirection">Sync Direction *</Label>
					<Select
						value={formData.syncDirection as any}
						onValueChange={(value: any) => {
							formData.syncDirection = value;
						}}
					>
						<SelectTrigger id="syncDirection">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{#each syncDirections as direction}
								<SelectItem value={direction.value}>{direction.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div>
				<Label for="cronPreset">Schedule *</Label>
				<Select
					value={cronPresets.find((p) => p.value === formData.cronExpression)?.value || 'custom'}
					onValueChange={(value: any) => {
						if (value !== 'custom') {
							formData.cronExpression = value;
						}
					}}
				>
					<SelectTrigger id="cronPreset">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{#each cronPresets as preset}
							<SelectItem value={preset.value}>{preset.label}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<div>
				<Label for="cronExpression">Cron Expression *</Label>
				<Input
					id="cronExpression"
					bind:value={formData.cronExpression}
					placeholder="0 0 2 * * *"
					class="font-mono"
				/>
				<p class="text-xs text-muted-foreground mt-1">
					Format: second minute hour day month day_of_week
				</p>
			</div>

			<div>
				<Label for="timezone">Timezone *</Label>
				<Select
					value={formData.timezone as any}
					onValueChange={(value: any) => {
						formData.timezone = value;
					}}
				>
					<SelectTrigger id="timezone">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{#each timezones as tz}
							<SelectItem value={tz.value}>{tz.label}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<div class="flex items-center gap-4">
				<div class="flex items-center gap-2">
					<Switch id="enabled" bind:checked={formData.enabled} />
					<Label for="enabled">Enabled</Label>
				</div>

				<div class="flex items-center gap-2">
					<Switch id="businessHours" bind:checked={formData.businessHoursOnly} />
					<Label for="businessHours">Business Hours Only</Label>
				</div>
			</div>
		</div>

		<DialogFooter>
			<Button
				variant="outline"
				onclick={() => {
					showCreateDialog = false;
				}}
			>
				Cancel
			</Button>
			<Button onclick={createSchedule} disabled={submitting || !formData.name}>
				{submitting ? 'Creating...' : 'Create Schedule'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<!-- Edit Schedule Dialog -->
<Dialog bind:open={showEditDialog}>
	<DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
		<DialogHeader>
			<DialogTitle>Edit Sync Schedule</DialogTitle>
			<DialogDescription>Update the schedule configuration</DialogDescription>
		</DialogHeader>

		<div class="space-y-4">
			<div>
				<Label for="edit-name">Schedule Name *</Label>
				<Input id="edit-name" bind:value={formData.name} />
			</div>

			<div>
				<Label for="edit-description">Description</Label>
				<Textarea id="edit-description" bind:value={formData.description} />
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<Label for="edit-entityType">Entity Type *</Label>
					<Select
						value={formData.entityType as any}
						onValueChange={(value: any) => {
							formData.entityType = value;
						}}
					>
						<SelectTrigger id="edit-entityType">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{#each entityTypes.filter((t) => t.value !== 'all') as type}
								<SelectItem value={type.value}>{type.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>

				<div>
					<Label for="edit-syncDirection">Sync Direction *</Label>
					<Select
						value={formData.syncDirection as any}
						onValueChange={(value: any) => {
							formData.syncDirection = value;
						}}
					>
						<SelectTrigger id="edit-syncDirection">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{#each syncDirections as direction}
								<SelectItem value={direction.value}>{direction.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div>
				<Label for="edit-cronExpression">Cron Expression *</Label>
				<Input
					id="edit-cronExpression"
					bind:value={formData.cronExpression}
					class="font-mono"
				/>
			</div>

			<div>
				<Label for="edit-timezone">Timezone *</Label>
				<Select
					value={formData.timezone as any}
					onValueChange={(value: any) => {
						formData.timezone = value;
					}}
				>
					<SelectTrigger id="edit-timezone">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{#each timezones as tz}
							<SelectItem value={tz.value}>{tz.label}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<div class="flex items-center gap-4">
				<div class="flex items-center gap-2">
					<Switch id="edit-enabled" bind:checked={formData.enabled} />
					<Label for="edit-enabled">Enabled</Label>
				</div>

				<div class="flex items-center gap-2">
					<Switch id="edit-businessHours" bind:checked={formData.businessHoursOnly} />
					<Label for="edit-businessHours">Business Hours Only</Label>
				</div>
			</div>
		</div>

		<DialogFooter>
			<Button
				variant="outline"
				onclick={() => {
					showEditDialog = false;
					scheduleToEdit = null;
				}}
			>
				Cancel
			</Button>
			<Button onclick={updateSchedule} disabled={submitting || !formData.name}>
				{submitting ? 'Updating...' : 'Update Schedule'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<!-- Delete Confirmation Dialog -->
<Dialog bind:open={showDeleteDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Delete Schedule</DialogTitle>
			<DialogDescription>
				Are you sure you want to delete "{scheduleToDelete?.name}"? This action cannot be undone.
			</DialogDescription>
		</DialogHeader>

		<DialogFooter>
			<Button
				variant="outline"
				onclick={() => {
					showDeleteDialog = false;
					scheduleToDelete = null;
				}}
			>
				Cancel
			</Button>
			<Button variant="destructive" onclick={deleteSchedule} disabled={submitting}>
				{submitting ? 'Deleting...' : 'Delete'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
