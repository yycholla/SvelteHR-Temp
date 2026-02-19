<script lang="ts">
	import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import ProgressBar from './ProgressBar.svelte';
	import { gql } from '@urql/core';
	import { getContextClient } from '@urql/svelte';

	interface ActivityLogSummary {
		id: string;
		action: 'CREATE' | 'UPDATE' | 'DELETE';
		resourceType: string;
		resourceId: string;
		employeeName: string;
		createdAt: string;
	}

	interface BulkRollbackProgress {
		batchId: string;
		status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
		processedCount: number;
		successfulCount: number;
		failedCount: number;
		totalCount: number;
		currentLogId?: string;
		lastError?: string;
	}

	interface BulkRollbackDialogProps {
		logs: ActivityLogSummary[];
		isOpen: boolean;
		userRole: string;
		onClose: () => void;
		onComplete?: (batchId: string) => void;
	}

	let { logs, isOpen, userRole, onClose, onComplete }: BulkRollbackDialogProps = $props();

	const client = getContextClient();

	const CREATE_BULK_ROLLBACK_BATCH = gql`
		mutation CreateBulkRollbackBatch($logIds: [ID!]!) {
			createBulkRollbackBatch(logIds: $logIds) {
				batchId
			}
		}
	`;

	let selectedLogIds = $state(new Set<string>());
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let batchId = $state<string | null>(null);
	let progress = $state<BulkRollbackProgress | null>(null);
	let eventSource = $state<EventSource | null>(null);

	const MAX_SELECTION = 100;

	const selectedCount = $derived(selectedLogIds.size);
	const isAtMaxSelection = $derived(selectedCount >= MAX_SELECTION);
	const isApproachingMax = $derived(selectedCount >= 90);
	const canSubmit = $derived(selectedCount > 0 && !isLoading);
	const allSelected = $derived(selectedCount === logs.length && logs.length > 0);

	const progressPercentage = $derived(
		progress ? Math.round((progress.processedCount / progress.totalCount) * 100) : 0
	);

	function toggleLog(logId: string) {
		if (selectedLogIds.has(logId)) {
			selectedLogIds.delete(logId);
		} else if (!isAtMaxSelection) {
			selectedLogIds.add(logId);
		}
		selectedLogIds = new Set(selectedLogIds);
	}

	function selectAll() {
		const idsToSelect = logs.slice(0, MAX_SELECTION).map((log) => log.id);
		selectedLogIds = new Set(idsToSelect);
	}

	function deselectAll() {
		selectedLogIds = new Set();
	}

	function getActionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' {
		if (action === 'CREATE') return 'default';
		if (action === 'UPDATE') return 'secondary';
		return 'destructive';
	}

	function getStatusBadgeVariant(
		status: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		if (status === 'COMPLETED') return 'default';
		if (status === 'IN_PROGRESS') return 'secondary';
		if (status === 'FAILED') return 'destructive';
		return 'outline';
	}

	function formatTimestamp(timestamp: string): string {
		const date = new Date(timestamp);
		return date.toLocaleString();
	}

	function handleClose() {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
		selectedLogIds = new Set();
		batchId = null;
		progress = null;
		error = null;
		isLoading = false;
		onClose();
	}

	async function handleSubmit() {
		if (!canSubmit) return;

		isLoading = true;
		error = null;

		try {
			const result = await client.mutation(CREATE_BULK_ROLLBACK_BATCH, {
				logIds: Array.from(selectedLogIds)
			});

			if (result.error) {
				throw new Error(result.error.message);
			}

			const createdBatchId = result.data?.createBulkRollbackBatch?.batchId;
			if (!createdBatchId) {
				throw new Error('Failed to create batch - no batchId returned');
			}

			batchId = createdBatchId;
			connectSSE(createdBatchId);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create rollback batch';
			isLoading = false;
		}
	}

	function connectSSE(batchIdValue: string) {
		const url = `/api/audit/rollback/progress/${batchIdValue}`;
		const es = new EventSource(url);

		es.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data) as BulkRollbackProgress;
				progress = data;

				if (data.status === 'COMPLETED' || data.status === 'FAILED') {
					es.close();
					isLoading = false;

					if (data.status === 'COMPLETED' && onComplete) {
						onComplete(batchIdValue);
					}
				}
			} catch (err) {
				console.error('Failed to parse SSE event:', err);
			}
		};

		es.onerror = (err) => {
			console.error('SSE connection error:', err);
			error = 'Lost connection to progress updates';
			es.close();
			isLoading = false;
		};

		eventSource = es;
	}

	function handleRetry() {
		error = null;
		batchId = null;
		progress = null;
		isLoading = false;
	}

	$effect(() => {
		return () => {
			if (eventSource) {
				eventSource.close();
			}
		};
	});
</script>

<Dialog open={isOpen} onOpenChange={handleClose}>
	<DialogContent class="max-w-4xl max-h-[80vh] overflow-y-auto">
		<DialogHeader>
			<DialogTitle>Bulk Rollback</DialogTitle>
		</DialogHeader>

		{#if error}
			<Alert variant="destructive">
				<AlertDescription>
					{error}
				</AlertDescription>
			</Alert>
			<Button onclick={handleRetry} class="mt-2">Retry</Button>
		{/if}

		{#if !batchId}
			<!-- Selection Phase -->
			<div class="space-y-4">
				<div class="flex justify-between items-center">
					<div class="text-sm">
						Selected: <span class="font-bold">{selectedCount}</span> / {logs.length}
						{#if isApproachingMax}
							<span class="text-yellow-600 ml-2">(max 100)</span>
						{/if}
					</div>
					<div class="space-x-2">
						<Button variant="outline" size="sm" onclick={selectAll}>Select All</Button>
						<Button variant="outline" size="sm" onclick={deselectAll}>Deselect All</Button>
					</div>
				</div>

				<div class="border rounded-md max-h-96 overflow-y-auto">
					{#each logs as log}
						<div class="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50">
							<Checkbox
								checked={selectedLogIds.has(log.id)}
								onCheckedChange={() => toggleLog(log.id)}
								disabled={isAtMaxSelection && !selectedLogIds.has(log.id)}
								aria-label="Select log {log.id}"
							/>
							<div class="flex-1">
								<div class="flex items-center gap-2 mb-1">
									<Badge variant={getActionBadgeVariant(log.action)}>{log.action}</Badge>
									<span class="text-sm font-medium">
										{log.resourceType} #{log.resourceId}
									</span>
								</div>
								<div class="text-xs text-gray-600">
									by {log.employeeName} on {formatTimestamp(log.createdAt)}
								</div>
							</div>
						</div>
					{/each}
				</div>

				<Button onclick={handleSubmit} disabled={!canSubmit} class="w-full">
					{isLoading ? 'Creating Batch...' : `Rollback ${selectedCount} Items`}
				</Button>
			</div>
		{:else if progress}
			<!-- Progress Phase -->
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<div class="text-lg font-medium">Batch: {batchId}</div>
					<Badge variant={getStatusBadgeVariant(progress.status)}>
						{progress.status}
					</Badge>
				</div>

				<ProgressBar
					percentage={progressPercentage}
					completed={progress.processedCount}
					total={progress.totalCount}
					failed={progress.failedCount}
				/>

				<div class="grid grid-cols-3 gap-4 text-center">
					<div>
						<div class="text-2xl font-bold text-gray-900">{progress.processedCount}</div>
						<div class="text-sm text-gray-600">Processed</div>
					</div>
					<div>
						<div class="text-2xl font-bold text-green-600">{progress.successfulCount}</div>
						<div class="text-sm text-gray-600">Successful</div>
					</div>
					<div>
						<div class="text-2xl font-bold text-red-600">{progress.failedCount}</div>
						<div class="text-sm text-gray-600">Failed</div>
					</div>
				</div>

				{#if progress.currentLogId}
					<div class="text-sm text-gray-600">
						Processing: <span class="font-mono">{progress.currentLogId}</span>
					</div>
				{/if}

				{#if progress.lastError}
					<Alert variant="destructive">
						<AlertDescription>{progress.lastError}</AlertDescription>
					</Alert>
				{/if}

				{#if progress.status === 'COMPLETED'}
					<Alert>
						<AlertDescription>
							Bulk rollback completed successfully. {progress.successfulCount} items rolled back,
							{progress.failedCount} failed.
						</AlertDescription>
					</Alert>
					<Button onclick={handleClose} class="w-full">Close</Button>
				{/if}

				{#if progress.status === 'FAILED'}
					<Alert variant="destructive">
						<AlertDescription>
							Bulk rollback failed. {progress.successfulCount} items rolled back before failure.
						</AlertDescription>
					</Alert>
					<div class="flex gap-2">
						<Button onclick={handleRetry} variant="outline" class="flex-1">Retry</Button>
						<Button onclick={handleClose} class="flex-1">Close</Button>
					</div>
				{/if}
			</div>
		{/if}
	</DialogContent>
</Dialog>
