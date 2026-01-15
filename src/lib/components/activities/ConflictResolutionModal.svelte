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
	import ConflictStrategySelector from './conflict-resolution/ConflictStrategySelector.svelte';
	import ConflictFieldSelection from './conflict-resolution/ConflictFieldSelection.svelte';
	import ConflictPreview from './conflict-resolution/ConflictPreview.svelte';

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
	const selectedFields = new SvelteSet<string>();
	let isExecuting = $state(false);

	// Computed properties
	const canProceed = $derived(() => {
		if (selectedStrategy === 'cancel') return true;
		if (selectedStrategy === 'force') return true;
		if (selectedStrategy === 'merge') return selectedFields.size > 0;
		return false;
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
	}

	function toggleAllFields() {
		if (selectedFields.size === conflictDetails.conflicts.length) {
			selectedFields.clear();
		} else {
			selectedFields.clear();
			conflictDetails.conflicts.forEach((c) => selectedFields.add(c.field));
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
				<ConflictStrategySelector bind:selectedStrategy onStrategyChange={handleStrategyChange} />

				<!-- Field Selection (for merge strategy) -->
				{#if selectedStrategy === 'merge'}
					<ConflictFieldSelection
						{conflictDetails}
						{selectedFields}
						onToggleAll={toggleAllFields}
						onToggleField={toggleField}
					/>
				{/if}

				<!-- Conflict Details (for force/cancel strategies) -->
				{#if selectedStrategy !== 'merge'}
					<ConflictPreview {conflictDetails} />
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
