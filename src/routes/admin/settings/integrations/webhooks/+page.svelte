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
		Webhook,
		Filter
	} from '@lucide/svelte';
	import { invalidate, goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data } = $props();
	let events = $derived(data.events);
	let statistics = $derived(data.statistics);
	let selectedEvent = $derived(data.selectedEvent);
	let filters = $derived(data.filters || {});

	let refreshing = $state(false);
	let selectedStatus = $state('all');
	let selectedEventType = $state('all');

	$effect(() => {
		if ((filters as any).status) selectedStatus = (filters as any).status;
		if ((filters as any).eventType) selectedEventType = (filters as any).eventType;
	});

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

	function applyFilters() {
		const params = new URLSearchParams();
		if (selectedStatus !== 'all') params.set('status', selectedStatus);
		if (selectedEventType !== 'all') params.set('eventType', selectedEventType);
		goto(`?${params.toString()}`);
	}

	function getStatusColor(status: string): string {
		switch (status.toLowerCase()) {
			case 'completed':
				return 'text-green-600 bg-green-50 border-green-200';
			case 'processing':
				return 'text-blue-600 bg-blue-50 border-blue-200';
			case 'pending':
				return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			case 'failed':
				return 'text-red-600 bg-red-50 border-red-200';
			default:
				return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	}

	function getStatusVariant(status: string): 'default' | 'outline' | 'secondary' | 'destructive' {
		switch (status.toLowerCase()) {
			case 'completed':
				return 'default';
			case 'failed':
				return 'destructive';
			case 'processing':
				return 'secondary';
			default:
				return 'outline';
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

<div class="container mx-auto py-8 px-4">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-4">
			{#if selectedEvent}
				<Button onclick={backToList} variant="outline" size="sm">
					<ArrowLeft class="h-4 w-4 mr-2" />
					Back to Events
				</Button>
			{/if}
			<div>
				<h1 class="text-2xl font-bold flex items-center gap-2">
					<Webhook class="h-6 w-6" />
					{selectedEvent ? 'Webhook Event Details' : 'Webhook Monitoring'}
				</h1>
				<p class="text-sm text-muted-foreground mt-1">
					{selectedEvent
						? 'Real-time webhook event processing details'
						: 'QuickBooks webhook events and processing status'}
				</p>
			</div>
		</div>
		<Button onclick={refreshData} disabled={refreshing} variant="outline" size="sm">
			<RefreshCw class="h-4 w-4 mr-2 {refreshing ? 'animate-spin' : ''}" />
			Refresh
		</Button>
	</div>

	{#if data.error}
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription>{data.error}</AlertDescription>
		</Alert>
	{/if}

	{#if selectedEvent}
		<!-- Event Detail View -->
		<div class="space-y-6">
			<!-- Event Summary -->
			<Card>
				<CardHeader>
					<div class="flex items-start justify-between">
						<div>
							<CardTitle>Event Details</CardTitle>
							<CardDescription>{formatDate(selectedEvent.receivedAt)}</CardDescription>
						</div>
						<div
							class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border {getStatusColor(
								selectedEvent.status
							)}"
						>
							{#if selectedEvent.status === 'completed'}
								<CheckCircle2 class="h-4 w-4 mr-2" />
							{:else if selectedEvent.status === 'failed'}
								<XCircle class="h-4 w-4 mr-2" />
							{:else if selectedEvent.status === 'processing'}
								<Activity class="h-4 w-4 mr-2 animate-pulse" />
							{:else}
								<Clock class="h-4 w-4 mr-2" />
							{/if}
							{selectedEvent.status}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div class="grid grid-cols-2 md:grid-cols-4 gap-6">
						<div>
							<p class="text-sm text-muted-foreground">Event Type</p>
							<p class="text-lg font-medium">{selectedEvent.eventType}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Entity</p>
							<p class="text-lg font-medium">{selectedEvent.entityName}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Realm ID</p>
							<p class="text-lg font-mono text-sm">{selectedEvent.realmId}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Processing Attempts</p>
							<p class="text-lg font-bold">
								{selectedEvent.processingAttempts}
								{#if selectedEvent.processingAttempts > 1}
									<RotateCw class="inline h-4 w-4 ml-1 text-orange-500" />
								{/if}
							</p>
						</div>
					</div>

					<div class="mt-6 pt-6 border-t">
						<div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
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
								<span class="ml-2 font-mono text-xs">{selectedEvent.id}</span>
							</div>
						</div>
					</div>

					{#if selectedEvent.lastError}
						<Alert variant="destructive" class="mt-4">
							<AlertCircle class="h-4 w-4" />
							<AlertDescription>
								<span class="font-medium">Processing Error:</span>
								{selectedEvent.lastError}
							</AlertDescription>
						</Alert>
					{/if}
				</CardContent>
			</Card>

			<!-- Event Payload -->
			<Card>
				<CardHeader>
					<CardTitle>Event Payload</CardTitle>
					<CardDescription>Raw webhook data from QuickBooks</CardDescription>
				</CardHeader>
				<CardContent>
					<pre
						class="text-xs bg-muted border rounded p-4 overflow-auto max-h-96">{JSON.stringify(
							selectedEvent.payload,
							null,
							2
						)}</pre>
				</CardContent>
			</Card>
		</div>
	{:else}
		<!-- Events List View -->
		<div class="space-y-6">
			<!-- Statistics Overview -->
			{#if statistics}
				<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
					<Card>
						<CardHeader class="pb-2">
							<CardDescription>Total Events</CardDescription>
						</CardHeader>
						<CardContent>
							<p class="text-3xl font-bold">{statistics.totalEvents}</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader class="pb-2">
							<CardDescription>Pending</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="flex items-center gap-2">
								<Clock class="h-8 w-8 text-yellow-500" />
								<p class="text-3xl font-bold">{statistics.pendingEvents}</p>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader class="pb-2">
							<CardDescription>Processing</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="flex items-center gap-2">
								<Activity class="h-8 w-8 text-blue-500 animate-pulse" />
								<p class="text-3xl font-bold">{statistics.processingEvents}</p>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader class="pb-2">
							<CardDescription>Completed</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="flex items-center gap-2">
								<CheckCircle2 class="h-8 w-8 text-green-500" />
								<p class="text-3xl font-bold">{statistics.completedEvents}</p>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader class="pb-2">
							<CardDescription>Failed</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="flex items-center gap-2">
								<XCircle class="h-8 w-8 text-red-500" />
								<p class="text-3xl font-bold">{statistics.failedEvents}</p>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader class="pb-2">
							<CardDescription>Avg Processing</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="flex items-center gap-2">
								<Zap class="h-8 w-8 text-purple-500" />
								<p class="text-2xl font-bold">
									{formatDuration(statistics.avgProcessingTimeMs)}
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			{/if}

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
							type="single"
							value={selectedStatus as any}
							onValueChange={(value: any) => {
								selectedStatus = value;
								applyFilters();
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select status" />
							</SelectTrigger>
							<SelectContent>
								{#each statusOptions as option}
									<SelectItem value={option.value}>{option.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>

						<Select
							type="single"
							value={selectedEventType as any}
							onValueChange={(value: any) => {
								selectedEventType = value;
								applyFilters();
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select event type" />
							</SelectTrigger>
							<SelectContent>
								{#each eventTypes as type}
									<SelectItem value={type.value}>{type.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>

					{#if selectedStatus !== 'all' || selectedEventType !== 'all'}
						<div class="mt-4 text-sm text-muted-foreground">
							Showing {events.length} filtered events
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- Events List -->
			<Card>
				<CardHeader>
					<CardTitle>Recent Webhook Events</CardTitle>
					<CardDescription>Incoming QuickBooks webhook notifications</CardDescription>
				</CardHeader>
				<CardContent>
					{#if events.length === 0}
						<div class="text-center py-12 text-muted-foreground">
							<Webhook class="h-12 w-12 mx-auto mb-3" />
							<p class="font-medium">No webhook events</p>
							<p class="text-sm">Webhook events will appear here when received from QuickBooks</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each events as event}
								<button
									onclick={() => viewEvent(event.id)}
									class="w-full text-left border rounded-lg p-4 hover:bg-muted/30 transition-colors"
								>
									<div class="flex items-start justify-between mb-2">
										<div class="flex-1">
											<div class="flex items-center gap-2 mb-1">
												<p class="font-medium">{event.eventType}</p>
												<Badge variant={getStatusVariant(event.status)}>
													{event.status}
												</Badge>
												{#if event.processingAttempts > 1}
													<Badge variant="secondary">
														<RotateCw class="h-3 w-3 mr-1" />
														{event.processingAttempts} attempts
													</Badge>
												{/if}
											</div>
											<p class="text-sm text-muted-foreground">
												{event.entityName} • Received {formatDate(event.receivedAt)}
											</p>
										</div>
										<div class="text-right">
											{#if event.processedAt}
												<p class="text-sm text-green-600">
													<CheckCircle2 class="inline h-4 w-4 mr-1" />
													Processed
												</p>
												<p class="text-xs text-muted-foreground">
													{formatDate(event.processedAt)}
												</p>
											{:else if event.status === 'failed'}
												<p class="text-sm text-red-600">
													<XCircle class="inline h-4 w-4 mr-1" />
													Failed
												</p>
											{:else if event.status === 'processing'}
												<p class="text-sm text-blue-600">
													<Activity class="inline h-4 w-4 mr-1 animate-pulse" />
													Processing
												</p>
											{:else}
												<p class="text-sm text-yellow-600">
													<Clock class="inline h-4 w-4 mr-1" />
													Pending
												</p>
											{/if}
										</div>
									</div>

									{#if event.lastError}
										<div class="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
											<AlertCircle class="inline h-4 w-4 mr-1" />
											{event.lastError}
										</div>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>
	{/if}
</div>
