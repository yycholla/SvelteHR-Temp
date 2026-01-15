<script lang="ts">
	interface Props {
		selectedStrategy: 'force' | 'cancel' | 'merge';
		onStrategyChange: (strategy: 'force' | 'cancel' | 'merge') => void;
	}

	let { selectedStrategy = $bindable(), onStrategyChange }: Props = $props();

	const strategyDescription = $derived.by(() => {
		switch (selectedStrategy) {
			case 'force':
				return 'Overwrite all current values with snapshot values (destructive operation)';
			case 'cancel':
				return 'Abort the rollback operation and keep current values';
			case 'merge':
				return 'Select specific fields to rollback, keep others unchanged';
			default:
				return '';
		}
	});
</script>

<div class="strategy-section">
	<h4>Resolution Strategy</h4>

	<div class="strategy-options">
		<!-- Force Strategy -->
		<label class="strategy-option" class:selected={selectedStrategy === 'force'}>
			<input
				type="radio"
				name="strategy"
				value="force"
				checked={selectedStrategy === 'force'}
				onchange={() => onStrategyChange('force')}
			/>
			<div class="strategy-content">
				<div class="strategy-header">
					<strong>Force Rollback</strong>
					<span class="badge badge-danger">Destructive</span>
				</div>
				<p class="strategy-description">
					Overwrite all current values with snapshot values. This will discard any changes made
					after the snapshot.
				</p>
			</div>
		</label>

		<!-- Merge Strategy -->
		<label class="strategy-option" class:selected={selectedStrategy === 'merge'}>
			<input
				type="radio"
				name="strategy"
				value="merge"
				checked={selectedStrategy === 'merge'}
				onchange={() => onStrategyChange('merge')}
			/>
			<div class="strategy-content">
				<div class="strategy-header">
					<strong>Selective Merge</strong>
					<span class="badge badge-warning">Partial</span>
				</div>
				<p class="strategy-description">
					Select specific fields to rollback. Other fields will retain their current values.
				</p>
			</div>
		</label>

		<!-- Cancel Strategy -->
		<label class="strategy-option" class:selected={selectedStrategy === 'cancel'}>
			<input
				type="radio"
				name="strategy"
				value="cancel"
				checked={selectedStrategy === 'cancel'}
				onchange={() => onStrategyChange('cancel')}
			/>
			<div class="strategy-content">
				<div class="strategy-header">
					<strong>Cancel Rollback</strong>
					<span class="badge badge-secondary">Safe</span>
				</div>
				<p class="strategy-description">Abort the rollback operation. No changes will be made.</p>
			</div>
		</label>
	</div>

	<div class="strategy-info">
		<p>{strategyDescription}</p>
	</div>
</div>

<style>
	.strategy-section {
		margin-bottom: 1.5rem;
	}

	.strategy-section h4 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
	}

	.strategy-options {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.strategy-option {
		display: flex;
		gap: 0.75rem;
		padding: 1rem;
		border: 2px solid #e5e7eb;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.strategy-option:hover {
		border-color: #d1d5db;
		background-color: #f9fafb;
	}

	.strategy-option.selected {
		border-color: #3b82f6;
		background-color: #eff6ff;
	}

	.strategy-option input[type='radio'] {
		margin-top: 0.25rem;
		cursor: pointer;
	}

	.strategy-content {
		flex: 1;
	}

	.strategy-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.strategy-description {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.badge {
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.badge-danger {
		background-color: #fee2e2;
		color: #991b1b;
	}

	.badge-warning {
		background-color: #fef3c7;
		color: #92400e;
	}

	.badge-secondary {
		background-color: #f3f4f6;
		color: #374151;
	}

	.strategy-info {
		padding: 0.75rem;
		background-color: #f9fafb;
		border-radius: 0.375rem;
	}

	.strategy-info p {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
	}
</style>
