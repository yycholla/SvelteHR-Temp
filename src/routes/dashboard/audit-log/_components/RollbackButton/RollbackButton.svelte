<!-- RollbackButton Component -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Input } from '$lib/components/ui/input';
	import { client } from '$lib/graphql/client';
	import { ROLLBACK_AUDIT_LOG, type RollbackResponse } from './rollback.graphql';

	interface ActivityLogEntry {
		id: string;
		action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
		resourceType?: string;
		rollbackStatus?: 'completed' | 'pending' | null;
	}

	interface RollbackButtonProps {
		log: ActivityLogEntry;
		userRole: string;
		onRollbackComplete?: () => void;
		onConflict?: (conflicts: RollbackResponse['rollbackAuditLog']['conflicts']) => void;
		onError?: (error: string) => void;
	}

	let { log, userRole, onRollbackComplete, onConflict, onError }: RollbackButtonProps = $props();

	let showConfirmDialog = $state(false);
	let isRollingBack = $state(false);
	let reason = $state('');
	let errorMessage = $state('');

	let isVisible = $derived(userRole === 'super_admin');
	let isDisabled = $derived(
		log.rollbackStatus === 'completed' || log.rollbackStatus === 'pending' || log.action === 'READ'
	);

	let disabledTooltip = $derived(() => {
		if (log.rollbackStatus === 'completed') return 'This entry has already been rolled back';
		if (log.rollbackStatus === 'pending') return 'Rollback is pending';
		if (log.action === 'READ') return 'Cannot rollback read operations';
		return '';
	});

	async function handleRollback() {
		if (!reason.trim()) {
			errorMessage = 'Reason is required';
			return;
		}

		isRollingBack = true;
		errorMessage = '';

		try {
			const result = await client
				.mutation<RollbackResponse>(ROLLBACK_AUDIT_LOG, { logId: log.id, reason })
				.toPromise();

			if (result.error) {
				const error = result.error.message || 'Rollback failed';
				errorMessage = error;
				onError?.(error);
				return;
			}

			if (result.data?.rollbackAuditLog.conflicts.hasConflicts) {
				showConfirmDialog = false;
				onConflict?.(result.data.rollbackAuditLog.conflicts);
			} else {
				showConfirmDialog = false;
				reason = '';
				onRollbackComplete?.();
			}
		} catch (err) {
			const error = err instanceof Error ? err.message : 'Rollback failed';
			errorMessage = error;
			onError?.(error);
		} finally {
			isRollingBack = false;
		}
	}

	function handleCancel() {
		showConfirmDialog = false;
		reason = '';
		errorMessage = '';
	}
</script>

{#if isVisible}
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<div>
					<AlertDialog.Root bind:open={showConfirmDialog}>
						<AlertDialog.Trigger>
							{#snippet child({ props: dialogProps })}
								<Button
									{...dialogProps}
									{...props}
									variant="destructive"
									size="sm"
									disabled={isDisabled}
									aria-label="Rollback this change"
								>
									{isRollingBack ? 'Rolling back...' : 'Rollback'}
								</Button>
							{/snippet}
						</AlertDialog.Trigger>
						<AlertDialog.Content>
							<AlertDialog.Header>
								<AlertDialog.Title>Confirm Rollback</AlertDialog.Title>
								<AlertDialog.Description>
									This will revert the {log.action} operation{log.resourceType
										? ` on ${log.resourceType}`
										: ''}. This action cannot be undone.
								</AlertDialog.Description>
							</AlertDialog.Header>

							<div class="py-4">
								<label for="rollback-reason" class="block text-sm font-medium mb-2">
									Reason for rollback (required)
								</label>
								<Input
									id="rollback-reason"
									type="text"
									placeholder="Enter reason for rollback..."
									bind:value={reason}
									disabled={isRollingBack}
									aria-required="true"
								/>
								{#if errorMessage}
									<p class="text-red-500 text-sm mt-2" role="alert">{errorMessage}</p>
								{/if}
							</div>

							<AlertDialog.Footer>
								<AlertDialog.Cancel onclick={handleCancel} disabled={isRollingBack}>
									Cancel
								</AlertDialog.Cancel>
								<Button
									variant="destructive"
									onclick={handleRollback}
									disabled={isRollingBack || !reason.trim()}
								>
									{isRollingBack ? 'Rolling back...' : 'Confirm Rollback'}
								</Button>
							</AlertDialog.Footer>
						</AlertDialog.Content>
					</AlertDialog.Root>
				</div>
			{/snippet}
		</Tooltip.Trigger>
		{#if isDisabled && disabledTooltip()}
			<Tooltip.Content>
				<p>{disabledTooltip()}</p>
			</Tooltip.Content>
		{/if}
	</Tooltip.Root>
{/if}
