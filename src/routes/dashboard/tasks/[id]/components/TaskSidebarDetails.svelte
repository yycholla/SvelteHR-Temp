<script lang="ts">
	import { Calendar, Clock, Target } from '@lucide/svelte';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';

	interface Props {
		task: any;
		getInitials: (name: string) => string;
		formatDate: (date: string) => string;
	}

	const { task, getInitials, formatDate }: Props = $props();
</script>

<div class="rounded-lg border bg-card text-card-foreground shadow-sm">
	<div class="flex flex-col space-y-1.5 border-b p-6">
		<h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Details</h3>
	</div>
	<div class="space-y-4 p-6">
		<!-- Assignee -->
		<div class="space-y-1">
			<p class="text-xs font-medium text-muted-foreground">Assignee</p>
			<div class="flex items-center gap-2">
				<Avatar class="h-6 w-6">
					<AvatarFallback class="bg-indigo-100 text-[10px] font-bold text-indigo-700">
						{getInitials(task.assignee?.displayName)}
					</AvatarFallback>
				</Avatar>
				<span class="text-sm font-medium">{task.assignee?.displayName || 'Unassigned'}</span>
			</div>
		</div>

		<!-- Reporter -->
		<div class="space-y-1">
			<p class="text-xs font-medium text-muted-foreground">Reporter</p>
			<div class="flex items-center gap-2">
				<Avatar class="h-6 w-6">
					<AvatarFallback class="bg-emerald-100 text-[10px] font-bold text-emerald-700">
						{getInitials(task.creator?.displayName)}
					</AvatarFallback>
				</Avatar>
				<span class="text-sm">{task.creator?.displayName || 'Unknown'}</span>
			</div>
		</div>

		<div class="my-2 h-px bg-border"></div>

		<!-- Dates -->
		<div class="grid grid-cols-1 gap-4">
			<div class="space-y-1">
				<p class="text-xs font-medium text-muted-foreground">Due Date</p>
				<div class="flex items-center gap-2 text-sm">
					<Calendar class="h-3.5 w-3.5 text-muted-foreground" />
					<span>{formatDate(task.dueDate)}</span>
				</div>
			</div>
			{#if task.createdAt}
				<div class="space-y-1">
					<p class="text-xs font-medium text-muted-foreground">Created</p>
					<div class="flex items-center gap-2 text-sm">
						<Clock class="h-3.5 w-3.5 text-muted-foreground" />
						<span>{formatDate(task.createdAt)}</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Parent Task -->
		{#if task.parentTask}
			<div class="my-2 h-px bg-border"></div>
			<div class="space-y-1">
				<p class="text-xs font-medium text-muted-foreground">Parent Task</p>
				<a
					href="/dashboard/tasks/{task.parentTask.id}"
					class="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
				>
					<Target class="h-3.5 w-3.5" />
					{task.parentTask.title}
				</a>
			</div>
		{/if}
	</div>
</div>
