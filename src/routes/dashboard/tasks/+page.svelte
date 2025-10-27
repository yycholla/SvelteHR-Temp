<!--
  Tasks Dashboard Page
  Feature: 028-task-system-expansion - Task T036

  Main dashboard for viewing and managing all tasks
  - Task statistics cards
  - Advanced filtering
  - Task list with pagination
  - Quick actions (create, view, edit)
-->

<script lang="ts">
	import type { PageData } from './$types';
	import type { TaskFilterState } from '$lib/components/tasks/TaskFilters.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import TaskList from '$lib/components/tasks/TaskList.svelte';
	import TaskFilters from '$lib/components/tasks/TaskFilters.svelte';
	import {
		Plus,
		CheckCircle,
		Clock,
		AlertCircle,
		XCircle,
		Target,
		TrendingUp,
		ListTodo
	} from '@lucide/svelte';

	// Page data from server
	let { data }: { data: PageData } = $props();

	// Filter state from URL params
	let filters = $state<TaskFilterState>({
		search: data.filters.searchTerm,
		statuses: data.filters.statusFilter ? [data.filters.statusFilter as any] : [],
		priorities: data.filters.priorityFilter ? [data.filters.priorityFilter as any] : [],
		assigneeId: data.filters.assigneeFilter || null,
		taskTypeId: data.filters.taskTypeFilter || null,
		dueDateStart: data.filters.dueDateStart || null,
		dueDateEnd: data.filters.dueDateEnd || null,
		hasParent:
			data.filters.hasParent === 'true' ? true : data.filters.hasParent === 'false' ? false : null,
		hasDependencies: null
	});

	// Statistics cards configuration
	// NOTE: Updated to match actual task_status_enum values (Feature 028)
	const statsCards = [
		{
			label: 'Total Tasks',
			value: data.taskStats.total,
			icon: ListTodo,
			color: 'text-primary',
			bgColor: 'bg-primary/10'
		},
		{
			label: 'To Do',
			value: data.taskStats.notStarted,
			icon: Clock,
			color: 'text-amber-600',
			bgColor: 'bg-amber-100 dark:bg-amber-900/30'
		},
		{
			label: 'In Progress',
			value: data.taskStats.inProgress,
			icon: TrendingUp,
			color: 'text-blue-600',
			bgColor: 'bg-blue-100 dark:bg-blue-900/30'
		},
		{
			label: 'Blocked',
			value: data.taskStats.blocked,
			icon: AlertCircle,
			color: 'text-red-600',
			bgColor: 'bg-red-100 dark:bg-red-900/30'
		},
		{
			label: 'Deferred',
			value: data.taskStats.deferred,
			icon: XCircle,
			color: 'text-gray-600',
			bgColor: 'bg-gray-100 dark:bg-gray-900/30'
		},
		{
			label: 'Completed',
			value: data.taskStats.completed,
			icon: CheckCircle,
			color: 'text-green-600',
			bgColor: 'bg-green-100 dark:bg-green-900/30'
		}
	];

	// Client-side filtered tasks based on filter state
	let filteredTasks = $derived(() => {
		let result = data.tasks;

		// Search filter
		if (filters.search) {
			const searchLower = filters.search.toLowerCase();
			result = result.filter((task: any) => {
				const title = task.title?.toLowerCase() || '';
				const description = task.description?.toLowerCase() || '';
				return title.includes(searchLower) || description.includes(searchLower);
			});
		}

		// Status filter
		if (filters.statuses.length > 0) {
			result = result.filter((task: any) => filters.statuses.includes(task.status));
		}

		// Priority filter
		if (filters.priorities.length > 0) {
			result = result.filter((task: any) => filters.priorities.includes(task.priority));
		}

		// Assignee filter
		if (filters.assigneeId) {
			result = result.filter((task: any) => task.assignee?.id === filters.assigneeId);
		}

		// Task type filter
		if (filters.taskTypeId) {
			result = result.filter((task: any) => task.taskType?.id === filters.taskTypeId);
		}

		// Due date range filter
		if (filters.dueDateStart || filters.dueDateEnd) {
			result = result.filter((task: any) => {
				if (!task.dueDate) return false;
				const taskDate = new Date(task.dueDate);
				if (filters.dueDateStart && taskDate < new Date(filters.dueDateStart)) return false;
				if (filters.dueDateEnd && taskDate > new Date(filters.dueDateEnd)) return false;
				return true;
			});
		}

		// Parent task filter
		if (filters.hasParent === true) {
			result = result.filter((task: any) => task.parentTask != null);
		} else if (filters.hasParent === false) {
			result = result.filter((task: any) => task.parentTask == null);
		}

		return result;
	});

	// Handle filter changes - update state only (no page reload)
	function handleFiltersChange(newFilters: TaskFilterState) {
		filters = newFilters;

		// Update URL for bookmarkability without reloading
		const params = new URLSearchParams();
		if (newFilters.search) params.set('search', newFilters.search);
		if (newFilters.statuses.length > 0) params.set('status', newFilters.statuses[0]);
		if (newFilters.priorities.length > 0) params.set('priority', newFilters.priorities[0]);
		if (newFilters.assigneeId) params.set('assignee', newFilters.assigneeId);
		if (newFilters.taskTypeId) params.set('taskType', newFilters.taskTypeId);
		if (newFilters.dueDateStart) params.set('dueDateStart', newFilters.dueDateStart);
		if (newFilters.dueDateEnd) params.set('dueDateEnd', newFilters.dueDateEnd);
		if (newFilters.hasParent !== null) params.set('hasParent', String(newFilters.hasParent));

		const queryString = params.toString();
		const newUrl = queryString ? `?${queryString}` : '/dashboard/tasks';

		// Use history API directly to avoid page reload
		window.history.replaceState({}, '', newUrl);
	}

	// Handle task click - navigate to task details
	function handleTaskClick(taskId: string) {
		goto(`/dashboard/tasks/${taskId}`);
	}

	// Handle create new task
	function handleCreateTask() {
		goto('/dashboard/tasks/new');
	}
</script>

<svelte:head>
	<title>Tasks Dashboard - SvelteHR</title>
	<meta name="description" content="View and manage all tasks in your organization" />
</svelte:head>

<div class="space-y-6" data-testid="tasks-dashboard">
	<!-- Page Header -->
	<div class="flex items-start justify-end gap-4">
		<Button onclick={handleCreateTask} class="flex-shrink-0" data-testid="tasks-create-button">
			<Plus class="mr-2 h-4 w-4" />
			New Task
		</Button>
	</div>

	<!-- Statistics Cards -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6" data-testid="tasks-stats-grid">
		{#each statsCards as stat}
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between pb-2">
					<Card.Title class="text-sm font-medium text-muted-foreground">
						{stat.label}
					</Card.Title>
					<div class="flex h-8 w-8 items-center justify-center rounded-full {stat.bgColor}">
						<svelte:component this={stat.icon} class="h-4 w-4 {stat.color}" />
					</div>
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{stat.value}</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<!-- Filters -->
	<TaskFilters
		{filters}
		onFiltersChange={handleFiltersChange}
		availableAssignees={data.assignees}
		availableTaskTypes={data.taskTypes}
		compact={false}
		showAdvanced={true}
	/>

	<!-- Tasks List -->
	<div class="space-y-4" data-testid="tasks-list-section">
		{#if filteredTasks().length === 0}
			<Card.Root>
				<Card.Content class="flex flex-col items-center justify-center py-12">
					<Target class="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
					<h3 class="text-lg font-medium mb-2">No tasks found</h3>
					<p class="text-sm text-muted-foreground mb-4">
						{#if filters.search || filters.statuses.length > 0}
							Try adjusting your filters or search terms
						{:else}
							Get started by creating your first task
						{/if}
					</p>
					<Button onclick={handleCreateTask} variant="outline">
						<Plus class="mr-2 h-4 w-4" />
						Create Task
					</Button>
				</Card.Content>
			</Card.Root>
		{:else}
			<TaskList
				tasks={filteredTasks()}
				userId={data.user.id}
				onTaskClick={handleTaskClick}
				showProgress={true}
				compact={false}
			/>
		{/if}
	</div>
</div>


