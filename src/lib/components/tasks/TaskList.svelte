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

	let {
		tasks,
		userId,
		showFilters = true,
		viewMode = $bindable('list'),
		onTaskClick,
		onStatusChange,
		loading = false
	}: {
		tasks: Task[];
		userId?: string;
		showFilters?: boolean;
		viewMode?: 'list' | 'hierarchy' | 'kanban';
		onTaskClick?: (taskId: string) => void;
		onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
		loading?: boolean;
	} = $props();

	let statusFilter = $state<TaskStatus | 'all'>('all');
	let priorityFilter = $state<TaskPriority | 'all'>('all');
	let sortBy = $state<'created_at' | 'due_date' | 'priority' | 'title'>('created_at');
	let sortOrder = $state<'asc' | 'desc'>('desc');

	let filteredTasks = $derived(() => {
		let result = tasks;
		if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
		if (priorityFilter !== 'all') result = result.filter(t => t.priority === priorityFilter);
		return result;
	});

	let sortedTasks = $derived(() => {
		const sorted = [...filteredTasks()];
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
					const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
					comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
					break;
				case 'title':
					comparison = a.title.localeCompare(b.title);
					break;
			}
			return sortOrder === 'asc' ? comparison : -comparison;
		});
		return sorted;
	});

	// NOTE: PostGraphile returns enum values in GraphQL format (SCREAMING_SNAKE_CASE)
	let statusCounts = $derived(() => ({
		all: tasks.length,
		'TODO': tasks.filter(t => t.status === 'TODO').length,
		'IN_PROGRESS': tasks.filter(t => t.status === 'IN_PROGRESS').length,
		'BLOCKED': tasks.filter(t => t.status === 'BLOCKED').length,
		'REVIEW': tasks.filter(t => t.status === 'REVIEW').length,
		'DONE': tasks.filter(t => t.status === 'DONE').length
	}));

	let tasksByStatus = $derived(() => ({
		'TODO': sortedTasks().filter(t => t.status === 'TODO'),
		'IN_PROGRESS': sortedTasks().filter(t => t.status === 'IN_PROGRESS'),
		'BLOCKED': sortedTasks().filter(t => t.status === 'BLOCKED'),
		'REVIEW': sortedTasks().filter(t => t.status === 'REVIEW'),
		'DONE': sortedTasks().filter(t => t.status === 'DONE')
	}));

	let topLevelTasks = $derived(() => {
		if (viewMode !== 'hierarchy') return sortedTasks();
		return sortedTasks().filter(t => !t.parentTaskId);
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
</script>

<div class="task-list space-y-4" data-testid="task-list">
	{#if showFilters}
		<div class="flex items-center justify-between gap-4 flex-wrap" data-testid="task-list-filters">
			<div class="flex flex-wrap items-center gap-2">
				<NativeSelect.Root bind:value={statusFilter}>
					<NativeSelect.Option value="all">All Status ({statusCounts().all})</NativeSelect.Option>
					<NativeSelect.Option value="TO_DO">To Do ({statusCounts()['TODO']})</NativeSelect.Option>
					<NativeSelect.Option value="IN_PROGRESS">In Progress ({statusCounts()['IN_PROGRESS']})</NativeSelect.Option>
					<NativeSelect.Option value="BLOCKED">Blocked ({statusCounts()['BLOCKED']})</NativeSelect.Option>
					<NativeSelect.Option value="COMPLETED">Completed ({statusCounts()['DONE']})</NativeSelect.Option>
					<NativeSelect.Option value="DEFERRED">Deferred ({statusCounts()['REVIEW']})</NativeSelect.Option>
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
					{sortOrder === 'asc' ? '↑' : '↓'} {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
				</Button>
				{#if statusFilter !== 'all' || priorityFilter !== 'all'}
					<Badge variant="secondary">
						{[statusFilter !== 'all' ? 1 : 0, priorityFilter !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0)} filter{(statusFilter !== 'all' || priorityFilter !== 'all') ? 's' : ''} active
					</Badge>
				{/if}
			</div>
			<div class="flex items-center gap-1 rounded-lg border p-1 bg-muted/30">
				<Button
					variant={viewMode === 'list' ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => viewMode = 'list'}
					class={viewMode === 'list' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}
				>
					<List class="h-4 w-4" />
				</Button>
				<Button
					variant={viewMode === 'hierarchy' ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => viewMode = 'hierarchy'}
					class={viewMode === 'hierarchy' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}
				>
					<GitBranch class="h-4 w-4" />
				</Button>
				<Button
					variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => viewMode = 'kanban'}
					class={viewMode === 'kanban' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}
				>
					<Columns class="h-4 w-4" />
				</Button>
			</div>
		</div>
	{/if}

	{#if loading}
		<div class="flex flex-col items-center justify-center py-12 text-center">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
			<p class="text-sm text-muted-foreground">Loading tasks...</p>
		</div>
	{:else if sortedTasks().length === 0}
		<div class="flex flex-col items-center justify-center py-12 text-center">
			<CheckSquare class="mb-4 h-16 w-16 text-muted-foreground" />
			<p class="text-lg font-medium mb-1">No tasks found</p>
			<p class="text-sm text-muted-foreground">
				{statusFilter !== 'all' || priorityFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first task to get started'}
			</p>
		</div>
	{:else if viewMode === 'list'}
		<div class="space-y-3">
			{#each sortedTasks() as task (task.id)}
				<TaskCard {task} {userId} onClick={() => handleTaskClick(task.id)} onStatusChange={(newStatus) => handleStatusChange(task.id, newStatus)} showProgress={true} />
			{/each}
		</div>
	{:else if viewMode === 'hierarchy'}
		<div class="space-y-3">
			{#each topLevelTasks() as task (task.id)}
				<TaskCard {task} {userId} onClick={() => handleTaskClick(task.id)} onStatusChange={(newStatus) => handleStatusChange(task.id, newStatus)} showProgress={true} level={0} />
				{#if task.subtasks && task.subtasks.length > 0}
					{#each task.subtasks as subtask (subtask.id)}
						<TaskCard task={subtask} {userId} onClick={() => handleTaskClick(subtask.id)} onStatusChange={(newStatus) => handleStatusChange(subtask.id, newStatus)} compact={true} level={1} />
					{/each}
				{/if}
			{/each}
		</div>
	{:else if viewMode === 'kanban'}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			{#each Object.entries(tasksByStatus()) as [status, statusTasks]}
				<div class="flex flex-col gap-3">
					<div class="flex items-center justify-between p-3 bg-muted rounded-lg">
						<h4 class="font-medium text-sm">{status}</h4>
						<Badge variant="secondary">{statusTasks.length}</Badge>
					</div>
					<div class="space-y-2">
						{#each statusTasks as task (task.id)}
							<TaskCard {task} {userId} onClick={() => handleTaskClick(task.id)} onStatusChange={(newStatus) => handleStatusChange(task.id, newStatus)} compact={true} />
						{/each}
						{#if statusTasks.length === 0}
							<div class="p-4 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">No tasks</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
