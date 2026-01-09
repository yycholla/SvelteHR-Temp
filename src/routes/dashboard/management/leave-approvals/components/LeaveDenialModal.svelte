<script lang="ts">
	import { X } from '@lucide/svelte';
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
			<DialogTitle>Deny Leave Request</DialogTitle>
			<DialogDescription>
				You are about to deny the leave request from {currentRequest?.employee?.displayName}.
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
					<Label for="denial-comments">Reason for Denial (Required)</Label>
					<Textarea
						id="denial-comments"
						placeholder="Please provide a reason for denying this leave request..."
						bind:value={managerComments}
						rows={3}
						class={!managerComments.trim() ? 'border-red-300' : ''}
					/>
					{#if !managerComments.trim()}
						<p class="mt-1 text-sm text-red-600">A reason for denial is required</p>
					{/if}
				</div>
			</div>
		{/if}

		<DialogFooter>
			<Button
				variant="outline"
				onclick={onClose}>Cancel</Button
			>
			<Button
				variant="destructive"
				onclick={onConfirm}
				disabled={isSubmitting || !managerComments.trim()}
			>
				{#if isSubmitting}
					Denying...
				{:else}
					<X class="mr-2 h-4 w-4" />
					Deny Request
				{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
