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
	import { Undo2, Loader2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	interface Props {
		logId: string;
		userRole: string;
		action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
		isRollback: boolean;
		onSuccess?: () => void;
		onError?: (error: string) => void;
	}

	let {
		logId,
		userRole,
		action,
		isRollback,
		onSuccess,
		onError
	}: Props = $props();

	let isLoading = $state(false);
	let showConfirmDialog = $state(false);
	let reason = $state('');
	let hasConflicts = $state(false);
	let conflictDetails = $state<any>(null);

	const dispatch = createEventDispatcher();

	// Computed properties with $derived
	const isVisible = $derived(userRole === 'super_admin');
	const isDisabled = $derived(
		isRollback || action === 'READ' || isLoading
	);

	const disabledReason = $derived(() => {
		if (isRollback) return 'Cannot rollback a rollback operation';
		if (action === 'READ') return 'Cannot rollback READ operations';
		return '';
	});

	function handleButtonClick() {
		if (isDisabled) return;
		showConfirmDialog = true;
	}

	function handleCancel() {
		showConfirmDialog = false;
		reason = '';
		hasConflicts = false;
		conflictDetails = null;
	}

	async function handleConfirm() {
		if (!reason.trim() || reason.length < 10) {
			toast.error('Please provide a reason (minimum 10 characters)');
			return;
		}

		isLoading = true;

		try {
			// Call ExecuteRollback mutation
			const response = await fetch('/api/graphql', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					query: `
						mutation ExecuteRollback($input: ExecuteRollbackInput!) {
							executeRollback(input: $input) {
								success
								newLogId
								conflicts {
									hasConflicts
									conflictFields
									conflicts {
										field
										currentValue
										targetValue
										conflictType
									}
								}
								error
							}
						}
					`,
					variables: {
						input: {
							logId,
							reason: reason.trim(),
							strategy: 'force'
						}
					}
				})
			});

			const result = await response.json();

			if (result.errors) {
				throw new Error(result.errors[0].message);
			}

			const data = result.data.executeRollback;

			// Check for conflicts
			if (data.conflicts?.hasConflicts) {
				hasConflicts = true;
				conflictDetails = data.conflicts;
				toast.warning('Conflicts detected - resolution required');
				return;
			}

			if (data.success) {
				toast.success('Rollback executed successfully');
				showConfirmDialog = false;
				reason = '';

				if (onSuccess) {
					onSuccess();
				}

				dispatch('success', { newLogId: data.newLogId });
			} else {
				throw new Error(data.error || 'Rollback failed');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Rollback failed';
			toast.error(errorMessage);

			if (onError) {
				onError(errorMessage);
			}

			dispatch('error', { error: errorMessage });
		} finally {
			isLoading = false;
		}
	}

	function handleConflictResolution(strategy: 'force' | 'cancel' | 'merge', mergeFields?: string[]) {
		hasConflicts = false;
		conflictDetails = null;

		if (strategy === 'cancel') {
			handleCancel();
		} else {
			// Re-execute with chosen strategy
			executeWithStrategy(strategy, mergeFields);
		}
	}

	async function executeWithStrategy(strategy: 'force' | 'merge', mergeFields?: string[]) {
		isLoading = true;

		try {
			const response = await fetch('/api/graphql', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					query: `
						mutation ExecuteRollback($input: ExecuteRollbackInput!) {
							executeRollback(input: $input) {
								success
								newLogId
								error
							}
						}
					`,
					variables: {
						input: {
							logId,
							reason: reason.trim(),
							strategy,
							mergeFields: mergeFields || null
						}
					}
				})
			});

			const result = await response.json();

			if (result.errors) {
				throw new Error(result.errors[0].message);
			}

			const data = result.data.executeRollback;

			if (data.success) {
				toast.success('Rollback executed successfully');
				showConfirmDialog = false;
				reason = '';

				if (onSuccess) {
					onSuccess();
				}

				dispatch('success', { newLogId: data.newLogId });
			} else {
				throw new Error(data.error || 'Rollback failed');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Rollback failed';
			toast.error(errorMessage);

			if (onError) {
				onError(errorMessage);
			}
		} finally {
			isLoading = false;
		}
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
		<span>Rollback</span>
	</button>

	{#if showConfirmDialog && !hasConflicts}
		<div class="modal-backdrop" onclick={handleCancel}>
			<div class="modal-dialog" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h3>Confirm Rollback</h3>
				</div>

				<div class="modal-body">
					<p class="warning-text">
						You are about to rollback a <strong>{action}</strong> operation.
						This will restore the resource to its previous state.
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
					<button
						type="button"
						class="btn-secondary"
						onclick={handleCancel}
						disabled={isLoading}
					>
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
							Executing...
						{:else}
							Confirm Rollback
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if hasConflicts && conflictDetails}
		<!-- Conflict Resolution Modal would be imported here -->
		<!-- For now, show simple resolution options -->
		<div class="modal-backdrop" onclick={() => handleConflictResolution('cancel', undefined)}>
			<div class="modal-dialog" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h3>Conflicts Detected</h3>
				</div>

				<div class="modal-body">
					<p class="warning-text">
						{conflictDetails.conflictFields.length} field(s) have been modified since the snapshot was taken.
					</p>

					<div class="conflict-list">
						{#each conflictDetails.conflicts as conflict}
							<div class="conflict-item">
								<strong>{conflict.field}</strong>: {conflict.conflictType}
							</div>
						{/each}
					</div>

					<p>Choose how to resolve:</p>
					<ul>
						<li><strong>Force:</strong> Overwrite current values (destructive)</li>
						<li><strong>Cancel:</strong> Abort the rollback</li>
					</ul>
				</div>

				<div class="modal-footer">
					<button
						type="button"
						class="btn-secondary"
						onclick={() => handleConflictResolution('cancel', undefined)}
					>
						Cancel
					</button>
					<button
						type="button"
						class="btn-danger"
						onclick={() => handleConflictResolution('force', undefined)}
					>
						Force Rollback
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
		outline: none;
		border-color: #3b82f6;
		ring: 2px;
		ring-color: rgba(59, 130, 246, 0.5);
	}

	.char-count {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.conflict-list {
		margin: 1rem 0;
		padding: 0.75rem;
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 0.375rem;
	}

	.conflict-item {
		padding: 0.5rem 0;
		font-size: 0.875rem;
		color: #991b1b;
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
