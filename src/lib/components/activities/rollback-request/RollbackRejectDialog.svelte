<script lang="ts">
	import { Loader2 } from '@lucide/svelte';

	interface Props {
		open: boolean;
		rejectionReason: string;
		isLoading: boolean;
		onConfirm: () => void;
		onCancel: () => void;
	}

	let {
		open = $bindable(),
		rejectionReason = $bindable(),
		isLoading,
		onConfirm,
		onCancel
	}: Props = $props();
</script>

{#if open}
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
			<div class="modal-header">
				<h3>Reject Rollback Request</h3>
			</div>

			<div class="modal-body">
				<p class="warning-text">You are about to reject this rollback request.</p>

				<div class="form-group">
					<label for="rejection-reason">Rejection reason (required):</label>
					<textarea
						id="rejection-reason"
						bind:value={rejectionReason}
						placeholder="Explain why this request is being rejected (minimum 10 characters)"
						rows="4"
						required
					></textarea>
					<span class="char-count">{rejectionReason.length} / 10 minimum</span>
				</div>
			</div>

			<div class="modal-footer">
				<button type="button" class="btn-secondary" onclick={onCancel} disabled={isLoading}>
					Cancel
				</button>
				<button
					type="button"
					class="btn-danger"
					onclick={onConfirm}
					disabled={isLoading || rejectionReason.length < 10}
				>
					{#if isLoading}
						<Loader2 class="animate-spin" size={16} />
						Rejecting...
					{:else}
						Confirm Rejection
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
	}

	.modal-dialog {
		background-color: white;
		border-radius: 0.5rem;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
		max-width: 32rem;
		width: 100%;
		margin: 1rem;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
	}

	.modal-body {
		padding: 1.5rem;
	}

	.warning-text {
		margin-bottom: 1rem;
		padding: 0.75rem;
		background-color: #fef3c7;
		border: 1px solid #fbbf24;
		border-radius: 0.375rem;
		color: #92400e;
		font-size: 0.875rem;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.form-group textarea {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		resize: vertical;
	}

	.form-group textarea:focus {
		outline: 2px solid rgba(59, 130, 246, 0.5);
		border-color: #3b82f6;
	}

	.char-count {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.75rem;
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
