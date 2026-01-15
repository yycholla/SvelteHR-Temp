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
	import { Check, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { formatDistanceToNow } from 'date-fns';
	import RollbackRequestHeader from './rollback-request/RollbackRequestHeader.svelte';
	import RollbackRequestBody from './rollback-request/RollbackRequestBody.svelte';
	import RollbackApproveDialog from './rollback-request/RollbackApproveDialog.svelte';
	import RollbackRejectDialog from './rollback-request/RollbackRejectDialog.svelte';

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
	<RollbackRequestHeader
		status={request.status}
		{relativeTime}
		{isExpanded}
		onToggleExpanded={toggleExpanded}
	/>

	<RollbackRequestBody {request} {isExpanded} />

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

<RollbackApproveDialog
	bind:open={showApproveDialog}
	bind:approvalReason
	{isLoading}
	onConfirm={handleConfirmApprove}
	onCancel={handleCancelApprove}
/>

<RollbackRejectDialog
	bind:open={showRejectDialog}
	bind:rejectionReason
	{isLoading}
	onConfirm={handleConfirmReject}
	onCancel={handleCancelReject}
/>

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
</style>
