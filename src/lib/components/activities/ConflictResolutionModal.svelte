<script lang="ts">
	/**
	 * ConflictResolutionModal Component
	 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
	 * Task: T040
	 * Created: 2025-10-02
	 *
	 * Modal for resolving conflicts detected during rollback operations.
	 * Displays field-by-field comparison and supports 3 resolution strategies.
	 */

	import { SvelteSet } from 'svelte/reactivity';
	import { AlertTriangle, Loader2, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

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
		onResolve: (strategy: 'force' | 'cancel' | 'merge', mergeFields?: string[]) => void;
		onCancel: () => void;
		isOpen: boolean;
	}

	const { conflictDetails, onResolve, onCancel, isOpen }: Props = $props();

	let selectedStrategy = $state<'force' | 'cancel' | 'merge'>('cancel');
	let selectedFields = $state(new SvelteSet<string>());
	let isExecuting = $state(false);

	// Computed properties
	const canProceed = $derived(() => {
		if (selectedStrategy === 'cancel') return true;
		if (selectedStrategy === 'force') return true;
		if (selectedStrategy === 'merge') return selectedFields.size > 0;
		return false;
	});

	const strategyDescription = $derived(() => {
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

	function handleStrategyChange(strategy: 'force' | 'cancel' | 'merge') {
		selectedStrategy = strategy;
		// Clear field selections when switching strategies
		if (strategy !== 'merge') {
			selectedFields.clear();
		}
	}

	function toggleField(field: string) {
		if (selectedFields.has(field)) {
			selectedFields.delete(field);
		} else {
			selectedFields.add(field);
		}
		selectedFields = selectedFields; // Trigger reactivity
	}

	function toggleAllFields() {
		if (selectedFields.size === conflictDetails.conflicts.length) {
			selectedFields.clear();
		} else {
			selectedFields = new SvelteSet(conflictDetails.conflicts.map((c) => c.field));
		}
	}

	async function handleConfirm() {
		if (!canProceed()) {
			toast.error('Please select at least one field for merge strategy');
			return;
		}

		if (selectedStrategy === 'cancel') {
			onCancel();
			return;
		}

		isExecuting = true;

		try {
			const mergeFields = selectedStrategy === 'merge' ? Array.from(selectedFields) : undefined;
			onResolve(selectedStrategy, mergeFields);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Resolution failed';
			toast.error(errorMessage);
		} finally {
			isExecuting = false;
		}
	}

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

{#if isOpen}
	<div
		class="modal-backdrop"
		role="button"
		tabindex="0"
		onclick={onCancel}
		onkeydown={(e) => {
			if (e.key === 'Escape' || e.key === 'Enter') {
				onCancel();
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
			<!-- Header -->
			<div class="modal-header">
				<div class="header-content">
					<AlertTriangle class="header-icon" size={24} />
					<h3>Resolve Conflicts</h3>
				</div>
				<button type="button" class="close-button" onclick={onCancel} aria-label="Close">
					<X size={20} />
				</button>
			</div>

			<!-- Body -->
			<div class="modal-body">
				<!-- Conflict Summary -->
				<div class="conflict-summary">
					<p class="summary-text">
						<strong>{conflictDetails.conflictFields.length} field(s)</strong> have been modified since
						the snapshot was taken. Choose how to resolve these conflicts:
					</p>
				</div>

				<!-- Strategy Selection -->
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
								onchange={() => handleStrategyChange('force')}
							/>
							<div class="strategy-content">
								<div class="strategy-header">
									<strong>Force Rollback</strong>
									<span class="badge badge-danger">Destructive</span>
								</div>
								<p class="strategy-description">
									Overwrite all current values with snapshot values. This will discard any changes
									made after the snapshot.
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
								onchange={() => handleStrategyChange('merge')}
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
								onchange={() => handleStrategyChange('cancel')}
							/>
							<div class="strategy-content">
								<div class="strategy-header">
									<strong>Cancel Rollback</strong>
									<span class="badge badge-secondary">Safe</span>
								</div>
								<p class="strategy-description">
									Abort the rollback operation. No changes will be made.
								</p>
							</div>
						</label>
					</div>

					<div class="strategy-info">
						<p>{strategyDescription()}</p>
					</div>
				</div>

				<!-- Field Selection (for merge strategy) -->
				{#if selectedStrategy === 'merge'}
					<div class="field-selection">
						<div class="field-selection-header">
							<h4>Select Fields to Rollback</h4>
							<button type="button" class="btn-link" onclick={toggleAllFields}>
								{selectedFields.size === conflictDetails.conflicts.length
									? 'Deselect All'
									: 'Select All'}
							</button>
						</div>

						<div class="conflict-list">
							{#each conflictDetails.conflicts as conflict (conflict.field)}
								<label class="conflict-item" class:selected={selectedFields.has(conflict.field)}>
									<input
										type="checkbox"
										checked={selectedFields.has(conflict.field)}
										onchange={() => toggleField(conflict.field)}
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
				{/if}

				<!-- Conflict Details (for force/cancel strategies) -->
				{#if selectedStrategy !== 'merge'}
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
				{/if}

				<!-- Warning Message -->
				<div class="warning-box">
					<AlertTriangle size={16} />
					<p>
						{#if selectedStrategy === 'force'}
							<strong>Warning:</strong> This operation will permanently overwrite current data.
						{:else if selectedStrategy === 'merge'}
							<strong>Note:</strong> Only selected fields will be rolled back.
						{:else}
							<strong>Info:</strong> No changes will be made.
						{/if}
					</p>
				</div>
			</div>

			<!-- Footer -->
			<div class="modal-footer">
				<button type="button" class="btn-secondary" onclick={onCancel} disabled={isExecuting}>
					Cancel
				</button>
				<button
					type="button"
					class="btn-primary"
					class:btn-danger={selectedStrategy === 'force'}
					onclick={handleConfirm}
					disabled={isExecuting || !canProceed()}
				>
					{#if isExecuting}
						<Loader2 class="animate-spin" size={16} />
						Executing...
					{:else if selectedStrategy === 'cancel'}
						Abort Rollback
					{:else if selectedStrategy === 'force'}
						Force Rollback
					{:else}
						Merge & Rollback
					{/if}
				</button>
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
		animation: fadeIn 0.15s ease;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.modal-dialog {
		background-color: white;
		border-radius: 0.5rem;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
		max-width: 48rem;
		width: 100%;
		margin: 1rem;
		max-height: 90vh;
		overflow-y: auto;
		animation: slideUp 0.2s ease;
	}

	@keyframes slideUp {
		from {
			transform: translateY(20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.modal-header {
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
	}

	.close-button {
		padding: 0.25rem;
		border: none;
		background: transparent;
		color: #6b7280;
		cursor: pointer;
		border-radius: 0.25rem;
		transition: all 0.15s ease;
	}

	.close-button:hover {
		background-color: #f3f4f6;
		color: #111827;
	}

	.modal-body {
		padding: 1.5rem;
	}

	.conflict-summary {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background-color: #fef3c7;
		border: 1px solid #fbbf24;
		border-radius: 0.375rem;
	}

	.summary-text {
		margin: 0;
		color: #92400e;
		font-size: 0.875rem;
	}

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

	.warning-box {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 0.375rem;
		color: #991b1b;
	}

	.warning-box p {
		margin: 0;
		font-size: 0.875rem;
	}

	.modal-footer {
		padding: 1.5rem;
		border-top: 1px solid #e5e7eb;
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.btn-secondary,
	.btn-primary,
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

	.btn-primary {
		border: 1px solid transparent;
		background-color: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #2563eb;
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
	.btn-primary:disabled,
	.btn-danger:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
