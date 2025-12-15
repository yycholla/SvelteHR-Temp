<script lang="ts">
	/**
	 * BulkRollbackDialog Component
	 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
	 * Task: T039
	 * Created: 2025-10-02
	 *
	 * Dialog for executing bulk rollback operations with SSE progress tracking.
	 * Shows real-time progress and handles up to 100 rollbacks per batch.
	 */

	import { SvelteSet } from 'svelte/reactivity';
	import { toast } from 'svelte-sonner';
	import RollbackLogSelection from './bulk-rollback/RollbackLogSelection.svelte';
	import RollbackProgress from './bulk-rollback/RollbackProgress.svelte';

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

	interface Props {
		logs: ActivityLogSummary[];
		isOpen: boolean;
		onClose: () => void;
		onComplete?: (batchId: string) => void;
	}

	const { logs, isOpen, onClose, onComplete }: Props = $props();

	const selectedLogs = new SvelteSet<string>();
	let isProcessing = $state(false);
	let progress = $state<BulkRollbackProgress | null>(null);
	let eventSource = $state<EventSource | null>(null);

	// Computed properties
	const canProceed = $derived(selectedLogs.size > 0 && selectedLogs.size <= 100);
	const isMaxSelected = $derived(selectedLogs.size >= 100);
	const progressPercentage = $derived(
		progress ? Math.round((progress.processedCount / progress.totalCount) * 100) : 0
	);

	function handleSelectAll() {
		if (selectedLogs.size === logs.length) {
			selectedLogs.clear();
		} else {
			selectedLogs.clear();
			logs.slice(0, 100).forEach((log) => selectedLogs.add(log.id));
		}
	}

	function handleToggleLog(logId: string) {
		if (selectedLogs.has(logId)) {
			selectedLogs.delete(logId);
		} else {
			if (selectedLogs.size < 100) {
				selectedLogs.add(logId);
			} else {
				toast.warning('Maximum 100 logs can be selected');
			}
		}
	}

	async function handleExecute() {
		if (!canProceed) return;

		isProcessing = true;

		try {
			// Create bulk rollback batch
			const response = await fetch('/api/graphql', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					query: `
						mutation CreateBulkRollbackBatch($input: CreateBulkRollbackBatchInput!) {
							createBulkRollbackBatch(input: $input) {
								batchId
								success
								error
							}
						}
					`,
					variables: {
						input: {
							logIds: Array.from(selectedLogs)
						}
					}
				})
			});

			const result = await response.json();

			if (result.errors) {
				throw new Error(result.errors[0].message);
			}

			const data = result.data.createBulkRollbackBatch;

			if (!data.success) {
				throw new Error(data.error || 'Failed to create batch');
			}

			const batchId = data.batchId;

			// Initialize progress
			progress = {
				batchId,
				status: 'QUEUED',
				processedCount: 0,
				successfulCount: 0,
				failedCount: 0,
				totalCount: selectedLogs.size
			};

			// Connect to SSE endpoint
			connectToSSE(batchId);

			toast.success('Bulk rollback batch started');
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to start batch';
			toast.error(errorMessage);
			isProcessing = false;
		}
	}

	function connectToSSE(batchId: string) {
		// Get auth token from cookie
		const token = document.cookie
			.split('; ')
			.find((row) => row.startsWith('hr_token='))
			?.split('=')[1];

		if (!token) {
			toast.error('Authentication token not found');
			isProcessing = false;
			return;
		}

		// Create SSE connection
		const url = `/api/rollback/bulk/${batchId}/progress`;
		const es = new EventSource(url);

		// Handle progress events
		es.addEventListener('progress', (event) => {
			const data = JSON.parse(event.data);
			progress = data;
		});

		// Handle completion events
		es.addEventListener('complete', (event) => {
			const data = JSON.parse(event.data);
			progress = data;

			if (data.status === 'COMPLETED') {
				toast.success(
					`Batch completed: ${data.successfulCount} successful, ${data.failedCount} failed`
				);

				if (onComplete) {
					onComplete(batchId);
				}
			} else if (data.status === 'FAILED') {
				toast.error('Batch failed');
			}

			// Close connection
			es.close();
			eventSource = null;
		});

		// Handle error events
		es.addEventListener('error', (event: any) => {
			const data = event.data ? JSON.parse(event.data) : null;

			if (data?.error) {
				toast.error(data.error);
			}

			es.close();
			eventSource = null;
			isProcessing = false;
		});

		// Handle connection errors
		es.onerror = () => {
			toast.error('SSE connection lost');
			es.close();
			eventSource = null;
			isProcessing = false;
		};

		eventSource = es;
	}

	function handleClose() {
		// Close SSE connection if active
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}

		// Reset state
		selectedLogs.clear();
		isProcessing = false;
		progress = null;

		onClose();
	}
</script>

{#if isOpen}
	<div
		class="modal-backdrop"
		role="button"
		tabindex="0"
		onclick={!isProcessing ? handleClose : undefined}
		onkeydown={(e) => {
			if ((e.key === 'Escape' || e.key === 'Enter') && !isProcessing) {
				handleClose();
			}
		}}
	>
		<div
			class="modal-dialog"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="modal-header">
				<h3>Bulk Rollback</h3>
				<p class="subtitle">
					{#if progress}
						Processing batch...
					{:else}
						Select up to 100 activity logs to rollback
					{/if}
				</p>
			</div>

			<div class="modal-body">
				{#if !progress}
					<!-- Selection Phase -->
					<RollbackLogSelection
						{logs}
						{selectedLogs}
						{isMaxSelected}
						onSelectAll={handleSelectAll}
						onToggleLog={handleToggleLog}
					/>
				{:else}
					<!-- Processing Phase -->
					<RollbackProgress
						{progress}
						{progressPercentage}
					/>
				{/if}
			</div>

			<div class="modal-footer">
				<button
					type="button"
					class="btn-secondary"
					onclick={handleClose}
					disabled={isProcessing && progress?.status === 'IN_PROGRESS'}
				>
					{progress && (progress.status === 'COMPLETED' || progress.status === 'FAILED')
						? 'Close'
						: 'Cancel'}
				</button>
				{#if !progress}
					<button type="button" class="btn-danger" onclick={handleExecute} disabled={!canProceed}>
						Execute Rollback ({selectedLogs.size})
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-dialog {
		background-color: white;
		border-radius: 0.5rem;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
		max-width: 48rem;
		width: 100%;
		margin: 1rem;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-header h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
	}

	.subtitle {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		flex: 1;
	}

	.modal-footer {
		padding: 1.5rem;
		border-top: 1px solid #e5e7eb;
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.btn-secondary,
	.btn-danger {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-secondary {
		border: 1px solid #d1d5db;
		background-color: white;
		color: #374151;
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: #f9fafb;
	}

	.btn-danger {
		border: 1px solid transparent;
		background-color: #dc2626;
		color: white;
	}

	.btn-danger:hover:not(:disabled) {
		background-color: #b91c1c;
	}

	.btn-secondary:disabled,
	.btn-danger:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>