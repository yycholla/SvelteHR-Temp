<script lang="ts" generics="T">
	import { Button } from '$lib/components/ui/button';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import type { BulkAction } from './types';

	interface Props {
		/** Number of selected rows */
		selectedCount: number;

		/** Selected row IDs */
		selectedIds: Set<string>;

		/** Selected row data */
		selectedRows: T[];

		/** Available bulk actions */
		bulkActions?: BulkAction<T>[];

		/** Callback to deselect all rows */
		onDeselectAll: () => void;
	}

	const { selectedCount, selectedIds, selectedRows, bulkActions = [], onDeselectAll }: Props = $props();

	// State for confirmation dialog
	let confirmDialogOpen = $state(false);
	let pendingAction = $state<BulkAction<T> | null>(null);

	async function handleBulkAction(action: BulkAction<T>) {
		if (action.requiresConfirmation) {
			pendingAction = action;
			confirmDialogOpen = true;
		} else {
			await executeAction(action);
		}
	}

	async function executeAction(action: BulkAction<T>) {
		try {
			await action.handler(selectedRows, selectedIds);
		} catch (error) {
			console.error('Bulk action failed:', error);
		} finally {
			confirmDialogOpen = false;
			pendingAction = null;
		}
	}

	function handleConfirm() {
		if (pendingAction) {
			executeAction(pendingAction);
		}
	}

	function getConfirmationMessage(action: BulkAction<T>): string {
		if (typeof action.confirmationMessage === 'function') {
			return action.confirmationMessage(selectedCount);
		}
		return action.confirmationMessage || `Are you sure you want to perform this action on ${selectedCount} item(s)?`;
	}
</script>

<div class="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
	<div class="flex items-center gap-4">
		<span class="text-sm font-medium">
			{selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
		</span>

		<div class="flex items-center gap-2">
			{#each bulkActions as action (action.id)}
				<Button
					variant={action.variant || 'default'}
					size="sm"
					onclick={() => handleBulkAction(action)}
				>
					{action.label}
				</Button>
			{/each}
		</div>
	</div>

	<Button variant="ghost" size="sm" onclick={onDeselectAll}>
		Deselect All
	</Button>
</div>

<!-- Confirmation Dialog -->
{#if pendingAction}
	<AlertDialog.Root bind:open={confirmDialogOpen}>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Confirm Action</AlertDialog.Title>
				<AlertDialog.Description>
					{getConfirmationMessage(pendingAction)}
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
				<AlertDialog.Action onclick={handleConfirm}>
					{pendingAction.label}
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/if}
