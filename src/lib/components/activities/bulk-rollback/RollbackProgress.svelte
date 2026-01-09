<script lang="ts">
	import { AlertCircle, CheckCircle, Loader2, XCircle } from '@lucide/svelte';

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
		progress: BulkRollbackProgress;
		progressPercentage: number;
	}

	const { progress, progressPercentage }: Props = $props();
</script>

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

<style>
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
</style>
