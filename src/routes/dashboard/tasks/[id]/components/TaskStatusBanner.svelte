<script lang="ts">
	import { Target } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	interface Props {
		currentStatus: {
			label: string;
			color: string;
			bgColor: string;
			borderColor: string;
		};
		currentPriority: {
			label: string;
			color: string;
			bgColor: string;
			borderColor: string;
		};
		taskType: {
			name: string;
			colorCode?: string;
		} | null;
	}

	const { currentStatus, currentPriority, taskType }: Props = $props();
</script>

<div
	class="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
>
	<div class="flex items-center gap-2">
		<span class="text-sm font-medium text-muted-foreground">Status:</span>
		<span
			class={cn(
				'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
				currentStatus.bgColor,
				currentStatus.color,
				currentStatus.borderColor,
				'border-transparent' // Override border for cleaner look if preferred
			)}
		>
			{currentStatus.label}
		</span>
	</div>
	<div class="h-4 w-px bg-border"></div>
	<div class="flex items-center gap-2">
		<span class="text-sm font-medium text-muted-foreground">Priority:</span>
		<span
			class={cn(
				'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
				currentPriority.bgColor,
				currentPriority.color,
				currentPriority.borderColor,
				'border-transparent'
			)}
		>
			{currentPriority.label}
		</span>
	</div>
	<div class="h-4 w-px bg-border"></div>
	<div class="flex items-center gap-2">
		<span class="text-sm font-medium text-muted-foreground">Type:</span>
		<div class="flex items-center gap-1.5">
			{#if taskType?.colorCode}
				<div class="h-3 w-3 rounded-full" style="background-color: {taskType.colorCode}"></div>
			{:else}
				<Target class="h-4 w-4 text-purple-500" />
			{/if}
			<span class="text-sm font-medium">{taskType?.name || 'Task'}</span>
		</div>
	</div>
</div>
