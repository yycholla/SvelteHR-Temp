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
	import { AlertCircle, CheckCircle, Loader2, XCircle } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

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

	let selectedLogs = $state(new SvelteSet<string>());
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
			const logsToSelect = logs.slice(0, 100); // Max 100
			selectedLogs = new SvelteSet(logsToSelect.map((log) => log.id));
		}
	}

	function handleToggleLog(logId: string) {
		if (selectedLogs.has(logId)) {
			selectedLogs.delete(logId);
			selectedLogs = selectedLogs; // Trigger reactivity
		} else {
			if (selectedLogs.size < 100) {
				selectedLogs.add(logId);
				selectedLogs = selectedLogs; // Trigger reactivity
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

	function getActionColor(action: string) {
		switch (action) {
			case 'CREATE':
				return 'blue';
			case 'UPDATE':
				return 'yellow';
			case 'DELETE':
				return 'red';
			default:
				return 'gray';
		}
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
					<div class="selection-header">
						<div class="select-info">
							<span class="selected-count">
								{selectedLogs.size} / {Math.min(logs.length, 100)} selected
							</span>
							{#if isMaxSelected}
								<span class="max-warning">Maximum reached</span>
							{/if}
						</div>
						<button type="button" class="btn-select-all" onclick={handleSelectAll}>
							{selectedLogs.size === logs.length ? 'Deselect All' : 'Select All'}
						</button>
					</div>

					<div class="logs-list">
						{#each logs as log (log.id)}
							<label class="log-item">
								<input
									type="checkbox"
									checked={selectedLogs.has(log.id)}
									onchange={() => handleToggleLog(log.id)}
									disabled={isMaxSelected && !selectedLogs.has(log.id)}
								/>
								<div class="log-content">
									<div class="log-header">
										<span class="action-badge" data-color={getActionColor(log.action)}>
											{log.action}
										</span>
										<span class="resource-info">
											{log.resourceType} / {log.resourceId.slice(0, 8)}...
										</span>
									</div>
									<div class="log-meta">
										<span>{log.employeeName}</span>
										<span>•</span>
										<span>{new Date(log.createdAt).toLocaleString()}</span>
									</div>
								</div>
							</label>
						{/each}
					</div>
				{:else}
					<!-- Processing Phase -->
					<div class="progress-section">
						<div class="progress-header">
							<div class="status-indicator" data-status={progress.status}>
								{#if progress.status === 'IN_PROGRESS' || progress.status === 'QUEUED'}
									<Loader2 class="animate-spin" size={24} />
								{:else if progress.status === 'COMPLETED'}
									<CheckCircle size={24} />
								{:else}
									<XCircle size={24} />
								{/if}
								<span class="status-text">{progress.status}</span>
							</div>
						</div>

						<div class="progress-bar">
							<div class="progress-fill" style="width: {progressPercentage}%"></div>
						</div>

						<div class="progress-stats">
							<div class="stat">
								<span class="stat-label">Processed</span>
								<span class="stat-value">{progress.processedCount} / {progress.totalCount}</span>
							</div>
							<div class="stat">
								<span class="stat-label">Successful</span>
								<span class="stat-value success">{progress.successfulCount}</span>
							</div>
							<div class="stat">
								<span class="stat-label">Failed</span>
								<span class="stat-value error">{progress.failedCount}</span>
							</div>
						</div>

						{#if progress.currentLogId}
							<div class="current-log">
								<span class="label">Processing:</span>
								<span class="log-id">{progress.currentLogId.slice(0, 8)}...</span>
							</div>
						{/if}

						{#if progress.lastError}
							<div class="error-message">
								<AlertCircle size={16} />
								<span>{progress.lastError}</span>
							</div>
						{/if}

						{#if progress.status === 'COMPLETED' || progress.status === 'FAILED'}
							<div class="summary-section">
								<h4>Summary</h4>
								<p>
									Batch completed with {progress.successfulCount} successful rollbacks
									{#if progress.failedCount > 0}
										and {progress.failedCount} failures
									{/if}.
								</p>
							</div>
						{/if}
					</div>
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

	.selection-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.select-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.selected-count {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	.max-warning {
		padding: 0.25rem 0.75rem;
		background-color: #fef3c7;
		color: #92400e;
		font-size: 0.75rem;
		font-weight: 600;
		border-radius: 9999px;
	}

	.btn-select-all {
		padding: 0.5rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		background-color: white;
		color: #374151;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.btn-select-all:hover {
		background-color: #f9fafb;
	}

	.logs-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 24rem;
		overflow-y: auto;
	}

	.log-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.log-item:hover {
		background-color: #f9fafb;
	}

	.log-item input[type='checkbox'] {
		margin-top: 0.25rem;
		cursor: pointer;
	}

	.log-content {
		flex: 1;
	}

	.log-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.action-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.action-badge[data-color='blue'] {
		background-color: #dbeafe;
		color: #1e40af;
	}

	.action-badge[data-color='yellow'] {
		background-color: #fef3c7;
		color: #92400e;
	}

	.action-badge[data-color='red'] {
		background-color: #fee2e2;
		color: #991b1b;
	}

	.resource-info {
		font-size: 0.875rem;
		color: #6b7280;
		font-family: monospace;
	}

	.log-meta {
		font-size: 0.75rem;
		color: #9ca3af;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.progress-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.progress-header {
		display: flex;
		justify-content: center;
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		font-weight: 600;
	}

	.status-indicator[data-status='QUEUED'],
	.status-indicator[data-status='IN_PROGRESS'] {
		background-color: #dbeafe;
		color: #1e40af;
	}

	.status-indicator[data-status='COMPLETED'] {
		background-color: #d1fae5;
		color: #065f46;
	}

	.status-indicator[data-status='FAILED'] {
		background-color: #fee2e2;
		color: #991b1b;
	}

	.progress-bar {
		height: 0.5rem;
		background-color: #e5e7eb;
		border-radius: 9999px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background-color: #3b82f6;
		transition: width 0.3s ease;
	}

	.progress-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
	}

	.stat-label {
		font-size: 0.75rem;
		color: #6b7280;
		text-transform: uppercase;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
	}

	.stat-value.success {
		color: #10b981;
	}

	.stat-value.error {
		color: #ef4444;
	}

	.current-log {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background-color: #f9fafb;
		border-radius: 0.375rem;
		font-size: 0.875rem;
	}

	.current-log .label {
		font-weight: 600;
		color: #374151;
	}

	.current-log .log-id {
		font-family: monospace;
		color: #6b7280;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background-color: #fee2e2;
		border: 1px solid #fecaca;
		border-radius: 0.375rem;
		color: #991b1b;
		font-size: 0.875rem;
	}

	.summary-section {
		padding: 1rem;
		background-color: #f9fafb;
		border-radius: 0.375rem;
	}

	.summary-section h4 {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	.summary-section p {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
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
