<!--
  Team Tasks Page
  Feature: 028-task-system-expansion - Task T046

  Team task view showing tasks assigned to team members
  - Department/team-based filtering
  - Assignee filter for specific team members
  - Task statistics for team performance
-->

<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as NativeSelect from '$lib/components/ui/native-select';
	import TaskList from '$lib/components/tasks/TaskList.svelte';
	import {
		Plus,
		CheckCircle,
		Clock,
		AlertCircle,
		TrendingUp,
		Users,
		Search,
		AlertTriangle
	} from '@lucide/svelte';

	// Page data from server
	let { data }: { data: PageData } = $props();

	// Local filter state
	let searchQuery = $state(data.filters.searchTerm);
	let selectedStatus = $state(data.filters.statusFilter);
	let selectedPriority = $state(data.filters.priorityFilter);
	let selectedAssignee = $state(data.filters.assigneeFilter);

	// Statistics cards configuration
	const statsCards = [
		{
			label: 'Team Tasks',
			value: data.taskStats.total,
			icon: Users,
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
		if (selectedAssignee) params.set('assignee', selectedAssignee);

		const queryString = params.toString();
		goto(queryString ? `?${queryString}` : '/dashboard/tasks/team-tasks', {
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
	<title>Team Tasks - SvelteHR</title>
	<meta name="description" content="View and manage your team's tasks" />
</svelte:head>

<div class="team-tasks-page">
	<!-- Page Header -->
	<div class="page-header">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Team Tasks</h1>
			<p class="text-muted-foreground mt-2">
				Tasks assigned to your team members ({data.teamMembers.length} members)
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

	<!-- Filters -->
	<Card.Root>
		<Card.Content class="pt-6">
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

				<!-- Assignee Filter -->
				<NativeSelect.Root value={selectedAssignee} onchange={(e) => { selectedAssignee = e.currentTarget.value; updateFilters(); }}>
					<NativeSelect.Option value="">All Team Members</NativeSelect.Option>
					{#each data.teamMembers as member}
						<NativeSelect.Option value={member.id}>{member.displayName}</NativeSelect.Option>
					{/each}
				</NativeSelect.Root>

				<!-- Status Filter -->
				<NativeSelect.Root value={selectedStatus} onchange={(e) => { selectedStatus = e.currentTarget.value; updateFilters(); }}>
					{#each statusOptions as option}
						<NativeSelect.Option value={option.value}>{option.label}</NativeSelect.Option>
					{/each}
				</NativeSelect.Root>

				<!-- Priority Filter -->
				<NativeSelect.Root value={selectedPriority} onchange={(e) => { selectedPriority = e.currentTarget.value; updateFilters(); }}>
					{#each priorityOptions as option}
						<NativeSelect.Option value={option.value}>{option.label}</NativeSelect.Option>
					{/each}
				</NativeSelect.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Tasks List -->
	<div class="tasks-list-section">
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2">
				<h2 class="text-xl font-semibold">Team Tasks</h2>
				<Badge variant="secondary">{data.totalTasks}</Badge>
			</div>
		</div>

		{#if data.tasks.length === 0}
			<Card.Root>
				<Card.Content class="flex flex-col items-center justify-center py-12">
					<Users class="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
					<h3 class="text-lg font-medium mb-2">No team tasks found</h3>
					<p class="text-sm text-muted-foreground mb-4">
						{#if searchQuery || selectedStatus || selectedPriority || selectedAssignee}
							Try adjusting your filters
						{:else}
							Your team has no assigned tasks at the moment
						{/if}
					</p>
					{#if !searchQuery && !selectedStatus && !selectedPriority && !selectedAssignee}
						<Button variant="outline" onclick={handleCreateTask}>
							<Plus class="mr-2 h-4 w-4" />
							Create Team Task
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


