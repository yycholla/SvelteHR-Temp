<script lang="ts">
	import { ChevronDown, ChevronUp } from '@lucide/svelte';

	interface Props {
		status: 'pending' | 'approved' | 'rejected';
		relativeTime: string;
		isExpanded: boolean;
		onToggleExpanded: () => void;
	}

	const { status, relativeTime, isExpanded, onToggleExpanded }: Props = $props();

	const statusColor = $derived.by(() => {
		switch (status) {
			case 'approved':
				return 'green';
			case 'rejected':
				return 'red';
			case 'pending':
				return 'yellow';
			default:
				return 'gray';
		}
	});
</script>

<div class="card-header">
	<div class="request-info">
		<div class="status-badge" data-status={status} data-color={statusColor}>
			{status.toUpperCase()}
		</div>
		<span class="timestamp">{relativeTime}</span>
	</div>

	<button
		type="button"
		class="expand-button"
		onclick={onToggleExpanded}
		aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
	>
		{#if isExpanded}
			<ChevronUp size={20} />
		{:else}
			<ChevronDown size={20} />
		{/if}
	</button>
</div>

<style>
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.request-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.status-badge[data-color='green'] {
		background-color: #d1fae5;
		color: #065f46;
	}

	.status-badge[data-color='red'] {
		background-color: #fee2e2;
		color: #991b1b;
	}

	.status-badge[data-color='yellow'] {
		background-color: #fef3c7;
		color: #92400e;
	}

	.timestamp {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.expand-button {
		padding: 0.5rem;
		border: none;
		background: none;
		color: #6b7280;
		cursor: pointer;
		border-radius: 0.375rem;
		transition: background-color 0.15s ease;
	}

	.expand-button:hover {
		background-color: #f3f4f6;
	}
</style>
