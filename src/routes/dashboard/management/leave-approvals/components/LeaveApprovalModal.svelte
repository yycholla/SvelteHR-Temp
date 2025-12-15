<script lang="ts">
	import { Check } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		formatDateRange,
		leaveTypeOptions
	} from '$lib/graphql/queries/leave-requests';

	interface Props {
		open: boolean;
		currentRequest: any;
		managerComments: string;
		isSubmitting: boolean;
		onClose: () => void;
		onConfirm: () => void;
	}

	let {
		open = $bindable(),
		currentRequest,
		managerComments = $bindable(),
		isSubmitting,
		onClose,
		onConfirm
	}: Props = $props();
</script>

<Dialog bind:open={open}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Approve Leave Request</DialogTitle>
			<DialogDescription>
				You are about to approve the leave request from {currentRequest?.employee?.displayName}.
			</DialogDescription>
		</DialogHeader>

		{#if currentRequest}
			<div class="space-y-4">
				<div class="rounded-lg bg-muted p-4 dark:bg-muted">
					<h4 class="mb-2 font-semibold">Request Details</h4>
					<div class="space-y-1 text-sm">
						<p><strong>Employee:</strong> {currentRequest.employee?.displayName}</p>
						<p>
							<strong>Leave Type:</strong>
							{leaveTypeOptions.find((t) => t.value === currentRequest.leaveType)?.label}
						</p>
						<p>
							<strong>Dates:</strong>
							{formatDateRange(currentRequest.startDate, currentRequest.endDate)}
						</p>
						<p><strong>Duration:</strong> {currentRequest.daysRequested} days</p>
						{#if currentRequest.reason}
							<p><strong>Reason:</strong> {currentRequest.reason}</p>
						{/if}
					</div>
				</div>

				<div>
					<Label for="approval-comments">Manager Comments (Optional)</Label>
					<Textarea
						id="approval-comments"
						placeholder="Add any comments about this approval..."
						bind:value={managerComments}
						rows={3}
					/>
				</div>
			</div>
		{/if}

		<DialogFooter>
			<Button
				variant="outline"
				onclick={onClose}>Cancel</Button
			>
			<Button onclick={onConfirm} disabled={isSubmitting}>
				{#if isSubmitting}
					Approving...
				{:else}
					<Check class="mr-2 h-4 w-4" />
					Approve Request
				{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
