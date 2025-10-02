<script lang="ts">
	// TaskList Component
	// Feature: 019-we-need-to - Task T023
	// Purpose: Sortable and filterable task list

	import type { Task, TaskStatus, TaskPriority } from '$lib/graphql/types';
	import TaskCard from './TaskCard.svelte';
	import {
		sortTasksByPriority,
		sortTasksByDueDate,
		sortTasksByCreatedDate,
		filterTasksByStatus,
		filterTasksByPriority,
		getTaskStatistics
	} from '$lib/utils/tasks';

	interface Props {
		tasks: Task[];
		onTaskClick?: (task: Task) => void;
		onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
		sortBy?: 'priority' | 'dueDate' | 'created' | 'status';
		filterStatus?: TaskStatus | 'all';
		filterPriority?: TaskPriority | 'all';
		compact?: boolean;
		showStatistics?: boolean;
		emptyMessage?: string;
	}

	let {
		tasks,
		onTaskClick,
		onStatusChange,
		sortBy = 'priority',
		filterStatus = 'all',
		filterPriority = 'all',
		compact = false,
		showStatistics = false,
		emptyMessage = 'No tasks found'
	}: Props = $props();

	// Derived filtered and sorted tasks
	let filteredTasks = $derived(() => {
		let result = tasks;

		// Apply status filter
		if (filterStatus !== 'all') {
			result = filterTasksByStatus(result, filterStatus);
		}

		// Apply priority filter
		if (filterPriority !== 'all') {
			result = filterTasksByPriority(result, filterPriority);
		}

		// Apply sorting
		switch (sortBy) {
			case 'priority':
				result = sortTasksByPriority(result, false); // High priority first
				break;
			case 'dueDate':
				result = sortTasksByDueDate(result, true); // Earliest due date first
				break;
			case 'created':
				result = sortTasksByCreatedDate(result, false); // Most recent first
				break;
			case 'status':
				// Sort by status: todo, in_progress, completed, cancelled
				result = [...result].sort((a, b) => {
					const statusOrder = { todo: 0, in_progress: 1, completed: 2, cancelled: 3 };
					return statusOrder[a.status] - statusOrder[b.status];
				});
				break;
		}

		return result;
	});

	// Task statistics
	let statistics = $derived(getTaskStatistics(tasks));

	function handleTaskClick(task: Task) {
		if (onTaskClick) {
			onTaskClick(task);
		}
	}

	function handleStatusChange(task: Task, newStatus: TaskStatus) {
		if (onStatusChange) {
			onStatusChange(task.id, newStatus);
		}
	}
</script>

<div class="task-list">
	<!-- Statistics Bar -->
	{#if showStatistics && tasks.length > 0}
		<div class="mb-4 rounded-lg border border-border bg-card p-4 shadow-sm">
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
				<!-- Total -->
				<div class="text-center">
					<div class="text-2xl font-bold text-foreground">{statistics.total}</div>
					<div class="text-xs text-muted-foreground">Total</div>
				</div>

				<!-- Todo -->
				<div class="text-center">
					<div class="text-2xl font-bold text-muted-foreground">{statistics.todo}</div>
					<div class="text-xs text-muted-foreground">To Do</div>
				</div>

				<!-- In Progress -->
				<div class="text-center">
					<div class="text-2xl font-bold text-primary">{statistics.inProgress}</div>
					<div class="text-xs text-muted-foreground">In Progress</div>
				</div>

				<!-- Completed -->
				<div class="text-center">
					<div class="text-2xl font-bold text-green-600 dark:text-green-400">{statistics.completed}</div>
					<div class="text-xs text-muted-foreground">Completed</div>
				</div>

				<!-- Overdue -->
				<div class="text-center">
					<div class="text-2xl font-bold text-destructive">{statistics.overdue}</div>
					<div class="text-xs text-muted-foreground">Overdue</div>
				</div>

				<!-- Due Soon -->
				<div class="text-center">
					<div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{statistics.dueSoon}</div>
					<div class="text-xs text-muted-foreground">Due Soon</div>
				</div>

				<!-- Completion Rate -->
				<div class="text-center">
					<div class="text-2xl font-bold text-primary">{statistics.completionRate}%</div>
					<div class="text-xs text-muted-foreground">Complete</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Task List -->
	{#if filteredTasks().length > 0}
		<div class="space-y-3">
			{#each filteredTasks() as task (task.id)}
				<TaskCard
					{task}
					{compact}
					onClick={() => handleTaskClick(task)}
					onStatusChange={onStatusChange ? (newStatus) => handleStatusChange(task, newStatus) : undefined}
				/>
			{/each}
		</div>
	{:else}
		<!-- Empty State -->
		<div class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-12">
			<svg class="mb-4 h-16 w-16 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
			</svg>
			<h3 class="mb-2 text-lg font-medium text-foreground">No tasks</h3>
			<p class="text-sm text-muted-foreground">{emptyMessage}</p>
		</div>
	{/if}
</div>

<style>
	.task-list {
		@apply w-full;
	}
</style>
