<script lang="ts">
	// TaskCard Component
	// Feature: 019-we-need-to - Task T022
	// Purpose: Display task summary with status badges

	import type { Task } from '$lib/graphql/types';
	import {
		getTaskStatusColor,
		getTaskPriorityColor,
		getTaskStatusIcon,
		getTaskPriorityIcon,
		getTaskAssigneeDisplay,
		isTaskOverdue,
		isTaskDueSoon,
		formatTaskDueDate,
		isTaskEmployeeAssigned,
		isTaskDepartmentAssigned
	} from '$lib/utils/tasks';
	import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '$lib/graphql/types';

	interface Props {
		task: Task;
		onClick?: () => void;
		onStatusChange?: (newStatus: Task['status']) => void;
		compact?: boolean;
		showAssignee?: boolean;
		showDescription?: boolean;
	}

	let {
		task,
		onClick,
		onStatusChange,
		compact = false,
		showAssignee = true,
		showDescription = true
	}: Props = $props();

	// Derived state
	let isOverdue = $derived(isTaskOverdue(task));
	let isDueSoon = $derived(isTaskDueSoon(task));
	let statusLabel = $derived(TASK_STATUS_LABELS[task.status]);
	let priorityLabel = $derived(TASK_PRIORITY_LABELS[task.priority]);
	let statusIcon = $derived(getTaskStatusIcon(task.status));
	let priorityIcon = $derived(getTaskPriorityIcon(task.priority));
	let assigneeDisplay = $derived(getTaskAssigneeDisplay(task));
	let dueDateDisplay = $derived(formatTaskDueDate(task.dueDate));
	let isEmployeeTask = $derived(isTaskEmployeeAssigned(task));
	let isDepartmentTask = $derived(isTaskDepartmentAssigned(task));

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
		if (onStatusChange && task.status !== 'completed') {
			// Toggle between todo, in_progress, and completed
			const nextStatus =
				task.status === 'todo'
					? 'in_progress'
					: task.status === 'in_progress'
						? 'completed'
						: 'todo';
			onStatusChange(nextStatus);
		}
	}
</script>

<div
	class="task-card group relative rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md"
	class:cursor-pointer={onClick}
	class:hover:border-primary={onClick}
	class:compact
	class:opacity-60={task.status === 'completed' || task.status === 'cancelled'}
	role={onClick ? 'button' : 'article'}
	tabindex={onClick ? 0 : undefined}
	onclick={handleClick}
	onkeypress={handleKeyPress}
>
	<!-- Priority Indicator Strip -->
	<div
		class="absolute left-0 top-0 h-full w-1 rounded-l-lg"
		class:bg-red-500={task.priority === 'urgent'}
		class:bg-orange-500={task.priority === 'high'}
		class:bg-blue-500={task.priority === 'medium'}
		class:bg-gray-400={task.priority === 'low'}
	></div>

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
						{#if task.status === 'completed'}
							<svg class="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
							</svg>
						{:else if task.status === 'in_progress'}
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
					<h3
						class="text-base font-semibold text-foreground group-hover:text-primary"
						class:line-through={task.status === 'completed' || task.status === 'cancelled'}
					>
						{task.title}
					</h3>

					{#if !compact}
						<div class="mt-1.5 flex flex-wrap items-center gap-2">
							<!-- Status Badge -->
							<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium {getTaskStatusColor(task.status)}">
								<span>{statusIcon}</span>
								<span>{statusLabel}</span>
							</span>

							<!-- Priority Badge -->
							<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium {getTaskPriorityColor(task.priority)}">
								<span>{priorityIcon}</span>
								<span>{priorityLabel}</span>
							</span>

							<!-- Overdue Badge -->
							{#if isOverdue}
								<span class="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
									<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
									</svg>
									Overdue
								</span>
							{:else if isDueSoon}
								<span class="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
									<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
									</svg>
									Due Soon
								</span>
							{/if}

							<!-- Assignment Type Badge -->
							{#if isDepartmentTask}
								<span class="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
									<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
										<path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
									</svg>
									Department Task
								</span>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Task Description -->
		{#if showDescription && task.description && !compact}
			<div class="mb-3 text-sm text-muted-foreground">
				<p class="line-clamp-2">{task.description}</p>
			</div>
		{/if}

		<!-- Task Meta Information -->
		<div class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
			<!-- Assignee -->
			{#if showAssignee}
				<div class="flex items-center gap-1.5">
					{#if isEmployeeTask}
						<svg class="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
					{:else if isDepartmentTask}
						<svg class="h-4 w-4 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
							<path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
						</svg>
					{/if}
					<span class="font-medium">{assigneeDisplay}</span>
				</div>
			{/if}

			<!-- Due Date -->
			{#if task.dueDate}
				<div class="flex items-center gap-1.5">
					<svg class="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
					<span class:text-red-600={isOverdue} class:text-yellow-600={isDueSoon} class:dark:text-red-400={isOverdue} class:dark:text-yellow-400={isDueSoon}>
						{dueDateDisplay}
					</span>
				</div>
			{/if}

			<!-- Completion Date -->
			{#if task.completedAt && !compact}
				<div class="flex items-center gap-1.5 text-green-600 dark:text-green-400">
					<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
					</svg>
					<span>Completed {new Date(task.completedAt).toLocaleDateString()}</span>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.task-card.compact {
		@apply p-3;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
