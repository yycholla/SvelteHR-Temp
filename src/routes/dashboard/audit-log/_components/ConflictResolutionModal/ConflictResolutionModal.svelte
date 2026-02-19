<script lang="ts">
	import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import ConflictDiff from './ConflictDiff.svelte';

	interface ConflictField {
		field: string;
		currentValue: unknown;
		targetValue: unknown;
		snapshotValue: unknown;
	}

	interface ConflictDetails {
		hasConflicts: boolean;
		conflictFields: string[];
		conflicts: ConflictField[];
		currentState: Record<string, unknown>;
		targetState: Record<string, unknown>;
	}

	type ResolutionStrategy = 'force' | 'cancel' | 'merge';

	interface ConflictResolutionModalProps {
		isOpen: boolean;
		logId: string;
		conflicts: ConflictDetails;
		onResolve: (strategy: ResolutionStrategy, mergeFields?: string[]) => Promise<void>;
		onCancel: () => void;
	}

	let { isOpen, logId, conflicts, onResolve, onCancel }: ConflictResolutionModalProps = $props();

	let selectedStrategy = $state<ResolutionStrategy | null>(null);
	let selectedMergeFields = $state(new Set<string>());
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let showConfirmation = $state(false);

	const canSubmit = $derived(
		selectedStrategy !== null &&
			(selectedStrategy !== 'merge' || selectedMergeFields.size > 0) &&
			!isLoading
	);

	function toggleMergeField(field: string) {
		if (selectedMergeFields.has(field)) {
			selectedMergeFields.delete(field);
		} else {
			selectedMergeFields.add(field);
		}
		selectedMergeFields = new Set(selectedMergeFields);
	}

	function handleStrategyChange(value: string) {
		selectedStrategy = value as ResolutionStrategy;
		if (value !== 'merge') {
			selectedMergeFields = new Set();
		}
	}

	function handleCancelClick() {
		resetState();
		onCancel();
	}

	async function handleSubmit() {
		if (!canSubmit || !selectedStrategy) return;

		if (selectedStrategy === 'force' && !showConfirmation) {
			showConfirmation = true;
			return;
		}

		isLoading = true;
		error = null;

		try {
			if (selectedStrategy === 'merge') {
				await onResolve(selectedStrategy, Array.from(selectedMergeFields));
			} else {
				await onResolve(selectedStrategy);
			}

			resetState();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to resolve conflict';
			isLoading = false;
		}
	}

	function resetState() {
		selectedStrategy = null;
		selectedMergeFields = new Set();
		isLoading = false;
		error = null;
		showConfirmation = false;
	}

	function handleOpenChange(open: boolean) {
		if (!open) {
			handleCancelClick();
		}
	}
</script>

<Dialog open={isOpen} onOpenChange={handleOpenChange}>
	<DialogContent class="max-w-4xl max-h-[85vh] overflow-y-auto">
		<DialogHeader>
			<DialogTitle>Rollback Conflict Resolution</DialogTitle>
		</DialogHeader>

		<div class="space-y-4">
			<!-- Conflict Summary -->
			<Alert>
				<AlertDescription>
					{conflicts.conflictFields.length} field{conflicts.conflictFields.length !== 1
						? 's have'
						: ' has'} changed since this log entry. Choose how to resolve the conflicts.
				</AlertDescription>
			</Alert>

			{#if error}
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			{/if}

			<!-- Conflict Fields Display -->
			<div class="space-y-2">
				<h3 class="text-sm font-semibold">Conflicting Fields:</h3>
				<div class="space-y-2 max-h-64 overflow-y-auto">
					{#each conflicts.conflicts as conflict}
						<ConflictDiff
							field={conflict.field}
							currentValue={conflict.currentValue}
							targetValue={conflict.targetValue}
						/>
					{/each}
				</div>
			</div>

			<!-- Strategy Selection -->
			<div class="space-y-4">
				<h3 class="text-sm font-semibold">Resolution Strategy:</h3>

				<RadioGroup value={selectedStrategy ?? ''} onValueChange={handleStrategyChange}>
					<!-- Force Strategy -->
					<div class="flex items-start space-x-3 border rounded p-3">
						<RadioGroupItem value="force" id="strategy-force" disabled={isLoading} />
						<div class="flex-1">
							<Label for="strategy-force" class="flex items-center gap-2">
								<span class="font-medium">Force Rollback</span>
								<Badge variant="destructive" class="text-xs">⚠ Warning</Badge>
							</Label>
							<p class="text-sm text-gray-600 mt-1">
								Overwrite all current values with snapshot values, ignoring recent changes.
							</p>
						</div>
					</div>

					<!-- Merge Strategy -->
					<div class="flex items-start space-x-3 border rounded p-3">
						<RadioGroupItem value="merge" id="strategy-merge" disabled={isLoading} />
						<div class="flex-1">
							<Label for="strategy-merge" class="flex items-center gap-2">
								<span class="font-medium">Selective Merge</span>
								<Badge variant="secondary" class="text-xs">Recommended</Badge>
							</Label>
							<p class="text-sm text-gray-600 mt-1">
								Choose specific fields to rollback, keeping other changes.
							</p>

							{#if selectedStrategy === 'merge'}
								<div class="mt-3 space-y-2 border-t pt-3">
									<p class="text-sm font-medium">Select fields to rollback:</p>
									{#each conflicts.conflicts as conflict}
										<div class="flex items-center space-x-2">
											<Checkbox
												checked={selectedMergeFields.has(conflict.field)}
												onCheckedChange={() => toggleMergeField(conflict.field)}
												disabled={isLoading}
												id="field-{conflict.field}"
											/>
											<Label for="field-{conflict.field}" class="text-sm">{conflict.field}</Label>
										</div>
									{/each}

									{#if selectedMergeFields.size > 0}
										<div class="mt-3 p-2 bg-blue-50 rounded">
											<p class="text-xs text-blue-800">
												Preview: {selectedMergeFields.size} field{selectedMergeFields.size !== 1
													? 's'
													: ''} will be rolled back, others will keep current values.
											</p>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					</div>

					<!-- Cancel Strategy -->
					<div class="flex items-start space-x-3 border rounded p-3">
						<RadioGroupItem value="cancel" id="strategy-cancel" disabled={isLoading} />
						<div class="flex-1">
							<Label for="strategy-cancel" class="font-medium">Cancel Rollback</Label>
							<p class="text-sm text-gray-600 mt-1">
								Abort the rollback operation and keep all current values.
							</p>
						</div>
					</div>
				</RadioGroup>
			</div>

			<!-- Confirmation for Force Strategy -->
			{#if showConfirmation && selectedStrategy === 'force'}
				<Alert variant="destructive">
					<AlertDescription>
						<strong>Are you sure?</strong> This will overwrite {conflicts.conflictFields.length}
						field{conflicts.conflictFields.length !== 1 ? 's' : ''} with old values, discarding recent
						changes.
					</AlertDescription>
				</Alert>
			{/if}

			<!-- Action Buttons -->
			<div class="flex justify-end gap-2 pt-4 border-t">
				<Button variant="outline" onclick={handleCancelClick} disabled={isLoading}>Cancel</Button>
				<Button onclick={handleSubmit} disabled={!canSubmit}>
					{#if isLoading}
						Resolving...
					{:else if showConfirmation && selectedStrategy === 'force'}
						Confirm Force Rollback
					{:else if selectedStrategy === 'cancel'}
						Confirm Cancellation
					{:else if selectedStrategy === 'merge'}
						Apply Merge ({selectedMergeFields.size} fields)
					{:else if selectedStrategy === 'force'}
						Force Rollback
					{:else}
						Resolve Conflict
					{/if}
				</Button>
			</div>
		</div>
	</DialogContent>
</Dialog>
