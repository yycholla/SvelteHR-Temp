<script lang="ts">
	/**
	 * RollbackRequestCard Component
	 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
	 * Task: T038
	 * Created: 2025-10-02
	 *
	 * Card component for displaying rollback requests with approve/reject actions.
	 * Action buttons only visible to super_admin users.
	 */

	import { createEventDispatcher } from 'svelte';
	import { Check, ChevronDown, ChevronUp, Loader2, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { formatDistanceToNow } from 'date-fns';

	interface RollbackRequest {
		id: string;
		requestedBy: {
			fullName: string;
			email: string;
			department: string;
		};
		requestedAt: string;
		reason: string;
		status: 'pending' | 'approved' | 'rejected';
		reviewedBy?: {
			id: string;
			fullName: string;
		};
		reviewedAt?: string;
		reviewReason?: string;
		activityLog: {
			action: 'CREATE' | 'UPDATE' | 'DELETE';
			resourceType: string;
			resourceId: string;
			beforeSnapshot: Record<string, unknown>;
			afterSnapshot: Record<string, unknown>;
		};
	}

	interface Props {
		request: RollbackRequest;
		userRole: string;
		onApprove?: (requestId: string, reason: string) => Promise<void>;
		onReject?: (requestId: string, reason: string) => Promise<void>;
	}

	const { request, userRole, onApprove, onReject }: Props = $props();

	let isLoading = $state(false);
	let showApproveDialog = $state(false);
	let showRejectDialog = $state(false);
	let approvalReason = $state('');
	let rejectionReason = $state('');
	let isExpanded = $state(false);

	const dispatch = createEventDispatcher();

	// Computed properties
	const canTakeAction = $derived(userRole === 'super_admin' && request.status === 'pending');

	const statusColor = $derived(() => {
		switch (request.status) {
			case 'approved':
				return 'green';
			case 'rejected':
				return 'red';
			case 'pending':
				return 'yellow';
			default:
				return 'gray';
		}
	});

	const actionBadgeColor = $derived(() => {
		switch (request.activityLog.action) {
			case 'CREATE':
				return 'blue';
			case 'UPDATE':
				return 'yellow';
			case 'DELETE':
				return 'red';
			default:
				return 'gray';
		}
	});

	const relativeTime = $derived(
		formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true })
	);

	function handleApproveClick() {
		showApproveDialog = true;
	}

	function handleRejectClick() {
		showRejectDialog = true;
	}

	function handleCancelApprove() {
		showApproveDialog = false;
		approvalReason = '';
	}

	function handleCancelReject() {
		showRejectDialog = false;
		rejectionReason = '';
	}

	async function handleConfirmApprove() {
		isLoading = true;

		try {
			if (onApprove) {
				await onApprove(request.id, approvalReason.trim());
			}

			toast.success('Rollback request approved');
			showApproveDialog = false;
			approvalReason = '';

			dispatch('approved', { requestId: request.id });
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Approval failed';
			toast.error(errorMessage);
		} finally {
			isLoading = false;
		}
	}

	async function handleConfirmReject() {
		if (!rejectionReason.trim() || rejectionReason.length < 10) {
			toast.error('Please provide a rejection reason (minimum 10 characters)');
			return;
		}

		isLoading = true;

		try {
			if (onReject) {
				await onReject(request.id, rejectionReason.trim());
			}

			toast.success('Rollback request rejected');
			showRejectDialog = false;
			rejectionReason = '';

			dispatch('rejected', { requestId: request.id });
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Rejection failed';
			toast.error(errorMessage);
		} finally {
			isLoading = false;
		}
	}

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}
</script>

<div class="request-card" class:expanded={isExpanded}>
	<div class="card-header">
		<div class="request-info">
			<div class="status-badge" data-status={request.status} data-color={statusColor()}>
				{request.status.toUpperCase()}
			</div>
			<span class="timestamp">{relativeTime}</span>
		</div>

		<button
			type="button"
			class="expand-button"
			onclick={toggleExpanded}
			aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
		>
			{#if isExpanded}
				<ChevronUp size={20} />
			{:else}
				<ChevronDown size={20} />
			{/if}
		</button>
	</div>

	<div class="card-body">
		<div class="requester-section">
			<h4>Requested By</h4>
			<p class="requester-name">{request.requestedBy.fullName}</p>
			<p class="requester-details">{request.requestedBy.email}</p>
			<p class="requester-details">{request.requestedBy.department}</p>
		</div>

		<div class="log-section">
			<h4>Activity Log</h4>
			<div class="log-details">
				<span class="action-badge" data-color={actionBadgeColor()}>
					{request.activityLog.action}
				</span>
				<span class="resource-info">
					{request.activityLog.resourceType} / {request.activityLog.resourceId.slice(0, 8)}...
				</span>
			</div>
		</div>

		<div class="reason-section">
			<h4>Reason</h4>
			<p class="reason-text">{request.reason}</p>
		</div>

		{#if isExpanded}
			<div class="snapshot-section">
				<h4>Snapshot Preview</h4>
				<div class="snapshot-grid">
					<div class="snapshot-column">
						<h5>Before</h5>
						<pre>{JSON.stringify(request.activityLog.beforeSnapshot, null, 2).slice(
								0,
								200
							)}...</pre>
					</div>
					<div class="snapshot-column">
						<h5>After</h5>
						<pre>{JSON.stringify(request.activityLog.afterSnapshot, null, 2).slice(0, 200)}...</pre>
					</div>
				</div>
			</div>
		{/if}

		{#if request.status !== 'pending' && request.reviewedBy}
			<div class="review-section">
				<h4>Review</h4>
				<p class="reviewer-info">
					Reviewed by {request.reviewedBy.fullName}
					{#if request.reviewedAt}
						{formatDistanceToNow(new Date(request.reviewedAt), { addSuffix: true })}
					{/if}
				</p>
				{#if request.reviewReason}
					<p class="review-reason">{request.reviewReason}</p>
				{/if}
			</div>
		{/if}
	</div>

	{#if canTakeAction}
		<div class="card-footer">
			<button type="button" class="btn-reject" onclick={handleRejectClick} disabled={isLoading}>
				<X size={16} />
				Reject
			</button>
			<button type="button" class="btn-approve" onclick={handleApproveClick} disabled={isLoading}>
				<Check size={16} />
				Approve
			</button>
		</div>
	{/if}
</div>

{#if showApproveDialog}
	<div
		class="modal-backdrop"
		role="button"
		tabindex="0"
		onclick={handleCancelApprove}
		onkeydown={(e) => {
			if (e.key === 'Escape' || e.key === 'Enter') {
				handleCancelApprove();
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
				<button
					type="button"
					class="btn-secondary"
					onclick={handleCancelApprove}
					disabled={isLoading}
				>
					Cancel
				</button>
				<button
					type="button"
					class="btn-primary"
					onclick={handleConfirmApprove}
					disabled={isLoading}
				>
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

{#if showRejectDialog}
	<div
		class="modal-backdrop"
		role="button"
		tabindex="0"
		onclick={handleCancelReject}
		onkeydown={(e) => {
			if (e.key === 'Escape' || e.key === 'Enter') {
				handleCancelReject();
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
				<button
					type="button"
					class="btn-secondary"
					onclick={handleCancelReject}
					disabled={isLoading}
				>
					Cancel
				</button>
				<button
					type="button"
					class="btn-danger"
					onclick={handleConfirmReject}
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
	.request-card {
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		background-color: white;
		overflow: hidden;
		transition: box-shadow 0.15s ease;
	}

	.request-card:hover {
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.request-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.status-badge[data-color='green'] {
		background-color: #d1fae5;
		color: #065f46;
	}

	.status-badge[data-color='red'] {
		background-color: #fee2e2;
		color: #991b1b;
	}

	.status-badge[data-color='yellow'] {
		background-color: #fef3c7;
		color: #92400e;
	}

	.timestamp {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.expand-button {
		padding: 0.5rem;
		border: none;
		background: none;
		color: #6b7280;
		cursor: pointer;
		border-radius: 0.375rem;
		transition: background-color 0.15s ease;
	}

	.expand-button:hover {
		background-color: #f3f4f6;
	}

	.card-body {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.requester-section,
	.log-section,
	.reason-section,
	.snapshot-section,
	.review-section {
		padding-bottom: 0.75rem;
	}

	.requester-section:not(:last-child),
	.log-section:not(:last-child),
	.reason-section:not(:last-child),
	.snapshot-section:not(:last-child),
	.review-section:not(:last-child) {
		border-bottom: 1px solid #f3f4f6;
	}

	h4 {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	h5 {
		margin: 0 0 0.5rem 0;
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
	}

	.requester-name {
		font-weight: 600;
		color: #111827;
		margin-bottom: 0.25rem;
	}

	.requester-details {
		font-size: 0.875rem;
		color: #6b7280;
		margin-bottom: 0.25rem;
	}

	.log-details {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.action-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.action-badge[data-color='blue'] {
		background-color: #dbeafe;
		color: #1e40af;
	}

	.action-badge[data-color='yellow'] {
		background-color: #fef3c7;
		color: #92400e;
	}

	.action-badge[data-color='red'] {
		background-color: #fee2e2;
		color: #991b1b;
	}

	.resource-info {
		font-size: 0.875rem;
		color: #6b7280;
		font-family: monospace;
	}

	.reason-text {
		font-size: 0.875rem;
		color: #374151;
		line-height: 1.5;
	}

	.snapshot-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.snapshot-column pre {
		font-size: 0.75rem;
		background-color: #f9fafb;
		padding: 0.75rem;
		border-radius: 0.375rem;
		overflow-x: auto;
		color: #374151;
		font-family: monospace;
	}

	.reviewer-info {
		font-size: 0.875rem;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	.review-reason {
		font-size: 0.875rem;
		color: #6b7280;
		font-style: italic;
	}

	.card-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem;
		border-top: 1px solid #e5e7eb;
		background-color: #f9fafb;
	}

	.btn-approve,
	.btn-reject {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		border: 1px solid transparent;
	}

	.btn-approve {
		background-color: #10b981;
		color: white;
	}

	.btn-approve:hover:not(:disabled) {
		background-color: #059669;
	}

	.btn-reject {
		background-color: white;
		color: #dc2626;
		border-color: #fecaca;
	}

	.btn-reject:hover:not(:disabled) {
		background-color: #fee2e2;
	}

	.btn-approve:disabled,
	.btn-reject:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Modal styles (shared with RollbackButton) */
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
