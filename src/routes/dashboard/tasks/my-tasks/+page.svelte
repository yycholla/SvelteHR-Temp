<!--
  My Tasks Page
  Feature: 028-task-system-expansion - Task T044

  Personal task view showing only user's assigned tasks
  - Simplified filtering (status, priority, search)
  - Task statistics focused on personal metrics
  - Quick access to user's work
-->

<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import TaskList from '$lib/components/tasks/TaskList.svelte';
	import {
		Plus,
		CheckCircle,
		Clock,
		AlertCircle,
		TrendingUp,
		User,
		Search,
		AlertTriangle
	} from 'lucide-svelte';

	// Page data from server
	let { data }: { data: PageData } = $props();

	// Local filter state
	let searchQuery = $state(data.filters.searchTerm);
	let selectedStatus = $state(data.filters.statusFilter);
	let selectedPriority = $state(data.filters.priorityFilter);

	// Statistics cards configuration
	const statsCards = [
		{
			label: 'Total Tasks',
			value: data.taskStats.total,
			icon: User,
			color: 'text-primary',
			bgColor: 'bg-primary/10'
		},
		{
			label: 'Not Started',
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
			label: 'Completed',
			value: data.taskStats.completed,
			icon: CheckCircle,
			color: 'text-green-600',
			bgColor: 'bg-green-100 dark:bg-green-900/30'
		},
		{
			label: 'Overdue',
			value: data.taskStats.overdue,
			icon: AlertTriangle,
			color: 'text-orange-600',
			bgColor: 'bg-orange-100 dark:bg-orange-900/30'
		}
	];

	// Status options
	const statusOptions = [
		{ value: '', label: 'All Statuses' },
		{ value: 'Not Started', label: 'Not Started' },
		{ value: 'In Progress', label: 'In Progress' },
		{ value: 'Blocked', label: 'Blocked' },
		{ value: 'Completed', label: 'Completed' }
	];

	// Priority options
	const priorityOptions = [
		{ value: '', label: 'All Priorities' },
		{ value: 'Low', label: 'Low' },
		{ value: 'Medium', label: 'Medium' },
		{ value: 'High', label: 'High' },
		{ value: 'Urgent', label: 'Urgent' }
	];

	// Handle filter changes - update URL
	function updateFilters() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (selectedStatus) params.set('status', selectedStatus);
		if (selectedPriority) params.set('priority', selectedPriority);

		const queryString = params.toString();
		goto(queryString ? `?${queryString}` : '/dashboard/tasks/my-tasks', {
			replaceState: true,
			keepFocus: true
		});
	}

	// Handle task click
	function handleTaskClick(taskId: string) {
		goto(`/dashboard/tasks/${taskId}`);
	}

	// Handle create task
	function handleCreateTask() {
		goto('/dashboard/tasks/new');
	}
</script>

<svelte:head>
	<title>My Tasks - SvelteHR</title>
	<meta name="description" content="View and manage your assigned tasks" />
</svelte:head>

<div class="my-tasks-page">
	<!-- Page Header -->
	<div class="page-header">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">My Tasks</h1>
			<p class="text-muted-foreground mt-2">
				Tasks assigned to you ({data.user.displayName})
			</p>
		</div>
		<Button onclick={handleCreateTask} class="flex-shrink-0">
			<Plus class="mr-2 h-4 w-4" />
			New Task
		</Button>
	</div>

	<!-- Statistics Cards -->
	<div class="stats-grid">
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

	<!-- Simple Filters -->
	<Card.Root>
		<Card.Content class="pt-6">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<!-- Search -->
				<div class="relative">
					<Search
						class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
					/>
					<Input
						type="text"
						placeholder="Search tasks..."
						bind:value={searchQuery}
						oninput={updateFilters}
						class="pl-9"
					/>
				</div>

				<!-- Status Filter -->
				<Select.Root selected={{ value: selectedStatus }} onSelectedChange={(v) => { selectedStatus = v?.value || ''; updateFilters(); }}>
					<Select.Trigger>
						<Select.Value placeholder="All Statuses" />
					</Select.Trigger>
					<Select.Content>
						{#each statusOptions as option}
							<Select.Item value={option.value}>{option.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>

				<!-- Priority Filter -->
				<Select.Root selected={{ value: selectedPriority }} onSelectedChange={(v) => { selectedPriority = v?.value || ''; updateFilters(); }}>
					<Select.Trigger>
						<Select.Value placeholder="All Priorities" />
					</Select.Trigger>
					<Select.Content>
						{#each priorityOptions as option}
							<Select.Item value={option.value}>{option.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Tasks List -->
	<div class="tasks-list-section">
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2">
				<h2 class="text-xl font-semibold">Your Tasks</h2>
				<Badge variant="secondary">{data.totalTasks}</Badge>
			</div>
		</div>

		{#if data.tasks.length === 0}
			<Card.Root>
				<Card.Content class="flex flex-col items-center justify-center py-12">
					<CheckCircle class="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
					<h3 class="text-lg font-medium mb-2">No tasks found</h3>
					<p class="text-sm text-muted-foreground mb-4">
						{#if searchQuery || selectedStatus || selectedPriority}
							Try adjusting your filters
						{:else}
							You have no assigned tasks at the moment
						{/if}
					</p>
					{#if !searchQuery && !selectedStatus && !selectedPriority}
						<Button variant="outline" onclick={handleCreateTask}>
							<Plus class="mr-2 h-4 w-4" />
							Create Task
						</Button>
					{/if}
				</Card.Content>
			</Card.Root>
		{:else}
			<TaskList
				tasks={data.tasks}
				userId={data.user.id}
				onTaskClick={handleTaskClick}
				showProgress={true}
				compact={false}
			/>
		{/if}
	</div>
</div>

<style>
	/* Page Layout */
	.my-tasks-page {
		@apply container mx-auto px-4 py-8 space-y-6;
	}

	/* Page Header */
	.page-header {
		@apply flex items-start justify-between gap-4;
	}

	@media (max-width: 640px) {
		.page-header {
			@apply flex-col items-stretch;
		}
	}

	/* Statistics Grid */
	.stats-grid {
		@apply grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4;
	}

	/* Tasks List Section */
	.tasks-list-section {
		@apply space-y-4;
	}
</style>
