<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';

	interface ConflictDetail {
		field: string;
		currentValue: unknown;
		targetValue: unknown;
		conflictType: 'value_mismatch' | 'type_mismatch' | 'missing_field' | 'unexpected_field';
	}

	interface ConflictData {
		conflictFields: string[];
		conflicts: ConflictDetail[];
	}

	interface Props {
		conflictDetails: ConflictData;
		selectedFields: SvelteSet<string>;
		onToggleAll: () => void;
		onToggleField: (field: string) => void;
	}

	const { conflictDetails, selectedFields, onToggleAll, onToggleField }: Props = $props();

	function formatValue(value: unknown): string {
		if (value === null) return 'null';
		if (value === undefined) return 'undefined';
		if (typeof value === 'object') return JSON.stringify(value, null, 2);
		return String(value);
	}

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

<div class="field-selection">
	<div class="field-selection-header">
		<h4>Select Fields to Rollback</h4>
		<button type="button" class="btn-link" onclick={onToggleAll}>
			{selectedFields.size === conflictDetails.conflicts.length ? 'Deselect All' : 'Select All'}
		</button>
	</div>

	<div class="conflict-list">
		{#each conflictDetails.conflicts as conflict (conflict.field)}
			<label class="conflict-item" class:selected={selectedFields.has(conflict.field)}>
				<input
					type="checkbox"
					checked={selectedFields.has(conflict.field)}
					onchange={() => onToggleField(conflict.field)}
				/>
				<div class="conflict-content">
					<div class="conflict-header">
						<span class="conflict-icon">{getConflictIcon(conflict.conflictType)}</span>
						<strong class="field-name">{conflict.field}</strong>
						<span class="conflict-type">{getConflictLabel(conflict.conflictType)}</span>
					</div>

					<div class="value-comparison">
						<div class="value-box">
							<span class="value-label">Current Value:</span>
							<pre class="value-content">{formatValue(conflict.currentValue)}</pre>
						</div>
						<div class="arrow">→</div>
						<div class="value-box">
							<span class="value-label">Target Value:</span>
							<pre class="value-content">{formatValue(conflict.targetValue)}</pre>
						</div>
					</div>
				</div>
			</label>
		{/each}
	</div>

	<div class="field-count">
		<p>
			Selected: <strong>{selectedFields.size}</strong> of
			<strong>{conflictDetails.conflicts.length}</strong> fields
		</p>
	</div>
</div>

<style>
	.field-selection {
		margin-bottom: 1.5rem;
	}

	.field-selection-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.field-selection-header h4 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
	}

	.btn-link {
		padding: 0;
		border: none;
		background: transparent;
		color: #3b82f6;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: color 0.15s ease;
	}

	.btn-link:hover {
		color: #2563eb;
		text-decoration: underline;
	}

	.conflict-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
		max-height: 20rem;
		overflow-y: auto;
	}

	.conflict-item {
		display: flex;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.conflict-item:hover {
		border-color: #d1d5db;
		background-color: #f9fafb;
	}

	.conflict-item.selected {
		border-color: #3b82f6;
		background-color: #eff6ff;
	}

	.conflict-item input[type='checkbox'] {
		margin-top: 0.25rem;
		cursor: pointer;
	}

	.conflict-content {
		flex: 1;
	}

	.conflict-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
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

	.value-comparison {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 0.75rem;
		align-items: center;
	}

	.value-box {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.value-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: #6b7280;
	}

	.value-content {
		margin: 0;
		padding: 0.5rem;
		background-color: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 0.25rem;
		font-family: 'Courier New', monospace;
		font-size: 0.75rem;
		color: #111827;
		overflow-x: auto;
		white-space: pre-wrap;
		word-break: break-all;
	}

	.arrow {
		color: #6b7280;
		font-weight: bold;
	}

	.field-count {
		padding: 0.75rem;
		background-color: #f9fafb;
		border-radius: 0.375rem;
		text-align: center;
	}

	.field-count p {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
	}
</style>
