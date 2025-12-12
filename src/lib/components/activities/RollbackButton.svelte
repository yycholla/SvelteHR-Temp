<script lang="ts">
	/**
	 * RollbackButton Component
	 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
	 * Task: T037
	 * Created: 2025-10-02
	 *
	 * Button component for executing rollbacks.
	 * Only visible to super_admin users.
	 * Disabled for rollback entries and READ operations.
	 */

	import { createEventDispatcher } from 'svelte';
	import { Loader2, Undo2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	interface Props {
		logId: string;
		action: string;
		canDirectRollback: boolean;
		canRequestRollback?: boolean;
		isRollback?: boolean;
		onSuccess?: () => void;
		onError?: (error: string) => void;
	}

	const {
		logId,
		action,
		canDirectRollback,
		canRequestRollback = false,
		isRollback = false,
		onSuccess,
		onError
	}: Props = $props();

	let isLoading = $state(false);
	let showConfirmDialog = $state(false);
	let reason = $state('');

	const dispatch = createEventDispatcher();

	// Computed properties with $derived
	const isVisible = $derived(canDirectRollback || canRequestRollback);
	const isRequestMode = $derived(!canDirectRollback && canRequestRollback);
	const isDisabled = $derived(isRollback || action.toUpperCase() === 'VIEW' || isLoading);

	const disabledReason = $derived(() => {
		if (isRollback) return 'Cannot rollback a rollback operation';
		if (action.toUpperCase() === 'VIEW') return 'Cannot rollback view operations';
		return '';
	});

	const buttonText = $derived(isRequestMode ? 'Request Rollback' : 'Rollback');
	const confirmTitle = $derived(isRequestMode ? 'Request Rollback' : 'Confirm Rollback');
	const confirmButtonText = $derived(isRequestMode ? 'Submit Request' : 'Confirm Rollback');

	function handleButtonClick() {
		if (isDisabled) return;
		showConfirmDialog = true;
	}

	function handleCancel() {
		showConfirmDialog = false;
		reason = '';
	}

	async function handleConfirm() {
		if (!reason.trim() || reason.length < 10) {
			toast.error('Please provide a reason (minimum 10 characters)');
			return;
		}

		isLoading = true;

		try {
			if (isRequestMode) {
				// Submit rollback request for approval
				await submitRollbackRequest();
			} else {
				// Execute rollback directly
				await executeRollback();
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Operation failed';
			toast.error(errorMessage);

			if (onError) {
				onError(errorMessage);
			}

			dispatch('error', { error: errorMessage });
		} finally {
			isLoading = false;
		}
	}

	async function submitRollbackRequest() {
		const response = await fetch('/api/activities/rollback-request', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				logId,
				reason: reason.trim()
			})
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.message || 'Failed to submit rollback request');
		}

		const result = await response.json();

		toast.success('Rollback request submitted for approval');
		showConfirmDialog = false;
		reason = '';

		if (onSuccess) {
			onSuccess();
		}

		dispatch('success', { requestId: result.requestId });
	}

	async function executeRollback() {
		// Call execute_rollback function (PostGraphile exposes it as executeRollback mutation)
		const response = await fetch('/api/graphql', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				query: `
					mutation ExecuteRollback($input: ExecuteRollbackInput!) {
						executeRollback(input: $input) {
							results {
								success
								newLogId
								error
							}
						}
					}
				`,
				variables: {
					input: {
						pLogId: logId,
						pReason: reason.trim(),
						pStrategy: 'force',
						pExecutedBy: null
					}
				}
			})
		});

		const result = await response.json();

		if (result.errors) {
			throw new Error(result.errors[0].message);
		}

		const data = result.data?.executeRollback?.results?.[0];

		if (!data?.success) {
			throw new Error(data?.error || 'Rollback failed');
		}

		toast.success('Rollback executed successfully');
		showConfirmDialog = false;
		reason = '';

		if (onSuccess) {
			onSuccess();
		}

		dispatch('success', { newLogId: data.newLogId });
	}
</script>

{#if isVisible}
	<button
		type="button"
		class="rollback-button"
		class:disabled={isDisabled}
		disabled={isDisabled}
		title={disabledReason() || 'Rollback this operation'}
		onclick={handleButtonClick}
		aria-label="Rollback operation"
	>
		{#if isLoading}
			<Loader2 class="animate-spin" size={16} />
		{:else}
			<Undo2 size={16} />
		{/if}
		<span>{buttonText}</span>
	</button>

	{#if showConfirmDialog}
		<div
			class="modal-backdrop"
			role="button"
			tabindex="0"
			onclick={handleCancel}
			onkeydown={(e) => {
				if (e.key === 'Escape' || e.key === 'Enter') {
					handleCancel();
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
					<h3>{confirmTitle}</h3>
				</div>

				<div class="modal-body">
					<p class="warning-text">
						{#if isRequestMode}
							You are requesting a rollback for a <strong>{action.toUpperCase()}</strong> operation. A
							super admin will need to approve this request.
						{:else}
							You are about to rollback a <strong>{action.toUpperCase()}</strong> operation. This will
							restore the resource to its previous state.
						{/if}
					</p>

					<div class="form-group">
						<label for="reason">Reason for rollback (required):</label>
						<textarea
							id="reason"
							bind:value={reason}
							placeholder="Explain why this rollback is necessary (minimum 10 characters)"
							rows="4"
							required
						></textarea>
						<span class="char-count">{reason.length} / 10 minimum</span>
					</div>
				</div>

				<div class="modal-footer">
					<button type="button" class="btn-secondary" onclick={handleCancel} disabled={isLoading}>
						Cancel
					</button>
					<button
						type="button"
						class="btn-danger"
						onclick={handleConfirm}
						disabled={isLoading || reason.length < 10}
					>
						{#if isLoading}
							<Loader2 class="animate-spin" size={16} />
							{isRequestMode ? 'Submitting...' : 'Executing...'}
						{:else}
							{confirmButtonText}
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	.rollback-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
		background-color: white;
		color: #374151;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.rollback-button:hover:not(.disabled) {
		background-color: #f9fafb;
		border-color: #d1d5db;
	}

	.rollback-button:active:not(.disabled) {
		background-color: #f3f4f6;
	}

	.rollback-button.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

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
