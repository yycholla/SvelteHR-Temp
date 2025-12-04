<!--
  TaskList Component
  Feature: 028-task-system-expansion - Task T027

  Display list of tasks with filtering, sorting, and view modes
-->

<script lang="ts">
	import TaskCard from './TaskCard.svelte';
	import type { Task, TaskStatus, TaskPriority } from '$lib/types/task';
	import * as NativeSelect from '$lib/components/ui/native-select';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { CheckSquare, List, GitBranch, Columns, Filter, SortAsc } from '@lucide/svelte';
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';

	let {
		tasks,
		userId,
		showFilters = true,
		viewMode = $bindable('list'),
		onTaskClick,
		onStatusChange,
		loading = false,
		// New props for external control
		sortBy = $bindable('created_at'),
		sortOrder = $bindable('desc'),
		statusFilter = $bindable('all'),
		priorityFilter = $bindable('all')
	}: {
		tasks: Task[];
		userId?: string;
		showFilters?: boolean;
		viewMode?: 'list' | 'hierarchy' | 'kanban';
		onTaskClick?: (taskId: string) => void;
		onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
		loading?: boolean;
		sortBy?: 'created_at' | 'due_date' | 'priority' | 'title' | 'smart';
		sortOrder?: 'asc' | 'desc';
		statusFilter?: TaskStatus | 'all';
		priorityFilter?: TaskPriority | 'all';
	} = $props();

	// Note: statusFilter, priorityFilter, sortBy, sortOrder are now props (optionally bindable)
	// If not passed, they default to internal state initialization values above.

	// Derived value for filtered tasks
	let filteredTasks = $derived.by(() => {
		let result = tasks;
		// Only apply internal filters if we are using them.
		// If parent passes already filtered tasks, these might be redundant but harmless if 'all'.
		if (statusFilter !== 'all') result = result.filter((t) => t.status === statusFilter);
		if (priorityFilter !== 'all') result = result.filter((t) => t.priority === priorityFilter);
		return result;
	});

	// Derived value for sorted tasks
	let sortedTasks = $derived.by(() => {
		const sorted = [...filteredTasks];
		sorted.sort((a, b) => {
			let comparison = 0;
			switch (sortBy) {
				case 'created_at':
					comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
					break;
				case 'due_date':
					if (!a.dueDate && !b.dueDate) comparison = 0;
					else if (!a.dueDate) comparison = 1;
					else if (!b.dueDate) comparison = -1;
					else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
					break;
				case 'priority':
					const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
					comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
					break;
				case 'title':
					comparison = a.title.localeCompare(b.title);
					break;
				case 'smart':
					// Smart sort: Priority > Due Date > Title
					// Urgent (4) > Low (1).
					const valA = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[a.priority] || 0;
					const valB = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[b.priority] || 0;
					comparison = valA - valB;

					if (comparison === 0) {
						// Secondary: Due Date (Soonest first -> Ascending)
						const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_VALUE;
						const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_VALUE;
						return valA - valB || dueB - dueA;
					}
					break;
			}
			return sortOrder === 'asc' ? comparison : -comparison;
		});
		return sorted;
	});

	// Derived status counts
	let statusCounts = $derived.by(() => ({
		all: tasks.length,
		TODO: tasks.filter((t) => t.status === 'TODO').length,
		IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
		BLOCKED: tasks.filter((t) => t.status === 'BLOCKED').length,
		REVIEW: tasks.filter((t) => t.status === 'REVIEW').length,
		DONE: tasks.filter((t) => t.status === 'DONE').length
	}));

	// Derived tasks by status (for unused feature? or debugging?)
	// Keeping it as it was in original code
	let tasksByStatus = $derived.by(() => ({
		TODO: sortedTasks.filter((t) => t.status === 'TODO'),
		IN_PROGRESS: sortedTasks.filter((t) => t.status === 'IN_PROGRESS'),
		BLOCKED: sortedTasks.filter((t) => t.status === 'BLOCKED'),
		REVIEW: sortedTasks.filter((t) => t.status === 'REVIEW'),
		DONE: sortedTasks.filter((t) => t.status === 'DONE')
	}));

	// Derived top level tasks for hierarchy view
	let topLevelTasks = $derived.by(() => {
		if (viewMode !== 'hierarchy') return sortedTasks;
		return sortedTasks.filter((t) => !t.parentTaskId);
	});

	function handleTaskClick(taskId: string) {
		if (onTaskClick) onTaskClick(taskId);
	}

	function handleStatusChange(taskId: string, newStatus: TaskStatus) {
		if (onStatusChange) onStatusChange(taskId, newStatus);
	}

	function toggleSortOrder() {
		sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
	}

	// Drag-and-drop configuration
	const flipDurationMs = 200;
	let isDragging = $state(false);

	// Kanban columns state
	type KanbanColumn = { status: TaskStatus; tasks: Task[] };
	let columns = $state<KanbanColumn[]>([
		{ status: 'TODO', tasks: [] },
		{ status: 'IN_PROGRESS', tasks: [] },
		{ status: 'BLOCKED', tasks: [] },
		{ status: 'REVIEW', tasks: [] },
		{ status: 'DONE', tasks: [] }
	]);

	// Sync columns with sorted tasks when not dragging
	// Using $effect to update mutable state 'columns' based on derived 'sortedTasks'
	// This is necessary because svelte-dnd-action requires a mutable array binding
	$effect(() => {
		if (!isDragging) {
			columns = [
				{ status: 'TODO', tasks: sortedTasks.filter((t) => t.status === 'TODO') },
				{ status: 'IN_PROGRESS', tasks: sortedTasks.filter((t) => t.status === 'IN_PROGRESS') },
				{ status: 'BLOCKED', tasks: sortedTasks.filter((t) => t.status === 'BLOCKED') },
				{ status: 'REVIEW', tasks: sortedTasks.filter((t) => t.status === 'REVIEW') },
				{ status: 'DONE', tasks: sortedTasks.filter((t) => t.status === 'DONE') }
			];
		}
	});

	function handleDndConsider(columnIndex: number, e: CustomEvent<DndEvent<Task>>) {
		isDragging = true;
		columns[columnIndex].tasks = e.detail.items as Task[];
	}

	function handleDndFinalize(columnIndex: number, e: CustomEvent<DndEvent<Task>>) {
		columns[columnIndex].tasks = e.detail.items as Task[];
		const column = columns[columnIndex];
		const droppedTask = e.detail.items.find((item) => item.status !== column.status);
		if (droppedTask && onStatusChange) {
			onStatusChange(droppedTask.id, column.status);
		}
		isDragging = false;
	}
</script>

<div class="task-list space-y-4" data-testid="task-list">
	{#if showFilters}
		<div class="flex items-center justify-between gap-4 flex-wrap" data-testid="task-list-filters">
			<div class="flex flex-wrap items-center gap-2">
				<NativeSelect.Root bind:value={statusFilter}>
					<NativeSelect.Option value="all">All Status ({statusCounts.all})</NativeSelect.Option>
					<NativeSelect.Option value="TO_DO">To Do ({statusCounts['TODO']})</NativeSelect.Option>
					<NativeSelect.Option value="IN_PROGRESS"
						>In Progress ({statusCounts['IN_PROGRESS']})</NativeSelect.Option
					>
					<NativeSelect.Option value="BLOCKED"
						>Blocked ({statusCounts['BLOCKED']})</NativeSelect.Option
					>
					<NativeSelect.Option value="COMPLETED"
						>Completed ({statusCounts['DONE']})</NativeSelect.Option
					>
					<NativeSelect.Option value="DEFERRED"
						>Deferred ({statusCounts['REVIEW']})</NativeSelect.Option
					>
				</NativeSelect.Root>
				<NativeSelect.Root bind:value={priorityFilter}>
					<NativeSelect.Option value="all">All Priority</NativeSelect.Option>
					<NativeSelect.Option value="URGENT">Urgent</NativeSelect.Option>
					<NativeSelect.Option value="HIGH">High</NativeSelect.Option>
					<NativeSelect.Option value="MEDIUM">Medium</NativeSelect.Option>
					<NativeSelect.Option value="LOW">Low</NativeSelect.Option>
				</NativeSelect.Root>
				<NativeSelect.Root bind:value={sortBy}>
					<NativeSelect.Option value="created_at">Created Date</NativeSelect.Option>
					<NativeSelect.Option value="due_date">Due Date</NativeSelect.Option>
					<NativeSelect.Option value="priority">Priority</NativeSelect.Option>
					<NativeSelect.Option value="title">Title</NativeSelect.Option>
				</NativeSelect.Root>
				<Button variant="outline" size="sm" onclick={toggleSortOrder}>
					{sortOrder === 'asc' ? '↑' : '↓'}
					{sortOrder === 'asc' ? 'Ascending' : 'Descending'}
				</Button>
				{#if statusFilter !== 'all' || priorityFilter !== 'all'}
					<Badge variant="secondary">
						{[statusFilter !== 'all' ? 1 : 0, priorityFilter !== 'all' ? 1 : 0].reduce(
							(a, b) => a + b,
							0
						)} filter{statusFilter !== 'all' || priorityFilter !== 'all' ? 's' : ''} active
					</Badge>
				{/if}
			</div>
			<div class="flex items-center gap-1 rounded-lg border p-1 bg-muted/30">
				<Button
					variant={viewMode === 'list' ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => (viewMode = 'list')}
					class={viewMode === 'list'
						? 'bg-primary/15 dark:bg-primary/25 shadow-sm hover:bg-primary/15 dark:hover:bg-primary/25'
						: 'hover:bg-accent hover:text-accent-foreground'}
				>
					<List class="h-4 w-4 text-foreground" />
				</Button>
				<Button
					variant={viewMode === 'hierarchy' ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => (viewMode = 'hierarchy')}
					class={viewMode === 'hierarchy'
						? 'bg-primary/15 dark:bg-primary/25 shadow-sm hover:bg-primary/15 dark:hover:bg-primary/25'
						: 'hover:bg-accent hover:text-accent-foreground'}
				>
					<GitBranch class="h-4 w-4 text-foreground" />
				</Button>
				<Button
					variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => (viewMode = 'kanban')}
					class={viewMode === 'kanban'
						? 'bg-primary/15 dark:bg-primary/25 shadow-sm hover:bg-primary/15 dark:hover:bg-primary/25'
						: 'hover:bg-accent hover:text-accent-foreground'}
				>
					<Columns class="h-4 w-4 text-foreground" />
				</Button>
			</div>
		</div>
	{/if}

	{#if loading}
		<div class="flex flex-col items-center justify-center py-12 text-center">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
			<p class="text-sm text-muted-foreground">Loading tasks...</p>
		</div>
	{:else if sortedTasks.length === 0}
		<div class="flex flex-col items-center justify-center py-12 text-center">
			<CheckSquare class="mb-4 h-16 w-16 text-muted-foreground" />
			<p class="text-lg font-medium mb-1">No tasks found</p>
			<p class="text-sm text-muted-foreground">
				{statusFilter !== 'all' || priorityFilter !== 'all'
					? 'Try adjusting your filters'
					: 'Create your first task to get started'}
			</p>
		</div>
	{:else if viewMode === 'list'}
		<div class="space-y-3">
			{#each sortedTasks as task (task.id)}
				<TaskCard
					{task}
					{userId}
					onClick={() => handleTaskClick(task.id)}
					onStatusChange={(newStatus) => handleStatusChange(task.id, newStatus)}
					showProgress={true}
				/>
			{/each}
		</div>
	{:else if viewMode === 'hierarchy'}
		<div class="space-y-3">
			{#each topLevelTasks as task (task.id)}
				<TaskCard
					{task}
					{userId}
					onClick={() => handleTaskClick(task.id)}
					onStatusChange={(newStatus) => handleStatusChange(task.id, newStatus)}
					showProgress={true}
					level={0}
				/>
				{#if task.subtasks && task.subtasks.length > 0}
					{#each task.subtasks as subtask (subtask.id)}
						<TaskCard
							task={subtask}
							{userId}
							onClick={() => handleTaskClick(subtask.id)}
							onStatusChange={(newStatus) => handleStatusChange(subtask.id, newStatus)}
							compact={true}
							level={1}
						/>
					{/each}
				{/if}
			{/each}
		</div>
	{:else if viewMode === 'kanban'}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
			{#each columns as column, index (column.status)}
				<div class="flex flex-col gap-3">
					<div class="flex items-center justify-between p-3 bg-muted rounded-lg">
						<h4 class="font-medium text-sm">{column.status.replace('_', ' ')}</h4>
						<Badge variant="secondary">{column.tasks.length}</Badge>
					</div>
					<div
						class="min-h-[200px] space-y-2 p-2 rounded-lg border-2 border-dashed border-transparent transition-colors"
						class:border-primary={column.tasks.length === 0}
						use:dndzone={{
							items: column.tasks,
							flipDurationMs,
							dropTargetStyle: { outline: '2px solid hsl(var(--primary))' }
						}}
						onconsider={(e) => handleDndConsider(index, e)}
						onfinalize={(e) => handleDndFinalize(index, e)}
					>
						{#each column.tasks as task (task.id)}
							<div animate:flip={{ duration: flipDurationMs }}>
								<TaskCard
									{task}
									{userId}
									onClick={() => handleTaskClick(task.id)}
									onStatusChange={(newStatus) => handleStatusChange(task.id, newStatus)}
									compact={true}
								/>
							</div>
						{/each}
						{#if column.tasks.length === 0}
							<div class="p-4 text-center text-sm text-muted-foreground">Drop tasks here</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* Drag-and-drop styles */
	:global(.task-card.svelte-dnd-action-dragging-over-counter) {
		opacity: 0.5;
		transform: scale(0.95);
	}

	:global(.svelte-dnd-action-dragged-el) {
		opacity: 0.9;
		transform: rotate(2deg);
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
		cursor: grabbing !important;
	}
</style>
