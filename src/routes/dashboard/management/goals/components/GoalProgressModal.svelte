<script lang="ts">
	interface Props {
		open: boolean;
		currentGoal: any;
		progressForm: {
			currentValue: number;
			notes: string;
		};
		onClose: () => void;
	}

	let { open = $bindable(), currentGoal, progressForm = $bindable(), onClose }: Props = $props();
</script>

{#if open && currentGoal}
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
		data-testid="progress-modal"
	>
		<div class="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
			<h2 class="mb-4 text-xl font-bold">Update Progress</h2>

			<div class="mb-4">
				<h3 class="mb-2 font-medium text-foreground">{currentGoal.title}</h3>
				<p class="text-sm text-muted-foreground">
					Target: {currentGoal.targetValue}
					{currentGoal.unit}
				</p>
			</div>

			<form method="POST" action="?/updateProgress" class="space-y-4">
				<input type="hidden" name="id" value={currentGoal.id} />
				<div>
					<label for="progress-current-value" class="mb-1 block text-sm font-medium text-foreground"
						>Current Value</label
					>
					<input
						id="progress-current-value"
						name="currentValue"
						type="number"
						bind:value={progressForm.currentValue}
						min="0"
						max={currentGoal.targetValue}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
						data-testid="progress-value-input"
					/>
					<div class="mt-2">
						<div class="flex items-center justify-between text-sm text-muted-foreground">
							<span>Progress</span>
							<span>{Math.round((progressForm.currentValue / currentGoal.targetValue) * 100)}%</span
							>
						</div>
						<div class="mt-1 h-2 w-full rounded-full bg-muted">
							<div
								class="h-2 rounded-full bg-primary transition-all"
								style="width: {Math.min(
									(progressForm.currentValue / currentGoal.targetValue) * 100,
									100
								)}%"
							></div>
						</div>
					</div>
				</div>

				<div>
					<label for="progress-notes" class="mb-1 block text-sm font-medium text-foreground"
						>Progress Notes (Optional)</label
					>
					<textarea
						id="progress-notes"
						name="notes"
						bind:value={progressForm.notes}
						rows="3"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
						data-testid="progress-notes"
						placeholder="Add notes about this progress update..."
					></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-4">
					<button
						type="button"
						onclick={onClose}
						class="rounded-md border px-4 py-2 text-sm hover:bg-accent"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
						data-testid="update-progress-submit"
					>
						Update Progress
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
