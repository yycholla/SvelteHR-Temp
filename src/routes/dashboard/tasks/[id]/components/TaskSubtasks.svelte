<script lang="ts">
	import { CheckCircle2 } from '@lucide/svelte';
	import { Progress } from '$lib/components/ui/progress';
	import QuickAddTask from '$lib/components/tasks/QuickAddTask.svelte';
	import { cn } from '$lib/utils';
	import type { Task, TaskStatus } from '$lib/types/task';

	interface Props {
		subtasks: Task[];
		completedCount: number;
		progress: number;
		currentUser: any;
		assignees: any[];
		taskTypes: any[];
		canAssign: boolean;
		parentTaskId: string;
		onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
		onSuccess: () => void;
	}

	const {
		subtasks,
		completedCount,
		progress,
		currentUser,
		assignees,
		taskTypes,
		canAssign,
		parentTaskId,
		onStatusChange,
		onSuccess
	}: Props = $props();
</script>

<div class="rounded-lg border bg-card text-card-foreground shadow-sm">
	<div class="flex flex-col space-y-1.5 p-6">
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-semibold leading-none tracking-tight">Subtasks</h3>
			<span class="text-xs text-muted-foreground">
				{completedCount} of {subtasks?.length || 0} completed
			</span>
		</div>
		<!-- Progress Bar -->
		<Progress value={progress} class="mt-2 h-2 w-full" />
	</div>
	<div class="space-y-3 p-6 pt-0">
		{#if subtasks && subtasks.length > 0}
			{#each subtasks as subtask (subtask.id)}
				<div class="group flex items-start space-x-3">
					<button
						class={cn(
							'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
							subtask.status === 'DONE'
								? 'bg-primary border-primary text-primary-foreground'
								: 'border-input hover:bg-accent hover:text-accent-foreground'
						)}
						onclick={() => {
							const newStatus = subtask.status === 'DONE' ? 'TODO' : 'DONE';
							onStatusChange(subtask.id, newStatus as TaskStatus);
						}}
						aria-label={subtask.status === 'DONE' ? 'Mark as incomplete' : 'Mark as complete'}
					>
						{#if subtask.status === 'DONE'}
							<CheckCircle2 class="h-3.5 w-3.5" />
						{/if}
					</button>
					<div class="flex-1 space-y-1">
						<a
							href="/dashboard/tasks/{subtask.id}"
							class={cn(
								'block text-sm font-medium leading-none hover:underline',
								subtask.status === 'DONE' && 'line-through text-muted-foreground'
							)}
						>
							{subtask.title}
						</a>
						{#if subtask.assignee}
							<p class="text-xs text-muted-foreground">
								Assigned to {subtask.assignee.displayName}
							</p>
						{/if}
					</div>
				</div>
			{/each}
		{:else}
			<div class="py-4 text-center text-sm text-muted-foreground">No subtasks yet.</div>
		{/if}

		<QuickAddTask
			{currentUser}
			{assignees}
			{taskTypes}
			{canAssign}
			{parentTaskId}
			triggerLabel="Add Subtask"
			triggerVariant="ghost"
			triggerSize="sm"
			{onSuccess}
		/>
	</div>
</div>
