<script lang="ts">
	import type { RollbackRequestCardProps } from './rollbackRequests.types';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';

	let { request, userRole, onApprove, onReject }: RollbackRequestCardProps = $props();

	let showApproveDialog = $state(false);
	let showRejectDialog = $state(false);
	let showSnapshotDialog = $state(false);
	let approvalReason = $state('');
	let rejectionReason = $state('');
	let isProcessing = $state(false);

	let canApprove = $derived(userRole === 'super_admin' && request.status === 'pending');

	function truncateSnapshot(snapshot: Record<string, unknown>): string {
		const json = JSON.stringify(snapshot, null, 2);
		return json.length > 100 ? json.substring(0, 100) + '...' : json;
	}

	async function handleApprove() {
		isProcessing = true;
		try {
			await onApprove?.(request.id, approvalReason);
			showApproveDialog = false;
			approvalReason = '';
		} finally {
			isProcessing = false;
		}
	}

	async function handleReject() {
		if (!rejectionReason.trim()) return;

		isProcessing = true;
		try {
			await onReject?.(request.id, rejectionReason);
			showRejectDialog = false;
			rejectionReason = '';
		} finally {
			isProcessing = false;
		}
	}
</script>

<div class="rollback-request-card border rounded p-4 mb-3">
	<!-- Header with status badge -->
	<div class="flex justify-between items-start mb-3">
		<div>
			<div class="font-medium text-lg">Request #{request.id}</div>
		</div>
		<Badge
			variant={request.status === 'approved'
				? 'default'
				: request.status === 'rejected'
					? 'destructive'
					: 'secondary'}
		>
			{request.status.toUpperCase()}
		</Badge>
	</div>

	<!-- Requester Information -->
	<div class="mb-3 space-y-1">
		<div class="text-sm">
			<span class="font-medium">Requested by:</span>
			{request.requestedBy.fullName}
		</div>
		<div class="text-sm text-gray-600">{request.requestedBy.email}</div>
		<div class="text-sm text-gray-600">
			Department: {request.requestedBy.department}
		</div>
		<div class="text-xs text-gray-500">
			{new Date(request.requestedAt).toLocaleString()}
		</div>
	</div>

	<!-- Request Reason -->
	<div class="mb-3">
		<div class="text-sm font-medium mb-1">Reason:</div>
		<div class="text-sm text-gray-700 bg-gray-50 p-2 rounded">{request.reason}</div>
	</div>

	<!-- Activity Log Details -->
	<div class="mb-3 border-t pt-3">
		<div class="text-sm font-medium mb-2">Activity Log Details:</div>
		<div class="space-y-1">
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium">Action:</span>
				<Badge variant="outline">{request.activityLog.action}</Badge>
			</div>
			<div class="text-sm">
				<span class="font-medium">Resource Type:</span>
				{request.activityLog.resourceType}
			</div>
			<div class="text-sm">
				<span class="font-medium">Resource ID:</span>
				{request.activityLog.resourceId}
			</div>
		</div>

		<!-- Snapshot Previews -->
		<div class="mt-3 space-y-2">
			<div>
				<div class="text-xs font-medium text-gray-600 mb-1">Before Snapshot:</div>
				<pre class="text-xs bg-gray-100 p-2 rounded overflow-x-auto">{truncateSnapshot(
						request.activityLog.beforeSnapshot
					)}</pre>
			</div>
			<div>
				<div class="text-xs font-medium text-gray-600 mb-1">After Snapshot:</div>
				<pre class="text-xs bg-gray-100 p-2 rounded overflow-x-auto">{truncateSnapshot(
						request.activityLog.afterSnapshot
					)}</pre>
			</div>
			<Button variant="outline" size="sm" onclick={() => (showSnapshotDialog = true)}>
				View Full Snapshots
			</Button>
		</div>
	</div>

	<!-- Reviewer Information (if reviewed) -->
	{#if request.reviewedBy}
		<div class="mb-3 border-t pt-3">
			<div class="text-sm font-medium mb-2">Review Information:</div>
			<div class="space-y-1">
				<div class="text-sm">
					<span class="font-medium">Reviewed by:</span>
					{request.reviewedBy.fullName}
				</div>
				{#if request.reviewedAt}
					<div class="text-xs text-gray-500">
						{new Date(request.reviewedAt).toLocaleString()}
					</div>
				{/if}
				{#if request.reviewReason}
					<div class="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-2">
						{request.reviewReason}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Action Buttons (super_admin only, pending status only) -->
	{#if canApprove}
		<div class="flex gap-2 border-t pt-3">
			<Dialog.Root bind:open={showApproveDialog}>
				<Dialog.Trigger asChild let:builder>
					<Button size="sm" builders={[builder]} disabled={isProcessing}>Approve</Button>
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Approve Rollback Request</Dialog.Title>
						<Dialog.Description>
							Optionally provide a reason for approving this request.
						</Dialog.Description>
					</Dialog.Header>
					<div class="py-4">
						<Textarea placeholder="Approval reason (optional)..." bind:value={approvalReason} />
					</div>
					<Dialog.Footer>
						<Button variant="outline" onclick={() => (showApproveDialog = false)}>Cancel</Button>
						<Button onclick={handleApprove} disabled={isProcessing}>Approve</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>

			<Dialog.Root bind:open={showRejectDialog}>
				<Dialog.Trigger asChild let:builder>
					<Button variant="destructive" size="sm" builders={[builder]} disabled={isProcessing}>
						Reject
					</Button>
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Reject Rollback Request</Dialog.Title>
						<Dialog.Description
							>Please provide a reason for rejecting this request.</Dialog.Description
						>
					</Dialog.Header>
					<div class="py-4">
						<Textarea
							placeholder="Reason for rejection (required)..."
							bind:value={rejectionReason}
						/>
					</div>
					<Dialog.Footer>
						<Button variant="outline" onclick={() => (showRejectDialog = false)}>Cancel</Button>
						<Button
							variant="destructive"
							onclick={handleReject}
							disabled={!rejectionReason.trim() || isProcessing}
						>
							Reject
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	{/if}
</div>

<!-- Full Snapshot Dialog -->
<Dialog.Root bind:open={showSnapshotDialog}>
	<Dialog.Content class="max-w-3xl max-h-[80vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Full Snapshot Comparison</Dialog.Title>
			<Dialog.Description
				>Complete before and after snapshots for this activity log.</Dialog.Description
			>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div>
				<div class="text-sm font-medium mb-2">Before Snapshot:</div>
				<pre class="text-xs bg-gray-100 p-3 rounded overflow-x-auto">{JSON.stringify(
						request.activityLog.beforeSnapshot,
						null,
						2
					)}</pre>
			</div>
			<div>
				<div class="text-sm font-medium mb-2">After Snapshot:</div>
				<pre class="text-xs bg-gray-100 p-3 rounded overflow-x-auto">{JSON.stringify(
						request.activityLog.afterSnapshot,
						null,
						2
					)}</pre>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showSnapshotDialog = false)}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
