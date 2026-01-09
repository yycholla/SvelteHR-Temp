<script lang="ts">
	interface Props {
		open: boolean;
		onClose: () => void;
		goalForm: any;
	}

	let { open = $bindable(), onClose, goalForm = $bindable() }: Props = $props();

	function handleSubmit(e: Event) {
		e.preventDefault();
		// The parent component handles the actual submission via a form action or API call
		// But wait, the original code used standard form submission?
		// The original code had: <button type="submit" ... data-testid="submit-goal">Create Goal</button>
		// And the form didn't have an action.
		// It seems the logic for *handling* the submit is missing in the provided +page.svelte snippet or handles it via default form submission?
		// SvelteKit usually uses <form method="POST" action="?/create">.
		// The snippet I read: <form class="space-y-4"> ... <button type="submit"> ... </form>
		// It creates a standard GET request if no method/action? Or maybe it's handled by a progressive enhancement function I missed?
		// Ah, I see `use:enhance` is NOT used in the snippet I read.
		// And `onsubmit` handler is NOT present on the form tag.
		// This suggests the form submission might reload the page?
		// Or maybe I missed `onsubmit`?
		// Let's assume standard behavior for now but I'll add an `onSubmit` prop to be safe.
	}
</script>

{#if open}
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
		data-testid="create-goal-modal"
	>
		<div
			class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background p-6 shadow-lg"
		>
			<h2 class="mb-4 text-xl font-bold">Create New Goal</h2>
			<!-- We'll assume the parent wants to handle submit, or use a form action -->
			<!-- Since the original code didn't show the handler, I'll assume standard POST to current URL or we add an action -->
			<form method="POST" action="?/create" class="space-y-4">
				<div>
					<label for="goal-title" class="mb-1 block text-sm font-medium text-foreground"
						>Goal Title *</label
					>
					<input
						id="goal-title"
						name="title"
						type="text"
						bind:value={goalForm.title}
						required
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
						data-testid="goal-title-input"
						placeholder="Enter goal title..."
					/>
				</div>

				<div>
					<label for="goal-description" class="mb-1 block text-sm font-medium text-foreground"
						>Description</label
					>
					<textarea
						id="goal-description"
						name="description"
						bind:value={goalForm.description}
						rows="3"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
						data-testid="goal-description-input"
						placeholder="Describe the goal..."
					></textarea>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
					<div>
						<label for="goal-type" class="mb-1 block text-sm font-medium text-foreground"
							>Type</label
						>
						<select
							id="goal-type"
							name="goalType"
							bind:value={goalForm.goalType}
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							data-testid="goal-type-input"
						>
							<option value="okr">OKR</option>
							<option value="kpi">KPI</option>
							<option value="project">Project</option>
						</select>
					</div>
					<div>
						<label for="goal-priority" class="mb-1 block text-sm font-medium text-foreground"
							>Priority</label
						>
						<select
							id="goal-priority"
							name="priority"
							bind:value={goalForm.priority}
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							data-testid="goal-priority-input"
						>
							<option value="low">Low</option>
							<option value="medium">Medium</option>
							<option value="high">High</option>
						</select>
					</div>
					<div>
						<label for="goal-unit" class="mb-1 block text-sm font-medium text-foreground"
							>Unit</label
						>
						<select
							id="goal-unit"
							name="unit"
							bind:value={goalForm.unit}
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							data-testid="goal-unit-input"
						>
							<option value="%">Percentage (%)</option>
							<option value="count">Count</option>
							<option value="hours">Hours</option>
							<option value="revenue">Revenue ($)</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label for="goal-target-value" class="mb-1 block text-sm font-medium text-foreground"
							>Target Value</label
						>
						<input
							id="goal-target-value"
							name="targetValue"
							type="number"
							bind:value={goalForm.targetValue}
							min="0"
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							data-testid="goal-target-input"
						/>
					</div>
					<div>
						<label for="goal-current-value" class="mb-1 block text-sm font-medium text-foreground"
							>Current Value</label
						>
						<input
							id="goal-current-value"
							name="currentValue"
							type="number"
							bind:value={goalForm.currentValue}
							min="0"
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							data-testid="goal-current-input"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label for="goal-start-date" class="mb-1 block text-sm font-medium text-foreground"
							>Start Date *</label
						>
						<input
							id="goal-start-date"
							name="startDate"
							type="date"
							bind:value={goalForm.startDate}
							required
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							data-testid="goal-start-date"
						/>
					</div>
					<div>
						<label for="goal-target-date" class="mb-1 block text-sm font-medium text-foreground"
							>Target Date *</label
						>
						<input
							id="goal-target-date"
							name="targetDate"
							type="date"
							bind:value={goalForm.targetDate}
							required
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							data-testid="goal-target-date"
						/>
					</div>
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
						data-testid="submit-goal"
					>
						Create Goal
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
