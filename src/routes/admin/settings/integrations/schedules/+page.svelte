<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
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
		timezone: 'UTC',
		// Additional fields for building cron expression
		scheduleType: 'daily', // daily, every6h, weekdays, weekly, custom
		hour: 2,
		minute: 0,
		dayOfWeek: 0 // 0 = Sunday
	});

	$effect(() => {
		const f = filters as any;
		if (f.enabled !== undefined) selectedEnabled = f.enabled ? 'true' : 'all';
		if (f.entityType) selectedEntityType = f.entityType;
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

	// Schedule types
	const scheduleTypes = [
		{ value: 'daily', label: 'Daily', description: 'Run once per day at a specific time' },
		{ value: 'every6h', label: 'Every 6 hours', description: 'Run four times per day' },
		{
			value: 'weekdays',
			label: 'Weekdays only',
			description: 'Run Monday-Friday at a specific time'
		},
		{
			value: 'weekly',
			label: 'Weekly',
			description: 'Run once per week on a specific day and time'
		},
		{
			value: 'custom',
			label: 'Custom cron expression',
			description: 'Enter a custom cron expression'
		}
	];

	// Hours (0-23)
	const hours = Array.from({ length: 24 }, (_, i) => ({
		value: i.toString(),
		label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`
	}));

	// Minutes
	const minutes = [
		{ value: '0', label: '00' },
		{ value: '15', label: '15' },
		{ value: '30', label: '30' },
		{ value: '45', label: '45' }
	];

	// Days of week
	const daysOfWeek = [
		{ value: '0', label: 'Sunday' },
		{ value: '1', label: 'Monday' },
		{ value: '2', label: 'Tuesday' },
		{ value: '3', label: 'Wednesday' },
		{ value: '4', label: 'Thursday' },
		{ value: '5', label: 'Friday' },
		{ value: '6', label: 'Saturday' }
	];

	// Timezones (common ones)
	const timezones = [
		{ value: 'UTC', label: 'UTC' },
		{ value: 'America/New_York', label: 'Eastern Time' },
		{ value: 'America/Chicago', label: 'Central Time' },
		{ value: 'America/Denver', label: 'Mountain Time' },
		{ value: 'America/Los_Angeles', label: 'Pacific Time' }
	];

	// Build cron expression from form data
	function buildCronExpression() {
		const { scheduleType, hour, minute, dayOfWeek } = formData;

		switch (scheduleType) {
			case 'daily':
				return `0 ${minute} ${hour} * * *`;
			case 'every6h':
				return `0 0 */6 * * *`;
			case 'weekdays':
				return `0 ${minute} ${hour} * * 1-5`;
			case 'weekly':
				return `0 ${minute} ${hour} * * ${dayOfWeek}`;
			case 'custom':
				return formData.cronExpression;
			default:
				return formData.cronExpression;
		}
	}

	// Update cron expression when schedule type or time changes
	$effect(() => {
		if (formData.scheduleType !== 'custom') {
			formData.cronExpression = buildCronExpression();
		}
	});

	// Derived display values for selects
	const entityTypeLabel = $derived(
		entityTypes.find((t) => t.value === formData.entityType)?.label || 'Select entity type'
	);
	const syncDirectionLabel = $derived(
		syncDirections.find((d) => d.value === formData.syncDirection)?.label || 'Select sync direction'
	);
	const scheduleTypeLabel = $derived(
		scheduleTypes.find((s) => s.value === formData.scheduleType)?.label || 'Select schedule type'
	);
	const hourLabel = $derived(
		hours.find((h) => h.value === formData.hour.toString())?.label || 'Select hour'
	);
	const minuteLabel = $derived(
		minutes.find((m) => m.value === formData.minute.toString())?.label || 'Select minute'
	);
	const dayOfWeekLabel = $derived(
		daysOfWeek.find((d) => d.value === formData.dayOfWeek.toString())?.label || 'Select day'
	);
	const timezoneLabel = $derived(
		timezones.find((tz) => tz.value === formData.timezone)?.label || 'Select timezone'
	);
	const statusFilterLabel = $derived(
		selectedEnabled === 'all'
			? 'All Statuses'
			: selectedEnabled === 'true'
				? 'Enabled Only'
				: 'Filter by status'
	);
	const entityTypeFilterLabel = $derived(
		entityTypes.find((t) => t.value === selectedEntityType)?.label || 'Filter by entity type'
	);

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
			timezone: 'UTC',
			scheduleType: 'daily',
			hour: 2,
			minute: 0,
			dayOfWeek: 0
		};
		showCreateDialog = true;
	}

	function openEditDialog(schedule: any) {
		scheduleToEdit = schedule;

		// Parse cron expression to determine schedule type and time
		const cronParts = schedule.cronExpression.split(' ');
		const minute = parseInt(cronParts[1]);
		const hour = parseInt(cronParts[2]);
		const dayOfMonth = cronParts[3];
		const month = cronParts[4];
		const dayOfWeek = cronParts[5];

		let scheduleType = 'custom';
		let parsedDayOfWeek = 0;

		if (hour.toString() === cronParts[2] && dayOfMonth === '*' && month === '*') {
			if (dayOfWeek === '*') {
				scheduleType = 'daily';
			} else if (dayOfWeek === '1-5') {
				scheduleType = 'weekdays';
			} else if (!isNaN(parseInt(dayOfWeek))) {
				scheduleType = 'weekly';
				parsedDayOfWeek = parseInt(dayOfWeek);
			}
		} else if (cronParts[2] === '*/6') {
			scheduleType = 'every6h';
		}

		formData = {
			name: schedule.name,
			description: schedule.description || '',
			cronExpression: schedule.cronExpression,
			entityType: schedule.entityType,
			syncDirection: schedule.syncDirection,
			enabled: schedule.enabled,
			businessHoursOnly: schedule.businessHoursOnly,
			timezone: schedule.timezone,
			scheduleType,
			hour: isNaN(hour) ? 2 : hour,
			minute: isNaN(minute) ? 0 : minute,
			dayOfWeek: parsedDayOfWeek
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
						cronExpression: formData.cronExpression,
						entityType: formData.entityType,
						syncDirection: formData.syncDirection,
						enabled: formData.enabled,
						businessHoursOnly: formData.businessHoursOnly,
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
						scheduleId: scheduleToEdit.id,
						name: formData.name !== scheduleToEdit.name ? formData.name : null,
						description:
							formData.description !== scheduleToEdit.description ? formData.description : null,
						cronExpression:
							formData.cronExpression !== scheduleToEdit.cronExpression
								? formData.cronExpression
								: null,
						entityType:
							formData.entityType !== scheduleToEdit.entityType ? formData.entityType : null,
						syncDirection:
							formData.syncDirection !== scheduleToEdit.syncDirection
								? formData.syncDirection
								: null,
						enabled: formData.enabled !== scheduleToEdit.enabled ? formData.enabled : null,
						businessHoursOnly:
							formData.businessHoursOnly !== scheduleToEdit.businessHoursOnly
								? formData.businessHoursOnly
								: null,
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

<div class="flex flex-col h-full">
	<!-- Toolbar -->
	<div class="h-14 px-4 border-b flex items-center justify-between bg-background">
		<div class="flex items-center gap-3">
			{#if selectedSchedule}
				<Button onclick={backToList} variant="ghost" size="sm">
					<ArrowLeft class="h-4 w-4 mr-1" />
					Back
				</Button>
			{/if}
			<div class="flex items-center gap-2">
				<Calendar class="h-4 w-4 text-muted-foreground" />
				<h1 class="text-sm font-semibold">
					{selectedSchedule ? 'Schedule Details' : 'Sync Schedules'}
				</h1>
			</div>
			<span class="text-xs text-muted-foreground">
				{selectedSchedule
					? 'View schedule execution history'
					: 'Automated QuickBooks synchronization'}
			</span>
		</div>
		<div class="flex gap-2">
			{#if !selectedSchedule}
				<Button onclick={openCreateDialog} size="sm">
					<Plus class="h-3 w-3 mr-1" />
					New Schedule
				</Button>
			{/if}
			<Button onclick={refreshData} disabled={refreshing} variant="outline" size="sm">
				<RefreshCw class="h-3 w-3 mr-1 {refreshing ? 'animate-spin' : ''}" />
				Refresh
			</Button>
		</div>
	</div>

	{#if data.error}
		<Alert variant="destructive" class="m-4">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription>{data.error}</AlertDescription>
		</Alert>
	{/if}

	<div class="flex-1 overflow-auto p-4">
		{#if selectedSchedule}
			<!-- Schedule Detail View -->
			<div class="space-y-0">
				<!-- Schedule Info -->
				<div class="border-b bg-background">
					<div class="px-4 py-3 border-b bg-muted/5">
						<div class="flex items-start justify-between">
							<div>
								<h2 class="text-xs font-semibold uppercase tracking-wider">
									{selectedSchedule.name}
								</h2>
								<p class="text-xs text-muted-foreground mt-0.5">
									{selectedSchedule.description || 'No description'}
								</p>
							</div>
							<div class="flex gap-2">
								<Button
									onclick={() => toggleSchedule(selectedSchedule)}
									variant="outline"
									size="sm"
								>
									{#if selectedSchedule.enabled}
										<PowerOff class="h-3 w-3 mr-1" />
										Disable
									{:else}
										<Power class="h-3 w-3 mr-1" />
										Enable
									{/if}
								</Button>
								<Button
									onclick={() => openEditDialog(selectedSchedule)}
									variant="outline"
									size="sm"
								>
									<Edit class="h-3 w-3 mr-1" />
									Edit
								</Button>
								<Button
									onclick={() => openDeleteDialog(selectedSchedule)}
									variant="destructive"
									size="sm"
								>
									<Trash2 class="h-3 w-3 mr-1" />
									Delete
								</Button>
							</div>
						</div>
					</div>
					<div class="p-4">
						<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
							<div>
								<p class="text-xs text-muted-foreground">Status</p>
								<Badge variant={selectedSchedule.enabled ? 'default' : 'secondary'} class="mt-1">
									{selectedSchedule.enabled ? 'Enabled' : 'Disabled'}
								</Badge>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Entity Type</p>
								<p class="text-sm font-medium mt-1">{selectedSchedule.entityType}</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Direction</p>
								<p class="text-sm font-medium mt-1">{selectedSchedule.syncDirection}</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Timezone</p>
								<p class="text-sm font-medium mt-1">{selectedSchedule.timezone}</p>
							</div>
						</div>

						<div class="pt-4 border-t">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
								<div>
									<span class="text-muted-foreground">Cron Expression:</span>
									<code class="ml-2 px-2 py-1 bg-muted rounded font-mono"
										>{selectedSchedule.cronExpression}</code
									>
								</div>
								<div>
									<span class="text-muted-foreground">Business Hours Only:</span>
									<span class="ml-2 font-medium"
										>{selectedSchedule.businessHoursOnly ? 'Yes' : 'No'}</span
									>
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
					</div>
				</div>

				<!-- Execution History -->
				<div class="border-b bg-background">
					<div class="px-4 py-3 border-b bg-muted/5">
						<div class="flex items-center gap-2">
							<History class="h-4 w-4 text-muted-foreground" />
							<h3 class="text-xs font-semibold uppercase tracking-wider">Execution History</h3>
						</div>
						<p class="text-xs text-muted-foreground mt-0.5">Recent schedule executions</p>
					</div>
					<div class="p-4">
						{#if history.length === 0}
							<div class="text-center py-12 text-muted-foreground">
								<Clock class="h-12 w-12 mx-auto mb-3 opacity-50" />
								<p class="text-sm font-medium">No execution history</p>
								<p class="text-xs">This schedule hasn't run yet</p>
							</div>
						{:else}
							<div class="divide-y">
								{#each history as run}
									<div class="p-3">
										<div class="flex items-start justify-between mb-2">
											<div class="flex-1">
												<div class="flex items-center gap-2 mb-1">
													<div
														class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border {getStatusColor(
															run.status
														)}"
													>
														{run.status}
													</div>
													<p class="text-xs text-muted-foreground">
														{formatDate(run.startedAt)}
													</p>
												</div>
												{#if run.completedAt}
													<p class="text-xs text-muted-foreground">
														Duration: {formatDuration(run.executionTimeMs)}
													</p>
												{/if}
											</div>
											<div class="text-right text-xs">
												{#if run.recordsSynced !== null}
													<p class="text-muted-foreground">
														<span class="font-medium text-foreground">{run.recordsSynced}</span> synced
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
											<div
												class="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800"
											>
												<AlertCircle class="inline h-3 w-3 mr-1" />
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
					</div>
				</div>
			</div>
		{:else}
			<!-- Schedules List View -->
			<div class="space-y-0">
				<!-- KPI Metrics -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b">
					<div
						class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32"
					>
						<p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Total Schedules
						</p>
						<p class="text-3xl font-bold tracking-tight">{data.total}</p>
					</div>

					<div
						class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32"
					>
						<p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Enabled
						</p>
						<div class="flex items-center gap-2">
							<CheckCircle2 class="h-6 w-6 text-green-600" />
							<p class="text-3xl font-bold tracking-tight">
								{schedules.filter((s: any) => s.enabled).length}
							</p>
						</div>
					</div>

					<div
						class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32"
					>
						<p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Disabled
						</p>
						<div class="flex items-center gap-2">
							<PowerOff class="h-6 w-6 text-muted-foreground" />
							<p class="text-3xl font-bold tracking-tight">
								{schedules.filter((s: any) => !s.enabled).length}
							</p>
						</div>
					</div>

					<div
						class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32"
					>
						<p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Next Run
						</p>
						<div class="flex items-center gap-2">
							<Zap class="h-6 w-6 text-purple-600" />
							<p class="text-xs font-medium">
								{#if schedules.filter((s: any) => s.enabled && s.nextRunAt).length > 0}
									{formatDate(
										schedules
											.filter((s: any) => s.enabled && s.nextRunAt)
											.sort(
												(a: any, b: any) =>
													new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime()
											)[0]?.nextRunAt
									).split(',')[0]}
								{:else}
									None scheduled
								{/if}
							</p>
						</div>
					</div>
				</div>

				<!-- Filters -->
				<div class="border-b bg-background">
					<div class="px-4 py-3 border-b bg-muted/5">
						<div class="flex items-center gap-2">
							<Filter class="h-3.5 w-3.5 text-muted-foreground" />
							<h3 class="text-xs font-semibold uppercase tracking-wider">Filters</h3>
						</div>
					</div>
					<div class="p-4">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							<Select
								type="single"
								value={selectedEnabled as any}
								onValueChange={(value: any) => {
									selectedEnabled = value;
									applyFilters();
								}}
							>
								<SelectTrigger>
									{statusFilterLabel}
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all" label="All Statuses">All Statuses</SelectItem>
									<SelectItem value="true" label="Enabled Only">Enabled Only</SelectItem>
								</SelectContent>
							</Select>

							<Select
								type="single"
								value={selectedEntityType as any}
								onValueChange={(value: any) => {
									selectedEntityType = value;
									applyFilters();
								}}
							>
								<SelectTrigger>
									{entityTypeFilterLabel}
								</SelectTrigger>
								<SelectContent>
									{#each entityTypes as type}
										<SelectItem value={type.value} label={type.label}>{type.label}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				<!-- Schedules Table -->
				<div class="bg-background overflow-hidden">
					<div class="px-4 py-3 border-b bg-muted/5">
						<h3 class="text-xs font-semibold uppercase tracking-wider">Sync Schedules</h3>
						<p class="text-xs text-muted-foreground mt-0.5">
							Manage automated synchronization schedules
						</p>
					</div>

					{#if schedules.length === 0}
						<div class="text-center py-12 text-muted-foreground">
							<Calendar class="h-12 w-12 mx-auto mb-3 opacity-50" />
							<p class="text-sm font-medium">No schedules configured</p>
							<p class="text-xs">Create a schedule to automate QuickBooks synchronization</p>
						</div>
					{:else}
						<div class="overflow-auto">
							<table class="w-full">
								<thead class="bg-muted/40 backdrop-blur-sm sticky top-0 z-10">
									<tr class="text-xs text-muted-foreground">
										<th class="px-4 py-2 text-left font-medium">Name</th>
										<th class="px-4 py-2 text-left font-medium">Status</th>
										<th class="px-4 py-2 text-left font-medium">Entity</th>
										<th class="px-4 py-2 text-left font-medium">Direction</th>
										<th class="px-4 py-2 text-left font-medium">Schedule</th>
										<th class="px-4 py-2 text-left font-medium">Next Run</th>
										<th class="px-4 py-2 text-left font-medium">Last Status</th>
										<th class="px-4 py-2 text-right font-medium">Actions</th>
									</tr>
								</thead>
								<tbody class="text-xs">
									{#each schedules as schedule}
										<tr class="border-t hover:bg-muted/30 transition-colors">
											<td class="px-4 py-3">
												<button
													onclick={() => viewSchedule(schedule.id)}
													class="text-left hover:underline"
												>
													<p class="font-medium">{schedule.name}</p>
													<p class="text-muted-foreground">
														{schedule.description || 'No description'}
													</p>
												</button>
											</td>
											<td class="px-4 py-3">
												<Badge variant={schedule.enabled ? 'default' : 'secondary'} class="text-xs">
													{schedule.enabled ? 'Enabled' : 'Disabled'}
												</Badge>
											</td>
											<td class="px-4 py-3">
												<Badge variant="outline" class="text-xs">{schedule.entityType}</Badge>
											</td>
											<td class="px-4 py-3">
												<Badge variant="outline" class="text-xs">{schedule.syncDirection}</Badge>
											</td>
											<td class="px-4 py-3">
												<code class="text-xs font-mono">{schedule.cronExpression}</code>
												<p class="text-muted-foreground">{schedule.timezone}</p>
												{#if schedule.businessHoursOnly}
													<p class="text-muted-foreground">Business hours</p>
												{/if}
											</td>
											<td class="px-4 py-3">
												{#if schedule.nextRunAt}
													{formatDate(schedule.nextRunAt)}
												{:else}
													<span class="text-muted-foreground">N/A</span>
												{/if}
											</td>
											<td class="px-4 py-3">
												{#if schedule.lastRunStatus}
													<div
														class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border {getStatusColor(
															schedule.lastRunStatus
														)}"
													>
														{schedule.lastRunStatus}
													</div>
												{:else}
													<span class="text-muted-foreground">N/A</span>
												{/if}
											</td>
											<td class="px-4 py-3 text-right">
												<div class="flex items-center justify-end gap-1">
													<Button
														onclick={() => toggleSchedule(schedule)}
														variant="ghost"
														size="sm"
														class="h-7 w-7 p-0"
													>
														{#if schedule.enabled}
															<PowerOff class="h-3 w-3" />
														{:else}
															<Power class="h-3 w-3" />
														{/if}
													</Button>
													<Button
														onclick={() => openEditDialog(schedule)}
														variant="ghost"
														size="sm"
														class="h-7 w-7 p-0"
													>
														<Edit class="h-3 w-3" />
													</Button>
													<Button
														onclick={() => openDeleteDialog(schedule)}
														variant="ghost"
														size="sm"
														class="h-7 w-7 p-0 text-destructive hover:text-destructive"
													>
														<Trash2 class="h-3 w-3" />
													</Button>
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
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

		<div class="space-y-0">
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
						type="single"
						value={formData.entityType as any}
						onValueChange={(value: any) => {
							formData.entityType = value;
						}}
					>
						<SelectTrigger id="entityType">
							{entityTypeLabel}
						</SelectTrigger>
						<SelectContent>
							{#each entityTypes.filter((t) => t.value !== 'all') as type}
								<SelectItem value={type.value} label={type.label}>{type.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>

				<div>
					<Label for="syncDirection">Sync Direction *</Label>
					<Select
						type="single"
						value={formData.syncDirection as any}
						onValueChange={(value: any) => {
							formData.syncDirection = value;
						}}
					>
						<SelectTrigger id="syncDirection">
							{syncDirectionLabel}
						</SelectTrigger>
						<SelectContent>
							{#each syncDirections as direction}
								<SelectItem value={direction.value} label={direction.label}
									>{direction.label}</SelectItem
								>
							{/each}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div>
				<Label for="scheduleType">Schedule Type *</Label>
				<Select
					type="single"
					value={formData.scheduleType as any}
					onValueChange={(value: any) => {
						formData.scheduleType = value;
					}}
				>
					<SelectTrigger id="scheduleType">
						{scheduleTypeLabel}
					</SelectTrigger>
					<SelectContent>
						{#each scheduleTypes as type}
							<SelectItem value={type.value} label={type.label}>
								<div class="flex flex-col">
									<span class="font-medium">{type.label}</span>
									<span class="text-xs text-muted-foreground">{type.description}</span>
								</div>
							</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<!-- Conditional time inputs based on schedule type -->
			{#if formData.scheduleType === 'daily' || formData.scheduleType === 'weekdays'}
				<div class="grid grid-cols-2 gap-4">
					<div>
						<Label for="hour">Hour *</Label>
						<Select
							type="single"
							value={formData.hour.toString()}
							onValueChange={(value: any) => {
								formData.hour = parseInt(value);
							}}
						>
							<SelectTrigger id="hour">
								{hourLabel}
							</SelectTrigger>
							<SelectContent>
								{#each hours as h}
									<SelectItem value={h.value} label={h.label}>{h.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label for="minute">Minute *</Label>
						<Select
							type="single"
							value={formData.minute.toString()}
							onValueChange={(value: any) => {
								formData.minute = parseInt(value);
							}}
						>
							<SelectTrigger id="minute">
								{minuteLabel}
							</SelectTrigger>
							<SelectContent>
								{#each minutes as m}
									<SelectItem value={m.value} label={m.label}>{m.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
				</div>
			{/if}

			{#if formData.scheduleType === 'weekly'}
				<div class="grid grid-cols-3 gap-4">
					<div>
						<Label for="dayOfWeek">Day of Week *</Label>
						<Select
							type="single"
							value={formData.dayOfWeek.toString()}
							onValueChange={(value: any) => {
								formData.dayOfWeek = parseInt(value);
							}}
						>
							<SelectTrigger id="dayOfWeek">
								{dayOfWeekLabel}
							</SelectTrigger>
							<SelectContent>
								{#each daysOfWeek as day}
									<SelectItem value={day.value} label={day.label}>{day.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label for="weeklyHour">Hour *</Label>
						<Select
							type="single"
							value={formData.hour.toString()}
							onValueChange={(value: any) => {
								formData.hour = parseInt(value);
							}}
						>
							<SelectTrigger id="weeklyHour">
								{hourLabel}
							</SelectTrigger>
							<SelectContent>
								{#each hours as h}
									<SelectItem value={h.value} label={h.label}>{h.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label for="weeklyMinute">Minute *</Label>
						<Select
							type="single"
							value={formData.minute.toString()}
							onValueChange={(value: any) => {
								formData.minute = parseInt(value);
							}}
						>
							<SelectTrigger id="weeklyMinute">
								{minuteLabel}
							</SelectTrigger>
							<SelectContent>
								{#each minutes as m}
									<SelectItem value={m.value} label={m.label}>{m.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
				</div>
			{/if}

			{#if formData.scheduleType === 'custom'}
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
			{/if}

			<!-- Show generated cron expression for non-custom types -->
			{#if formData.scheduleType !== 'custom'}
				<div class="p-3 bg-muted/30 rounded-md border">
					<p class="text-xs text-muted-foreground mb-1">Generated Cron Expression:</p>
					<code class="text-sm font-mono">{formData.cronExpression}</code>
				</div>
			{/if}

			<div>
				<Label for="timezone">Timezone *</Label>
				<Select
					type="single"
					value={formData.timezone as any}
					onValueChange={(value: any) => {
						formData.timezone = value;
					}}
				>
					<SelectTrigger id="timezone">
						{timezoneLabel}
					</SelectTrigger>
					<SelectContent>
						{#each timezones as tz}
							<SelectItem value={tz.value} label={tz.label}>{tz.label}</SelectItem>
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

		<div class="space-y-0">
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
						type="single"
						value={formData.entityType as any}
						onValueChange={(value: any) => {
							formData.entityType = value;
						}}
					>
						<SelectTrigger id="edit-entityType">
							{entityTypeLabel}
						</SelectTrigger>
						<SelectContent>
							{#each entityTypes.filter((t) => t.value !== 'all') as type}
								<SelectItem value={type.value} label={type.label}>{type.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>

				<div>
					<Label for="edit-syncDirection">Sync Direction *</Label>
					<Select
						type="single"
						value={formData.syncDirection as any}
						onValueChange={(value: any) => {
							formData.syncDirection = value;
						}}
					>
						<SelectTrigger id="edit-syncDirection">
							{syncDirectionLabel}
						</SelectTrigger>
						<SelectContent>
							{#each syncDirections as direction}
								<SelectItem value={direction.value} label={direction.label}
									>{direction.label}</SelectItem
								>
							{/each}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div>
				<Label for="edit-scheduleType">Schedule Type *</Label>
				<Select
					type="single"
					value={formData.scheduleType as any}
					onValueChange={(value: any) => {
						formData.scheduleType = value;
					}}
				>
					<SelectTrigger id="edit-scheduleType">
						{scheduleTypeLabel}
					</SelectTrigger>
					<SelectContent>
						{#each scheduleTypes as type}
							<SelectItem value={type.value} label={type.label}>
								<div class="flex flex-col">
									<span class="font-medium">{type.label}</span>
									<span class="text-xs text-muted-foreground">{type.description}</span>
								</div>
							</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<!-- Conditional time inputs based on schedule type -->
			{#if formData.scheduleType === 'daily' || formData.scheduleType === 'weekdays'}
				<div class="grid grid-cols-2 gap-4">
					<div>
						<Label for="edit-hour">Hour *</Label>
						<Select
							type="single"
							value={formData.hour.toString()}
							onValueChange={(value: any) => {
								formData.hour = parseInt(value);
							}}
						>
							<SelectTrigger id="edit-hour">
								{hourLabel}
							</SelectTrigger>
							<SelectContent>
								{#each hours as h}
									<SelectItem value={h.value} label={h.label}>{h.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label for="edit-minute">Minute *</Label>
						<Select
							type="single"
							value={formData.minute.toString()}
							onValueChange={(value: any) => {
								formData.minute = parseInt(value);
							}}
						>
							<SelectTrigger id="edit-minute">
								{minuteLabel}
							</SelectTrigger>
							<SelectContent>
								{#each minutes as m}
									<SelectItem value={m.value} label={m.label}>{m.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
				</div>
			{/if}

			{#if formData.scheduleType === 'weekly'}
				<div class="grid grid-cols-3 gap-4">
					<div>
						<Label for="edit-dayOfWeek">Day of Week *</Label>
						<Select
							type="single"
							value={formData.dayOfWeek.toString()}
							onValueChange={(value: any) => {
								formData.dayOfWeek = parseInt(value);
							}}
						>
							<SelectTrigger id="edit-dayOfWeek">
								{dayOfWeekLabel}
							</SelectTrigger>
							<SelectContent>
								{#each daysOfWeek as day}
									<SelectItem value={day.value} label={day.label}>{day.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label for="edit-weeklyHour">Hour *</Label>
						<Select
							type="single"
							value={formData.hour.toString()}
							onValueChange={(value: any) => {
								formData.hour = parseInt(value);
							}}
						>
							<SelectTrigger id="edit-weeklyHour">
								{hourLabel}
							</SelectTrigger>
							<SelectContent>
								{#each hours as h}
									<SelectItem value={h.value} label={h.label}>{h.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label for="edit-weeklyMinute">Minute *</Label>
						<Select
							type="single"
							value={formData.minute.toString()}
							onValueChange={(value: any) => {
								formData.minute = parseInt(value);
							}}
						>
							<SelectTrigger id="edit-weeklyMinute">
								{minuteLabel}
							</SelectTrigger>
							<SelectContent>
								{#each minutes as m}
									<SelectItem value={m.value} label={m.label}>{m.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
				</div>
			{/if}

			{#if formData.scheduleType === 'custom'}
				<div>
					<Label for="edit-cronExpression">Cron Expression *</Label>
					<Input
						id="edit-cronExpression"
						bind:value={formData.cronExpression}
						placeholder="0 0 2 * * *"
						class="font-mono"
					/>
					<p class="text-xs text-muted-foreground mt-1">
						Format: second minute hour day month day_of_week
					</p>
				</div>
			{/if}

			<!-- Show generated cron expression for non-custom types -->
			{#if formData.scheduleType !== 'custom'}
				<div class="p-3 bg-muted/30 rounded-md border">
					<p class="text-xs text-muted-foreground mb-1">Generated Cron Expression:</p>
					<code class="text-sm font-mono">{formData.cronExpression}</code>
				</div>
			{/if}

			<div>
				<Label for="edit-timezone">Timezone *</Label>
				<Select
					type="single"
					value={formData.timezone as any}
					onValueChange={(value: any) => {
						formData.timezone = value;
					}}
				>
					<SelectTrigger id="edit-timezone">
						{timezoneLabel}
					</SelectTrigger>
					<SelectContent>
						{#each timezones as tz}
							<SelectItem value={tz.value} label={tz.label}>{tz.label}</SelectItem>
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
