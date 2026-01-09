<script lang="ts">
	import type { TaskPriority, TaskStatus } from '$lib/types/task';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { statusOptions, priorityOptions } from './utils';

	interface Props {
		statuses: TaskStatus[];
		priorities: TaskPriority[];
		onToggleStatus: (status: TaskStatus) => void;
		onTogglePriority: (priority: TaskPriority) => void;
	}

	let { statuses, priorities, onToggleStatus, onTogglePriority }: Props = $props();
</script>

<div class="grid gap-4 md:grid-cols-2">
	<!-- Status Filter -->
	<div class="space-y-2">
		<Label>Status</Label>
		<div class="grid grid-cols-2 gap-2">
			{#each statusOptions as option}
				{@const StatusIcon = option.icon}
				<label
					class="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent transition-colors"
					class:bg-accent={statuses.includes(option.value)}
				>
					<Checkbox
						checked={statuses.includes(option.value)}
						onCheckedChange={() => onToggleStatus(option.value)}
					/>
					<div class="flex items-center gap-1.5 flex-1 min-w-0">
						<StatusIcon class="h-3 w-3 flex-shrink-0 {option.color}" />
						<span class="text-sm truncate">{option.label}</span>
					</div>
				</label>
			{/each}
		</div>
	</div>

	<!-- Priority Filter -->
	<div class="space-y-2">
		<Label>Priority</Label>
		<div class="grid grid-cols-2 gap-2">
			{#each priorityOptions as option}
				<label
					class="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent transition-colors"
					class:bg-accent={priorities.includes(option.value)}
				>
					<Checkbox
						checked={priorities.includes(option.value)}
						onCheckedChange={() => onTogglePriority(option.value)}
					/>
					<div class="flex items-center gap-1.5 flex-1 min-w-0">
						<div class="h-2 w-2 rounded-full flex-shrink-0 {option.color}"></div>
						<span class="text-sm truncate">{option.label}</span>
					</div>
				</label>
			{/each}
		</div>
	</div>
</div>
