<script lang="ts">
	interface Props {
		selectedCount: number;
		isSubmitting: boolean;
		canSubmit: boolean;
		onClose: () => void;
		onSubmit: () => void;
	}

	let { selectedCount, isSubmitting, canSubmit, onClose, onSubmit }: Props = $props();
</script>

<div class="modal-footer">
	<div class="selection-summary">
		{#if selectedCount > 0}
			<span class="summary-text">
				{selectedCount} selected
			</span>
		{:else}
			<span class="summary-text">No selections</span>
		{/if}
	</div>

	<div class="footer-actions">
		<button class="cancel-button" onclick={onClose} disabled={isSubmitting}> Cancel </button>
		<button class="assign-button" onclick={onSubmit} disabled={!canSubmit}>
			{isSubmitting ? 'Assigning...' : 'Assign Document'}
		</button>
	</div>
</div>

<style>
	.modal-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-top: 1px solid #e2e8f0;
	}

	.selection-summary {
		font-size: 0.875rem;
		color: #4a5568;
	}

	.footer-actions {
		display: flex;
		gap: 0.75rem;
	}

	.cancel-button,
	.assign-button {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.cancel-button {
		background: white;
		color: #4a5568;
		border: 1px solid #cbd5e0;
	}

	.cancel-button:hover:not(:disabled) {
		background: #f7fafc;
	}

	.assign-button {
		background: #4299e1;
		color: white;
	}

	.assign-button:hover:not(:disabled) {
		background: #3182ce;
	}

	.cancel-button:disabled,
	.assign-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
