<script lang="ts">
	interface ConflictDetail {
		field: string;
		conflictType: 'value_mismatch' | 'type_mismatch' | 'missing_field' | 'unexpected_field';
	}

	interface ConflictData {
		conflicts: ConflictDetail[];
	}

	interface Props {
		conflictDetails: ConflictData;
	}

	const { conflictDetails }: Props = $props();

	function getConflictIcon(conflictType: string): string {
		switch (conflictType) {
			case 'value_mismatch':
				return '🔄';
			case 'type_mismatch':
				return '⚠️';
			case 'missing_field':
				return '➖';
			case 'unexpected_field':
				return '➕';
			default:
				return '❓';
		}
	}

	function getConflictLabel(conflictType: string): string {
		switch (conflictType) {
			case 'value_mismatch':
				return 'Value Changed';
			case 'type_mismatch':
				return 'Type Mismatch';
			case 'missing_field':
				return 'Field Removed';
			case 'unexpected_field':
				return 'Field Added';
			default:
				return 'Unknown Conflict';
		}
	}
</script>

<div class="conflict-preview">
	<h4>Affected Fields</h4>
	<div class="conflict-list-compact">
		{#each conflictDetails.conflicts as conflict (conflict.field)}
			<div class="conflict-item-compact">
				<span class="conflict-icon">{getConflictIcon(conflict.conflictType)}</span>
				<span class="field-name">{conflict.field}</span>
				<span class="conflict-type">{getConflictLabel(conflict.conflictType)}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.conflict-preview {
		margin-bottom: 1.5rem;
	}

	.conflict-preview h4 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
	}

	.conflict-list-compact {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 12rem;
		overflow-y: auto;
		padding: 0.75rem;
		background-color: #f9fafb;
		border-radius: 0.375rem;
	}

	.conflict-item-compact {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.conflict-icon {
		font-size: 1rem;
	}

	.field-name {
		font-family: 'Courier New', monospace;
		font-size: 0.875rem;
		color: #111827;
	}

	.conflict-type {
		margin-left: auto;
		padding: 0.125rem 0.5rem;
		background-color: #fef3c7;
		color: #92400e;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}
</style>
