<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { Badge } from '$lib/components/ui/badge';
	import { Loader2, CheckCircle, XCircle, Zap, Clock, AlertCircle } from '@lucide/svelte';

	interface Props {
		open: boolean;
		batchId: string;
		onOpenChange: (open: boolean) => void;
		onComplete?: () => void;
	}

	let { open = $bindable(), batchId, onOpenChange, onComplete }: Props = $props();

	interface EventProgress {
		eventId: string;
		entityName: string;
		entityId: string;
		eventType: string;
		status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
		error?: string;
		receivedAt: string;
	}

	interface BatchProgress {
		status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
		processedCount: number;
		successfulCount: number;
		failedCount: number;
		totalCount: number;
		currentEventId?: string;
		lastError?: string;
		events: EventProgress[];
	}

	let progress = $state<BatchProgress>({
		status: 'QUEUED',
		processedCount: 0,
		successfulCount: 0,
		failedCount: 0,
		totalCount: 0,
		events: []
	});

	let eventSource: EventSource | null = null;

	$effect(() => {
		if (open && batchId) {
			connectSSE();
		}
		return () => {
			if (eventSource) {
				eventSource.close();
			}
		};
	});

	function connectSSE() {
		eventSource = new EventSource(`/api/webhooks/process/${batchId}/progress`);

		eventSource.onmessage = (event) => {
			const data = JSON.parse(event.data);
			progress = data;

			if (data.status === 'COMPLETED' || data.status === 'FAILED') {
				eventSource?.close();
				if (onComplete) {
					onComplete();
				}
			}
		};

		eventSource.onerror = () => {
			eventSource?.close();
		};
	}

	let progressPercentage = $derived(
		progress.totalCount > 0 ? Math.round((progress.processedCount / progress.totalCount) * 100) : 0
	);
</script>

<Dialog.Root {open} {onOpenChange}>
	<Dialog.Content class="sm:max-w-[800px]">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Zap class="h-5 w-5" />
				Processing Webhook Events
			</Dialog.Title>
			<Dialog.Description>Syncing pending webhook events from QuickBooks</Dialog.Description>
		</Dialog.Header>

		<!-- Progress Section -->
		<div class="space-y-4 py-4">
			<!-- Status Indicator -->
			<div class="flex items-center gap-3">
				{#if progress.status === 'IN_PROGRESS'}
					<Loader2 class="h-6 w-6 animate-spin text-blue-500" />
					<span class="text-sm font-medium">Processing...</span>
				{:else if progress.status === 'COMPLETED'}
					<CheckCircle class="h-6 w-6 text-green-500" />
					<span class="text-sm font-medium text-green-600">Completed</span>
				{:else if progress.status === 'FAILED'}
					<XCircle class="h-6 w-6 text-red-500" />
					<span class="text-sm font-medium text-red-600">Failed</span>
				{:else}
					<div
						class="h-6 w-6 rounded-full border-2 border-gray-300 border-t-blue-500 animate-spin"
					></div>
					<span class="text-sm font-medium">Queued...</span>
				{/if}
			</div>

			<!-- Progress Bar -->
			<div class="space-y-2">
				<div class="flex justify-between text-sm">
					<span class="text-muted-foreground">Progress</span>
					<span class="font-medium">{progressPercentage}%</span>
				</div>
				<Progress value={progressPercentage} class="h-2" />
			</div>

			<!-- Stats Grid -->
			<div class="grid grid-cols-3 gap-4">
				<div class="rounded-lg border p-3">
					<div class="text-xs text-muted-foreground">Processed</div>
					<div class="text-2xl font-bold">{progress.processedCount}</div>
					<div class="text-xs text-muted-foreground">of {progress.totalCount}</div>
				</div>
				<div class="rounded-lg border p-3">
					<div class="text-xs text-muted-foreground">Successful</div>
					<div class="text-2xl font-bold text-green-600">{progress.successfulCount}</div>
				</div>
				<div class="rounded-lg border p-3">
					<div class="text-xs text-muted-foreground">Failed</div>
					<div class="text-2xl font-bold text-red-600">{progress.failedCount}</div>
				</div>
			</div>

			<!-- Events Table -->
			{#if progress.events.length > 0}
				<div class="space-y-2">
					<div class="text-sm font-medium">Event Details</div>
					<div class="rounded-md border max-h-[300px] overflow-y-auto">
						<table class="w-full text-xs">
							<thead class="sticky top-0 bg-muted/50 backdrop-blur">
								<tr class="border-b">
									<th class="text-left p-2 font-medium">Status</th>
									<th class="text-left p-2 font-medium">Entity</th>
									<th class="text-left p-2 font-medium">Event Type</th>
									<th class="text-left p-2 font-medium">Entity ID</th>
									<th class="text-left p-2 font-medium">Error</th>
								</tr>
							</thead>
							<tbody>
								{#each progress.events as event (event.eventId)}
									<tr class="border-b last:border-0 hover:bg-muted/30">
										<td class="p-2">
											{#if event.status === 'PENDING'}
												<Badge variant="secondary" class="text-[10px] gap-1">
													<Clock class="h-3 w-3" />
													Pending
												</Badge>
											{:else if event.status === 'PROCESSING'}
												<Badge variant="default" class="text-[10px] gap-1">
													<Loader2 class="h-3 w-3 animate-spin" />
													Processing
												</Badge>
											{:else if event.status === 'COMPLETED'}
												<Badge variant="default" class="bg-green-600 text-[10px] gap-1">
													<CheckCircle class="h-3 w-3" />
													Success
												</Badge>
											{:else if event.status === 'FAILED'}
												<Badge variant="destructive" class="text-[10px] gap-1">
													<XCircle class="h-3 w-3" />
													Failed
												</Badge>
											{/if}
										</td>
										<td class="p-2 font-medium">{event.entityName}</td>
										<td class="p-2 text-muted-foreground">{event.eventType}</td>
										<td class="p-2 font-mono text-muted-foreground"
											>{event.entityId.slice(0, 8)}...</td
										>
										<td class="p-2">
											{#if event.error}
												<div class="flex items-center gap-1 text-red-600 dark:text-red-400">
													<AlertCircle class="h-3 w-3 flex-shrink-0" />
													<span class="truncate max-w-[150px]" title={event.error}>
														{event.error}
													</span>
												</div>
											{:else}
												<span class="text-muted-foreground">—</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}

			<!-- Current Item -->
			{#if progress.currentEventId}
				<div class="rounded-md bg-muted p-3">
					<div class="text-xs text-muted-foreground mb-1">Currently processing</div>
					<div class="text-sm font-mono">{progress.currentEventId}</div>
				</div>
			{/if}

			<!-- Error Display -->
			{#if progress.lastError}
				<div
					class="rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3"
				>
					<div class="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Last Error</div>
					<div class="text-sm text-red-700 dark:text-red-300">{progress.lastError}</div>
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			{#if progress.status === 'COMPLETED' || progress.status === 'FAILED'}
				<Button
					onclick={() => {
						open = false;
					}}
				>
					Close
				</Button>
			{:else}
				<Button variant="outline" disabled>
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Processing...
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
