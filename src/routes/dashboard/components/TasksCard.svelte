<script lang="ts">
	import DashboardCard from '$lib/components/ui/layout/DashboardCard.svelte';
	import { CheckSquare } from '@lucide/svelte';

	interface Props {
		tasks: any[];
	}

	const { tasks }: Props = $props();

	function getPriorityColor(priority: string): string {
		switch (priority) {
			case 'URGENT':
				return 'bg-red-100 text-red-700';
			case 'HIGH':
				return 'bg-orange-100 text-orange-700';
			case 'MEDIUM':
				return 'bg-blue-100 text-blue-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}
</script>

<DashboardCard
	title="My Tasks"
	description="Tasks assigned to you"
	icon={CheckSquare}
	class="h-full"
>
	{#if tasks.length > 0}
		<div class="space-y-3">
			{#each tasks.slice(0, 5) as task}
				<div class="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
					<div class="flex items-center gap-3">
						<div
							class="h-3 w-3 rounded-full {task.status === 'DONE'
								? 'bg-green-500'
								: 'bg-yellow-500'}"
						></div>
						<span class="text-sm font-medium">{task.title}</span>
					</div>
					<span
						class="rounded px-2 py-0.5 text-[10px] font-medium {getPriorityColor(task.priority)}"
					>
						{task.priority}
					</span>
				</div>
			{/each}
		</div>
	{:else}
		<div class="flex h-full items-center justify-center text-muted-foreground">
			<p>No tasks assigned</p>
		</div>
	{/if}
</DashboardCard>
