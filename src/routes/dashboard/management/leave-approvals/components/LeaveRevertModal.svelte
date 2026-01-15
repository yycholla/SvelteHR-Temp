<script lang="ts">
	import { Clock } from '@lucide/svelte';
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
	import { formatDateRange, leaveTypeOptions } from '$lib/graphql/queries/leave-requests';

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

<Dialog bind:open>
	<DialogContent class="max-w-2xl">
		<DialogHeader>
			<DialogTitle>Revert to Pending</DialogTitle>
			<DialogDescription>
				This will change the status of this leave request back to pending for reconsideration.
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
						<p>
							<strong>Current Status:</strong>
							<span class="capitalize">{currentRequest.status}</span>
						</p>
						{#if currentRequest.reason}
							<p><strong>Reason:</strong> {currentRequest.reason}</p>
						{/if}
					</div>
				</div>

				<div>
					<Label for="revert-comments">Reason for Reverting (Optional)</Label>
					<Textarea
						id="revert-comments"
						placeholder="Optionally provide a reason for reverting this request to pending..."
						bind:value={managerComments}
						rows={3}
					/>
				</div>
			</div>
		{/if}

		<DialogFooter>
			<Button variant="outline" onclick={onClose}>Cancel</Button>
			<Button
				variant="default"
				onclick={onConfirm}
				disabled={isSubmitting}
				class="bg-amber-600 hover:bg-amber-700"
			>
				{#if isSubmitting}
					Reverting...
				{:else}
					<Clock class="mr-2 h-4 w-4" />
					Revert to Pending
				{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
