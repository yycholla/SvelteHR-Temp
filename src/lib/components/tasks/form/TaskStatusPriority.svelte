<script lang="ts">
	import * as Select from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import type { TaskStatus, TaskPriority } from '$lib/types/task';

	interface Props {
		status: TaskStatus;
		priority: TaskPriority;
		selectedStatus: any;
		selectedPriority: any;
		statusOptions: any[];
		priorityOptions: any[];
	}

	let {
		status = $bindable(),
		priority = $bindable(),
		selectedStatus,
		selectedPriority,
		statusOptions,
		priorityOptions
	}: Props = $props();
</script>

<div class="space-y-4 rounded-lg border bg-card p-6">
	<h3 class="border-b pb-2 text-lg font-semibold">Status & Priority</h3>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- Status -->
		<div class="space-y-2">
			<Label for="status">Status</Label>
			<Select.Root type="single" bind:value={status}>
				<Select.Trigger id="status">
					{selectedStatus?.label ?? 'Select status'}
				</Select.Trigger>
				<Select.Content>
					{#each statusOptions as opt}
						<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<!-- Priority -->
		<div class="space-y-2">
			<Label for="priority">Priority</Label>
			<Select.Root type="single" bind:value={priority}>
				<Select.Trigger id="priority">
					{selectedPriority?.label ?? 'Select priority'}
				</Select.Trigger>
				<Select.Content>
					{#each priorityOptions as opt}
						<Select.Item value={opt.value} label={opt.label}>
							<span class={opt.color}>{opt.label}</span>
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>
</div>
