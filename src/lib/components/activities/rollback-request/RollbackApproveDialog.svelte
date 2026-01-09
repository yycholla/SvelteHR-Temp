<script lang="ts">
	import { Loader2 } from '@lucide/svelte';

	interface Props {
		open: boolean;
		approvalReason: string;
		isLoading: boolean;
		onConfirm: () => void;
		onCancel: () => void;
	}

	let {
		open = $bindable(),
		approvalReason = $bindable(),
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
				<h3>Approve Rollback Request</h3>
			</div>

			<div class="modal-body">
				<p>You are about to approve this rollback request.</p>

				<div class="form-group">
					<label for="approval-reason">Approval reason (optional):</label>
					<textarea
						id="approval-reason"
						bind:value={approvalReason}
						placeholder="Add any notes about this approval"
						rows="3"
					></textarea>
				</div>
			</div>

			<div class="modal-footer">
				<button type="button" class="btn-secondary" onclick={onCancel} disabled={isLoading}>
					Cancel
				</button>
				<button type="button" class="btn-primary" onclick={onConfirm} disabled={isLoading}>
					{#if isLoading}
						<Loader2 class="animate-spin" size={16} />
						Approving...
					{:else}
						Confirm Approval
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

	.modal-footer {
		padding: 1.5rem;
		border-top: 1px solid #e5e7eb;
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.btn-secondary,
	.btn-primary {
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

	.btn-secondary:disabled,
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
