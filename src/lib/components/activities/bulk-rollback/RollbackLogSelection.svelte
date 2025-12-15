<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';

	interface ActivityLogSummary {
		id: string;
		action: 'CREATE' | 'UPDATE' | 'DELETE';
		resourceType: string;
		resourceId: string;
		employeeName: string;
		createdAt: string;
	}

	interface Props {
		logs: ActivityLogSummary[];
		selectedLogs: SvelteSet<string>;
		isMaxSelected: boolean;
		onSelectAll: () => void;
		onToggleLog: (id: string) => void;
	}

	const { logs, selectedLogs, isMaxSelected, onSelectAll, onToggleLog }: Props = $props();

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

<div class="selection-header">
	<div class="select-info">
		<span class="selected-count">
			{selectedLogs.size} / {Math.min(logs.length, 100)} selected
		</span>
		{#if isMaxSelected}
			<span class="max-warning">Maximum reached</span>
		{/if}
	</div>
	<button type="button" class="btn-select-all" onclick={onSelectAll}>
		{selectedLogs.size === logs.length ? 'Deselect All' : 'Select All'}
	</button>
</div>

<div class="logs-list">
	{#each logs as log (log.id)}
		<label class="log-item">
			<input
				type="checkbox"
				checked={selectedLogs.has(log.id)}
				onchange={() => onToggleLog(log.id)}
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

<style>
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
</style>
