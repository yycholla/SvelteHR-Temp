<script lang="ts">
	// TaskCard Component
	// Feature: 028-task-system-expansion - Task T026 (Enhanced from 019-we-need-to)
	// Purpose: Display task summary with status badges, hierarchy, progress, and dependencies

	import type { Task } from '$lib/types/task';
	import {
		getTaskStatusColor,
		getTaskPriorityColor,
		isTaskOverdue,
		calculateSubtaskProgress
	} from '$lib/graphql/tasks-operations';
	import { formatDistance } from 'date-fns';

	interface Props {
		task: Task;
		userId?: string;
		onClick?: () => void;
		onStatusChange?: (newStatus: Task['status']) => void;
		compact?: boolean;
		showAssignee?: boolean;
		showDescription?: boolean;
		showProgress?: boolean;
		level?: number; // For hierarchical display (indentation)
	}

	let {
		task,
		userId,
		onClick,
		onStatusChange,
		compact = false,
		showAssignee = true,
		showDescription = true,
		showProgress = false,
		level = 0
	}: Props = $props();

	// Derived state
	let isOverdue = $derived(isTaskOverdue(task));
	let isAssignedToUser = $derived(userId ? task.assigneeId === userId : false);
	let isCreatedByUser = $derived(userId ? task.creatorId === userId : false);
	let statusColor = $derived(getTaskStatusColor(task.status));
	let priorityColor = $derived(getTaskPriorityColor(task.priority));
	let hasSubtasks = $derived(task.tasksByParentTaskId && task.tasksByParentTaskId.totalCount > 0);
	let hasDependencies = $derived(task.taskDependenciesByBlockedTaskId && task.taskDependenciesByBlockedTaskId.nodes && task.taskDependenciesByBlockedTaskId.nodes.length > 0);
	let hasLinkedResources = $derived(task.linkedResourcesByTaskId && task.linkedResourcesByTaskId.nodes && task.linkedResourcesByTaskId.nodes.length > 0);

	let isDueSoon = $derived(() => {
		if (!task.dueDate || isOverdue) return false;
		const dueDate = new Date(task.dueDate);
		const now = new Date();
		const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
		return daysUntilDue <= 3 && daysUntilDue > 0;
	});

	let dueDateDisplay = $derived(
		task.dueDate
			? isOverdue
				? `Overdue by ${formatDistance(new Date(task.dueDate), new Date())}`
				: `Due ${formatDistance(new Date(), new Date(task.dueDate))}`
			: null
	);

	let subtaskProgress = $derived(() => {
		if (!hasSubtasks || !task.tasksByParentTaskId) return null;
		const nodes = task.tasksByParentTaskId.nodes || [];
		return {
			total: task.tasksByParentTaskId.totalCount,
			completed: nodes.filter((t: any) => t.status === 'COMPLETED').length
		};
	});

	let progressPercentage = $derived(() => {
		const progress = subtaskProgress();
		return progress ? Math.round((progress.completed / progress.total) * 100) : 0;
	});

	function handleClick() {
		if (onClick) {
			onClick();
		}
	}

	function handleKeyPress(e: KeyboardEvent) {
		if ((e.key === 'Enter' || e.key === ' ') && onClick) {
			e.preventDefault();
			onClick();
		}
	}

	function handleStatusClick(e: Event) {
		e.stopPropagation();
		if (onStatusChange && task.status !== 'COMPLETED') {
			// Toggle between TO_DO, IN_PROGRESS, and COMPLETED (GraphQL enum format)
			const nextStatus =
				task.status === 'TO_DO'
					? 'IN_PROGRESS'
					: task.status === 'IN_PROGRESS'
						? 'COMPLETED'
						: 'TO_DO';
			onStatusChange(nextStatus);
		}
	}
</script>

<div
	class="task-card group relative rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md"
	class:cursor-pointer={onClick}
	class:hover:border-primary={onClick}
	class:compact
	class:overdue={isOverdue}
	class:assigned-to-user={isAssignedToUser}
	class:opacity-60={task.status === 'COMPLETED' || task.status === 'DEFERRED'}
	style="margin-left: {level * 24}px"
	role={onClick ? 'button' : 'article'}
	tabindex={onClick ? 0 : undefined}
	onclick={handleClick}
	onkeypress={handleKeyPress}
>
	<!-- Priority Indicator Strip -->
	<div class="absolute left-0 top-0 h-full w-1 rounded-l-lg {priorityColor}"></div>

	<div class="pl-3">
		<!-- Task Header -->
		<div class="mb-2 flex items-start justify-between gap-3">
			<div class="flex flex-1 items-start gap-3">
				<!-- Status Checkbox -->
				{#if onStatusChange}
					<button
						class="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
						onclick={handleStatusClick}
						aria-label="Toggle task status"
					>
						{#if task.status === 'COMPLETED'}
							<svg class="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
							</svg>
						{:else if task.status === 'IN_PROGRESS'}
							<svg class="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clip-rule="evenodd" />
								<circle cx="10" cy="10" r="3" fill="currentColor" />
							</svg>
						{:else}
							<svg class="h-5 w-5 text-muted-foreground hover:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 20 20">
								<circle cx="10" cy="10" r="8" stroke-width="2" />
							</svg>
						{/if}
					</button>
				{/if}

				<!-- Title and Badges -->
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<h3
							class="text-base font-semibold text-foreground group-hover:text-primary"
							class:line-through={task.status === 'COMPLETED' || task.status === 'DEFERRED'}
						>
							{task.title}
						</h3>

						{#if task.requiresManualReassignment}
							<span class="inline-flex items-center rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning">
								⚠️ Needs Reassignment
							</span>
						{/if}
					</div>

					{#if !compact}
						<div class="mt-1.5 flex flex-wrap items-center gap-2">
							<!-- Status Badge -->
							<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium {statusColor}">
								<span>{task.status}</span>
							</span>

							<!-- Priority Badge -->
							<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium {priorityColor}">
								<span>{task.priority}</span>
							</span>

							<!-- Task Type Badge -->
							{#if task.taskTypeByTaskTypeId}
								<span class="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
									{task.taskTypeByTaskTypeId.name}
								</span>
							{/if}

							<!-- Overdue Badge -->
							{#if isOverdue}
								<span class="inline-flex items-center gap-1 rounded-full bg-destructive/20 px-2.5 py-0.5 text-xs font-medium text-destructive">
									⚠️ Overdue
								</span>
							{:else if isDueSoon()}
								<span class="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-medium text-warning">
									⏰ Due Soon
								</span>
							{/if}

							<!-- Subtasks Badge -->
							{#if hasSubtasks}
								{@const progress = subtaskProgress()}
								<span class="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
									📋 {progress?.completed}/{progress?.total} subtasks
								</span>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- User Badges -->
			<div class="ml-4 flex flex-col gap-1 items-end">
				{#if isAssignedToUser}
					<span class="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
						Assigned to you
					</span>
				{/if}
				{#if isCreatedByUser}
					<span class="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
						Created by you
					</span>
				{/if}
			</div>
		</div>

		<!-- Task Description -->
		{#if showDescription && task.description && !compact}
			<div class="mb-3 text-sm text-muted-foreground">
				<p class="line-clamp-2">{task.description}</p>
			</div>
		{/if}

		<!-- Due Date -->
		{#if dueDateDisplay}
			<div class="mb-2 flex items-center text-sm" class:text-destructive={isOverdue} class:text-foreground={!isOverdue}>
				<svg class="mr-2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
				<span>{dueDateDisplay}</span>
			</div>
		{/if}

		<!-- Subtask Progress Bar -->
		{#if showProgress && hasSubtasks}
			{@const progress = subtaskProgress()}
			{@const percentage = progressPercentage()}
			<div class="mb-3">
				<div class="flex items-center justify-between text-xs text-muted-foreground mb-1">
					<span>Subtask Progress</span>
					<span>{percentage}%</span>
				</div>
				<div class="w-full bg-muted rounded-full h-2">
					<div
						class="bg-primary h-2 rounded-full transition-all"
						style="width: {percentage}%"
					></div>
				</div>
			</div>
		{/if}

		<!-- Task Footer -->
		{#if !compact}
			<div class="flex items-center justify-between border-t pt-3">
				<!-- Assignee -->
				{#if showAssignee && task.userByAssigneeId}
					<div class="flex items-center text-sm text-muted-foreground">
						<svg class="mr-1.5 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
						<span>Assigned to <span class="font-medium text-foreground">{task.userByAssigneeId.displayName}</span></span>
					</div>
				{/if}

				<!-- Creator -->
				{#if task.userByCreatorId}
					<div class="flex items-center text-sm text-muted-foreground">
						<span>Created by <span class="font-medium text-foreground">{task.userByCreatorId.displayName}</span></span>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Dependencies Indicator -->
		{#if hasDependencies}
			<div class="mt-2 flex items-center text-xs text-muted-foreground">
				<svg class="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
				</svg>
				<span>Blocked by {task.taskDependenciesByBlockedTaskId.nodes.length} task{task.taskDependenciesByBlockedTaskId.nodes.length > 1 ? 's' : ''}</span>
			</div>
		{/if}

		<!-- Linked Resources Indicator -->
		{#if hasLinkedResources}
			<div class="mt-2 flex items-center text-xs text-muted-foreground">
				<svg class="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
				</svg>
				<span>{task.linkedResourcesByTaskId.nodes.length} linked resource{task.linkedResourcesByTaskId.nodes.length > 1 ? 's' : ''}</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.task-card.compact {
		@apply p-3;
	}

	.task-card.overdue {
		@apply border-destructive/50;
	}

	.task-card.assigned-to-user {
		@apply bg-accent/5;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
