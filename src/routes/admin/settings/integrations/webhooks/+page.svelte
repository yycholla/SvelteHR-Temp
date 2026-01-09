<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		AlertCircle,
		CheckCircle2,
		RefreshCw,
		ArrowLeft,
		Clock,
		Activity,
		Zap,
		XCircle,
		RotateCw,
		Webhook
	} from '@lucide/svelte';
	import { invalidate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let webhookStatus = $derived(data.webhookStatus);
	let events = $derived(data.events);
	let statistics = $derived(data.statistics);
	let selectedEvent = $derived(data.selectedEvent);
	let filters = $derived(data.filters || {});

	let refreshing = $state(false);
	let showRegisterDialog = $state(false);
	let selectedEntities = $state(['Employee', 'Department']);
	let isSubmitting = $state(false);

	// Derived filter values from URL params
	let selectedStatus = $derived((filters as any).status || 'all');
	let selectedEventType = $derived((filters as any).eventType || 'all');

	// Event types for filter
	const eventTypes = [
		{ value: 'all', label: 'All Event Types' },
		{ value: 'Customer.Create', label: 'Customer Create' },
		{ value: 'Customer.Update', label: 'Customer Update' },
		{ value: 'Customer.Delete', label: 'Customer Delete' },
		{ value: 'Employee.Create', label: 'Employee Create' },
		{ value: 'Employee.Update', label: 'Employee Update' },
		{ value: 'Employee.Delete', label: 'Employee Delete' },
		{ value: 'Department.Create', label: 'Department Create' },
		{ value: 'Department.Update', label: 'Department Update' },
		{ value: 'Department.Delete', label: 'Department Delete' }
	];

	// Status options for filter
	const statusOptions = [
		{ value: 'all', label: 'All Statuses' },
		{ value: 'pending', label: 'Pending' },
		{ value: 'processing', label: 'Processing' },
		{ value: 'completed', label: 'Completed' },
		{ value: 'failed', label: 'Failed' }
	];

	async function refreshData() {
		refreshing = true;
		await invalidate('app:webhooks');
		refreshing = false;
	}

	function viewEvent(eventId: string) {
		goto(`?eventId=${eventId}`);
	}

	function backToList() {
		goto('/admin/settings/integrations/webhooks');
	}

	function applyFilters(status?: string, eventType?: string) {
		const params = new URLSearchParams();
		const newStatus = status !== undefined ? status : selectedStatus;
		const newEventType = eventType !== undefined ? eventType : selectedEventType;

		if (newStatus !== 'all') params.set('status', newStatus);
		if (newEventType !== 'all') params.set('eventType', newEventType);
		goto(`?${params.toString()}`);
	}

	function getActionBadgeColor(status: string): string {
		switch (status.toLowerCase()) {
			case 'completed':
				return 'bg-green-100 text-green-700';
			case 'processing':
				return 'bg-blue-100 text-blue-700';
			case 'pending':
				return 'bg-yellow-100 text-yellow-700';
			case 'failed':
				return 'bg-red-100 text-red-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	function formatDate(dateStr: string): string {
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
</script>

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Toolbar -->
	<header class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20">
		<div class="flex items-center gap-4 flex-1">
			{#if selectedEvent}
				<button
					onclick={backToList}
					class="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors"
				>
					<ArrowLeft class="h-3.5 w-3.5" />
					Back
				</button>
			{/if}
			<h1 class="text-sm font-semibold tracking-tight flex items-center gap-2">
				<Webhook class="h-4 w-4" />
				{selectedEvent ? 'Webhook Event Details' : 'Webhook Monitoring'}
			</h1>
		</div>
		<button
			onclick={refreshData}
			disabled={refreshing}
			class="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors disabled:opacity-50"
		>
			<RefreshCw class="h-3.5 w-3.5 {refreshing ? 'animate-spin' : ''}" />
			Refresh
		</button>
	</header>

	<!-- Error/Success Messages -->
	{#if data.error}
		<div class="flex-shrink-0 p-4 pb-0">
			<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 flex items-center gap-2">
				<AlertCircle class="h-4 w-4" />
				{data.error}
			</div>
		</div>
	{/if}

	{#if form?.error}
		<div class="flex-shrink-0 p-4 pb-0">
			<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 flex items-center gap-2">
				<AlertCircle class="h-4 w-4" />
				{form.error}
			</div>
		</div>
	{/if}

	{#if form?.success}
		<div class="flex-shrink-0 p-4 pb-0">
			<div class="rounded-md bg-green-50 p-3 text-sm text-green-700 font-medium border border-green-200 flex items-center gap-2">
				<CheckCircle2 class="h-4 w-4" />
				{form.message}
			</div>
		</div>
	{/if}

	<!-- Webhook Status Section -->
	{#if !selectedEvent && webhookStatus}
		<div class="flex-shrink-0 border-b bg-background p-4">
			<div class="flex items-center justify-between mb-3">
				<div class="flex items-center gap-2">
					<Webhook class="h-4 w-4" />
					<h2 class="text-xs font-semibold uppercase tracking-wide">Subscription Status</h2>
				</div>
				<div>
					{#if webhookStatus.isActive}
						<form method="POST" action="?/unregister" use:enhance>
							<button
								type="submit"
								disabled={isSubmitting}
								class="h-8 px-3 rounded-sm border border-destructive bg-destructive text-destructive-foreground text-xs hover:bg-destructive/90 transition-colors disabled:opacity-50"
							>
								{isSubmitting ? 'Unregistering...' : 'Unregister'}
							</button>
						</form>
					{:else}
						<button
							onclick={() => (showRegisterDialog = !showRegisterDialog)}
							class="h-8 px-3 rounded-sm border border-input bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors"
						>
							Register Webhook
						</button>
					{/if}
				</div>
			</div>

			{#if webhookStatus.isActive}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
					<div>
						<div class="text-muted-foreground mb-1">Status</div>
						<div class="flex items-center gap-2">
							<div class="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
							<span class="font-medium text-green-600">Active</span>
						</div>
					</div>
					<div>
						<div class="text-muted-foreground mb-1">Webhook ID</div>
						<div class="font-mono text-xs">{webhookStatus.webhookId || 'N/A'}</div>
					</div>
					<div>
						<div class="text-muted-foreground mb-1">Subscribed Entities</div>
						<div class="flex flex-wrap gap-1">
							{#each webhookStatus.entityNames as entity (entity)}
								<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground">{entity}</span>
							{/each}
						</div>
					</div>
					<div>
						<div class="text-muted-foreground mb-1">Last Delivery</div>
						<div class="text-xs">
							{webhookStatus.lastDeliveredAt ? formatDate(webhookStatus.lastDeliveredAt) : 'Never'}
						</div>
					</div>
				</div>

				{#if webhookStatus.failureCount > 0}
					<div class="mt-3 rounded-md bg-destructive/10 p-2 text-xs text-destructive flex items-center gap-2">
						<AlertCircle class="h-3.5 w-3.5" />
						{webhookStatus.failureCount} delivery failure(s) recorded
					</div>
				{/if}
			{:else if showRegisterDialog}
				<form method="POST" action="?/register" use:enhance class="space-y-3 mt-3">
					<div>
						<div class="text-xs font-medium mb-2">Select entity types to subscribe to:</div>
						<div class="grid grid-cols-2 md:grid-cols-3 gap-2">
							{#each ['Employee', 'Department', 'Customer'] as entity (entity)}
								<label class="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/30 text-xs">
									<input
										type="checkbox"
										name="entityNames"
										value={entity}
										checked={selectedEntities.includes(entity)}
										onchange={(e) => {
											if (e.currentTarget.checked) {
												selectedEntities = [...selectedEntities, entity];
											} else {
												selectedEntities = selectedEntities.filter((en) => en !== entity);
											}
										}}
										class="rounded"
									/>
									<span class="font-medium">{entity}</span>
								</label>
							{/each}
						</div>
					</div>
					<div class="flex gap-2">
						<button
							type="submit"
							disabled={isSubmitting || selectedEntities.length === 0}
							class="h-8 px-3 rounded-sm border border-input bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
						>
							{isSubmitting ? 'Registering...' : 'Register'}
						</button>
						<button
							type="button"
							onclick={() => (showRegisterDialog = false)}
							disabled={isSubmitting}
							class="h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors disabled:opacity-50"
						>
							Cancel
						</button>
					</div>
				</form>
			{/if}
		</div>
	{/if}

	{#if selectedEvent}
		<!-- Event Detail View -->
		<div class="flex-1 overflow-auto min-h-0 relative bg-background p-4">
			<!-- Event Summary -->
			<div class="mb-4 p-4 border rounded-sm bg-background">
				<div class="flex items-start justify-between mb-4">
					<div>
						<h3 class="text-xs font-semibold uppercase tracking-wide mb-1">Event Details</h3>
						<div class="text-xs text-muted-foreground">{formatDate(selectedEvent.receivedAt)}</div>
					</div>
					<span
						class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium {getActionBadgeColor(selectedEvent.status)}"
					>
						{#if selectedEvent.status === 'completed'}
							<CheckCircle2 class="h-3 w-3 mr-1" />
						{:else if selectedEvent.status === 'failed'}
							<XCircle class="h-3 w-3 mr-1" />
						{:else if selectedEvent.status === 'processing'}
							<Activity class="h-3 w-3 mr-1 animate-pulse" />
						{:else}
							<Clock class="h-3 w-3 mr-1" />
						{/if}
						{selectedEvent.status}
					</span>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
					<div>
						<div class="text-muted-foreground mb-1">Event Type</div>
						<div class="font-medium">{selectedEvent.eventType}</div>
					</div>
					<div>
						<div class="text-muted-foreground mb-1">Entity</div>
						<div class="font-medium">{selectedEvent.entityName}</div>
					</div>
					<div>
						<div class="text-muted-foreground mb-1">Realm ID</div>
						<div class="font-mono">{selectedEvent.realmId}</div>
					</div>
					<div>
						<div class="text-muted-foreground mb-1">Processing Attempts</div>
						<div class="font-bold flex items-center gap-1">
							{selectedEvent.processingAttempts}
							{#if selectedEvent.processingAttempts > 1}
								<RotateCw class="h-3 w-3 text-orange-500" />
							{/if}
						</div>
					</div>
				</div>

				<div class="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
					<div>
						<span class="text-muted-foreground">Received:</span>
						<span class="ml-2 font-medium">{formatDate(selectedEvent.receivedAt)}</span>
					</div>
					{#if selectedEvent.processedAt}
						<div>
							<span class="text-muted-foreground">Processed:</span>
							<span class="ml-2 font-medium">{formatDate(selectedEvent.processedAt)}</span>
						</div>
					{/if}
					<div>
						<span class="text-muted-foreground">Event ID:</span>
						<span class="ml-2 font-mono">{selectedEvent.id}</span>
					</div>
				</div>

				{#if selectedEvent.lastError}
					<div class="mt-4 rounded-md bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
						<div class="flex items-start justify-between gap-4">
							<div class="flex items-start gap-2">
								<AlertCircle class="h-3.5 w-3.5 mt-0.5" />
								<div>
									<span class="font-medium">Processing Error:</span>
									<div class="mt-1">{selectedEvent.lastError}</div>
								</div>
							</div>
							{#if selectedEvent.status === 'failed'}
								<form method="POST" action="?/retry" use:enhance>
									<input type="hidden" name="eventId" value={selectedEvent.id} />
									<button
										type="submit"
										disabled={isSubmitting}
										class="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors disabled:opacity-50"
									>
										<RotateCw class="h-3 w-3" />
										Retry
									</button>
								</form>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Event Payload -->
			<div class="p-4 border rounded-sm bg-background">
				<h3 class="text-xs font-semibold uppercase tracking-wide mb-2">Event Payload</h3>
				<div class="text-[10px] text-muted-foreground mb-3">Raw webhook data from QuickBooks</div>
				<pre class="text-[10px] bg-muted border rounded p-3 overflow-auto max-h-96 font-mono">{JSON.stringify(selectedEvent.payload, null, 2)}</pre>
			</div>
		</div>
	{:else}
		<!-- KPI Grid -->
		{#if statistics}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 border-b h-32">
				<div class="flex flex-col justify-center px-4 py-3 border-r last:border-r-0">
					<div class="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Total Events</div>
					<div class="text-2xl font-bold">{statistics.totalEvents}</div>
				</div>

				<div class="flex flex-col justify-center px-4 py-3 border-r last:border-r-0">
					<div class="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Pending</div>
					<div class="flex items-center gap-2">
						<Clock class="h-5 w-5 text-yellow-500" />
						<div class="text-2xl font-bold">{statistics.pendingEvents}</div>
					</div>
				</div>

				<div class="flex flex-col justify-center px-4 py-3 border-r last:border-r-0">
					<div class="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Processing</div>
					<div class="flex items-center gap-2">
						<Activity class="h-5 w-5 text-blue-500 animate-pulse" />
						<div class="text-2xl font-bold">{statistics.processingEvents}</div>
					</div>
				</div>

				<div class="flex flex-col justify-center px-4 py-3 border-r last:border-r-0">
					<div class="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Completed</div>
					<div class="flex items-center gap-2">
						<CheckCircle2 class="h-5 w-5 text-green-500" />
						<div class="text-2xl font-bold">{statistics.completedEvents}</div>
					</div>
				</div>

				<div class="flex flex-col justify-center px-4 py-3 border-r last:border-r-0">
					<div class="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Failed</div>
					<div class="flex items-center gap-2">
						<XCircle class="h-5 w-5 text-red-500" />
						<div class="text-2xl font-bold">{statistics.failedEvents}</div>
					</div>
				</div>

				<div class="flex flex-col justify-center px-4 py-3 border-r last:border-r-0">
					<div class="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Avg Processing</div>
					<div class="flex items-center gap-2">
						<Zap class="h-5 w-5 text-purple-500" />
						<div class="text-xl font-bold">
							{formatDuration(statistics.avgProcessingTimeMs)}
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Filters Bar -->
		<div class="flex-shrink-0 p-2 border-b bg-muted/5 flex items-center gap-2 overflow-x-auto">
			<select
				value={selectedStatus}
				onchange={(e) => applyFilters(e.currentTarget.value, selectedEventType)}
				class="h-8 rounded-sm border border-input bg-background px-2 text-xs focus:border-primary focus:outline-none min-w-[120px]"
			>
				{#each statusOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>

			<select
				value={selectedEventType}
				onchange={(e) => applyFilters(selectedStatus, e.currentTarget.value)}
				class="h-8 rounded-sm border border-input bg-background px-2 text-xs focus:border-primary focus:outline-none min-w-[150px]"
			>
				{#each eventTypes as type (type.value)}
					<option value={type.value}>{type.label}</option>
				{/each}
			</select>

			{#if selectedStatus !== 'all' || selectedEventType !== 'all'}
				<div class="text-xs text-muted-foreground ml-auto">
					Showing {events.length} filtered events
				</div>
			{/if}
		</div>

		<!-- Events Table -->
		<div class="flex-1 overflow-auto min-h-0 relative bg-background">
			<table class="w-full text-sm text-left border-collapse">
				<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
					<tr>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-40">Event Type</th>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-32">Entity</th>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-24">Status</th>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-32">Received</th>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-32">Processed</th>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-20">Attempts</th>
						<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Error</th>
					</tr>
				</thead>
				<tbody class="divide-y">
					{#each events as event (event.id)}
						<tr
							class="hover:bg-muted/30 cursor-pointer transition-colors group"
							onclick={() => viewEvent(event.id)}
						>
							<td class="px-3 py-1.5 border-r last:border-r-0 text-xs font-medium">
								{event.eventType}
							</td>
							<td class="px-3 py-1.5 border-r last:border-r-0 text-xs">
								{event.entityName}
							</td>
							<td class="px-3 py-1.5 border-r last:border-r-0">
								<span
									class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium {getActionBadgeColor(event.status)}"
								>
									{#if event.status === 'completed'}
										<CheckCircle2 class="h-3 w-3 mr-1" />
									{:else if event.status === 'failed'}
										<XCircle class="h-3 w-3 mr-1" />
									{:else if event.status === 'processing'}
										<Activity class="h-3 w-3 mr-1 animate-pulse" />
									{:else}
										<Clock class="h-3 w-3 mr-1" />
									{/if}
									{event.status}
								</span>
							</td>
							<td class="px-3 py-1.5 border-r last:border-r-0 text-xs text-muted-foreground whitespace-nowrap">
								{formatDate(event.receivedAt)}
							</td>
							<td class="px-3 py-1.5 border-r last:border-r-0 text-xs text-muted-foreground whitespace-nowrap">
								{event.processedAt ? formatDate(event.processedAt) : '—'}
							</td>
							<td class="px-3 py-1.5 border-r last:border-r-0 text-xs font-semibold text-center">
								{event.processingAttempts}
								{#if event.processingAttempts > 1}
									<RotateCw class="inline h-3 w-3 ml-0.5 text-orange-500" />
								{/if}
							</td>
							<td class="px-3 py-1.5 text-xs truncate max-w-xs" title={event.lastError || ''}>
								{#if event.lastError}
									<div class="flex items-center gap-1 text-destructive">
										<AlertCircle class="h-3 w-3 flex-shrink-0" />
										<span class="truncate">{event.lastError}</span>
									</div>
								{:else}
									—
								{/if}
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="7" class="px-4 py-12 text-center text-muted-foreground text-xs">
								<Webhook class="h-10 w-10 mx-auto mb-2 opacity-50" />
								<div class="font-medium">No webhook events</div>
								<div class="text-[10px] mt-1">Webhook events will appear here when received from QuickBooks</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
