<script lang="ts">
	import type { RollbackRequestCardProps } from './rollbackRequests.types';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';

	let { request, currentUserRole, onApprove, onReject }: RollbackRequestCardProps = $props();

	let showRejectDialog = $state(false);
	let rejectReason = $state('');
	let isProcessing = $state(false);

	let canApprove = $derived(currentUserRole === 'hr_manager' && request.status === 'pending');

	async function handleApprove() {
		isProcessing = true;
		try {
			await onApprove?.(request.id);
		} finally {
			isProcessing = false;
		}
	}

	async function handleReject() {
		if (!rejectReason.trim()) return;

		isProcessing = true;
		try {
			await onReject?.(request.id, rejectReason);
			showRejectDialog = false;
			rejectReason = '';
		} finally {
			isProcessing = false;
		}
	}
</script>

<div class="rollback-request-card border rounded p-4 mb-3">
	<div class="flex justify-between items-start mb-2">
		<div>
			<div class="font-medium">Request #{request.id}</div>
			<div class="text-sm text-gray-600">
				Requested by: {request.requestedBy}
			</div>
			<div class="text-sm text-gray-600">
				Target Log: #{request.targetLogId}
			</div>
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

	<div class="text-xs text-gray-500 mb-3">
		{new Date(request.createdAt).toLocaleString()}
	</div>

	{#if canApprove}
		<div class="flex gap-2">
			<Button size="sm" onclick={handleApprove} disabled={isProcessing}>Approve</Button>
			<Dialog.Root bind:open={showRejectDialog}>
				<Dialog.Trigger asChild let:builder>
					<Button variant="destructive" size="sm" builders={[builder]} disabled={isProcessing}>
						Reject
					</Button>
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Reject Rollback Request</Dialog.Title>
						<Dialog.Description>
							Please provide a reason for rejecting this request.
						</Dialog.Description>
					</Dialog.Header>
					<div class="py-4">
						<Input type="text" placeholder="Reason for rejection..." bind:value={rejectReason} />
					</div>
					<Dialog.Footer>
						<Button variant="outline" onclick={() => (showRejectDialog = false)}>Cancel</Button>
						<Button
							variant="destructive"
							onclick={handleReject}
							disabled={!rejectReason.trim() || isProcessing}
						>
							Reject
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	{/if}
</div>
