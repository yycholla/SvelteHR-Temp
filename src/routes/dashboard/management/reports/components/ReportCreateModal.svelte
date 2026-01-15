<script lang="ts">
	import { REPORT_CATEGORIES, REPORT_TYPES } from '$lib/graphql/reports-operations';

	interface Props {
		open: boolean;
		createForm: any;
		onClose: () => void;
		onSave: () => void;
	}

	let { open = $bindable(), createForm = $bindable(), onClose, onSave }: Props = $props();
</script>

{#if open}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div
			class="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0"
		>
			<div
				class="dark:bg-muted0 bg-opacity-75 fixed inset-0 bg-muted transition-opacity"
				role="button"
				tabindex="0"
				onclick={onClose}
				onkeydown={(e) => {
					if (e.key === 'Escape' || e.key === 'Enter') {
						onClose();
					}
				}}
			></div>

			<div
				class="inline-block transform overflow-hidden rounded-lg bg-card text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle"
			>
				<div class="bg-card px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
					<h3 class="mb-4 text-lg font-medium text-foreground">Create New Report</h3>

					<div class="space-y-4">
						<div>
							<label for="title" class="block text-sm font-medium text-foreground">Title</label>
							<input
								id="title"
								type="text"
								bind:value={createForm.title}
								class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
								placeholder="Enter report title"
							/>
						</div>

						<div>
							<label for="description" class="block text-sm font-medium text-foreground"
								>Description</label
							>
							<textarea
								id="description"
								bind:value={createForm.description}
								rows="3"
								class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
								placeholder="Enter report description"
							></textarea>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label for="reportType" class="block text-sm font-medium text-foreground"
									>Type</label
								>
								<select
									id="reportType"
									bind:value={createForm.reportType}
									class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
								>
									{#each REPORT_TYPES as type}
										<option value={type.value}>{type.label}</option>
									{/each}
								</select>
							</div>

							<div>
								<label for="category" class="block text-sm font-medium text-foreground"
									>Category</label
								>
								<select
									id="category"
									bind:value={createForm.category}
									class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
								>
									{#each REPORT_CATEGORIES as category}
										<option value={category.value}>{category.label}</option>
									{/each}
								</select>
							</div>
						</div>
					</div>
				</div>

				<div class="bg-muted px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 dark:bg-muted">
					<button
						type="button"
						class="inline-flex w-full justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none sm:ml-3 sm:w-auto"
						onclick={onSave}
					>
						Create Report
					</button>
					<button
						type="button"
						onclick={onClose}
						class="mt-3 inline-flex w-full justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
