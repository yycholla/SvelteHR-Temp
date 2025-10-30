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
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as NativeSelect from '$lib/components/ui/native-select';
	import * as Field from '$lib/components/ui/field';
	import TaskList from '$lib/components/tasks/TaskList.svelte';
	import QuickAddTeamTask from '$lib/components/tasks/QuickAddTeamTask.svelte';
	import {
		CheckCircle,
		Clock,
		AlertCircle,
		TrendingUp,
		Users,
		Search,
		AlertTriangle
	} from '@lucide/svelte';
	import { CHANGE_TASK_STATUS } from '$lib/graphql/tasks-operations';
	import { client } from '$lib/graphql/client';
	import { invalidateAll } from '$app/navigation';
	import type { TaskStatus } from '$lib/types/task';
	import { toast } from 'svelte-sonner';

	// Page data from server
	let { data }: { data: PageData } = $props();

	// Local filter state
	let searchQuery = $state(data.filters.searchTerm);
	let selectedStatus = $state(data.filters.statusFilter);
	let selectedPriority = $state(data.filters.priorityFilter);
	let selectedDepartment = $state('');

	// Priority order for sorting
	const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

	// Client-side filtered and sorted tasks
	let filteredTasks = $derived.by(() => {
		let result = data.tasks;

		// Department filter - filter by assignee's department
		if (selectedDepartment) {
			result = result.filter((task: any) => task.assignee?.departmentId === selectedDepartment);
		}

		// Search filter
		if (searchQuery) {
			const searchLower = searchQuery.toLowerCase();
			result = result.filter((task: any) => {
				const title = task.title?.toLowerCase() || '';
				const description = task.description?.toLowerCase() || '';
				const assigneeName = task.assignee?.displayName?.toLowerCase() || '';
				return title.includes(searchLower) || description.includes(searchLower) || assigneeName.includes(searchLower);
			});
		}

		// Status filter
		if (selectedStatus) {
			result = result.filter((task: any) => task.status === selectedStatus);
		}

		// Priority filter
		if (selectedPriority) {
			result = result.filter((task: any) => task.priority === selectedPriority);
		}

		// Sort by priority > due date > rest
		return [...result].sort((a, b) => {
			// First, sort by priority (URGENT > HIGH > MEDIUM > LOW)
			const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
			const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
			const priorityDiff = priorityA - priorityB;
			if (priorityDiff !== 0) return priorityDiff;

			// Then by due date (ascending - soonest first)
			if (a.dueDate && b.dueDate) {
				return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
			}
			if (a.dueDate) return -1;
			if (b.dueDate) return 1;

			// Finally by title
			return a.title.localeCompare(b.title);
		});
	});

	// Statistics cards configuration - derived to update reactively
	let statsCards = $derived([
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
	]);

	// Status options (matching GraphQL enum values)
	const statusOptions = [
		{ value: '', label: 'All Statuses' },
		{ value: 'TODO', label: 'Not Started' },
		{ value: 'IN_PROGRESS', label: 'In Progress' },
		{ value: 'BLOCKED', label: 'Blocked' },
		{ value: 'REVIEW', label: 'Review' },
		{ value: 'DONE', label: 'Completed' }
	];

	// Priority options (matching GraphQL enum values)
	const priorityOptions = [
		{ value: '', label: 'All Priorities' },
		{ value: 'LOW', label: 'Low' },
		{ value: 'MEDIUM', label: 'Medium' },
		{ value: 'HIGH', label: 'High' },
		{ value: 'URGENT', label: 'Urgent' }
	];

	// Handle filter changes - update URL
	function updateFilters() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (selectedStatus) params.set('status', selectedStatus);
		if (selectedPriority) params.set('priority', selectedPriority);
		if (selectedDepartment) params.set('department', selectedDepartment);

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

	// Handle status change
	async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
		try {
			const result = await client.mutation(CHANGE_TASK_STATUS, {
				input: {
					taskId,
					status: newStatus
				}
			}).toPromise();

			if (result.error) {
				throw result.error;
			}

			// Show success message
			toast.success('Task status updated successfully');

			// Refresh the data
			await invalidateAll();
		} catch (error) {
			console.error('Failed to change task status:', error);
			toast.error('Failed to update task status');
		}
	}
</script>

<svelte:head>
	<title>Team Tasks - SvelteHR</title>
	<meta name="description" content="View and manage your team's tasks" />
</svelte:head>

<div class="space-y-6" data-testid="team-tasks-page">
	<!-- Page Header -->
	<div class="flex items-start justify-end gap-4">
		<QuickAddTeamTask
			currentUser={data.user}
			departments={data.departments}
			taskTypes={data.taskTypes}
		/>
	</div>

	<!-- Statistics Cards -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6" data-testid="team-tasks-stats-grid">
		{#each statsCards as stat}
			{@const Icon = stat.icon}
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between pb-2">
					<Card.Title class="text-sm font-medium text-muted-foreground">
						{stat.label}
					</Card.Title>
					<div class="flex h-8 w-8 items-center justify-center rounded-full {stat.bgColor}">
						<Icon class="h-4 w-4 {stat.color}" />
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
			<Field.Group>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<!-- Search -->
					<Field.Field>
						<Field.Label>Search</Field.Label>
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
					</Field.Field>

					<!-- Department Filter -->
					<Field.Field>
						<Field.Label>Department</Field.Label>
						<NativeSelect.Root value={selectedDepartment} onchange={(e) => { selectedDepartment = e.currentTarget.value; updateFilters(); }}>
							<NativeSelect.Option value="">All Departments</NativeSelect.Option>
							{#each data.departments as department}
								<NativeSelect.Option value={department.id}>{department.name}</NativeSelect.Option>
							{/each}
						</NativeSelect.Root>
					</Field.Field>

					<!-- Status Filter -->
					<Field.Field>
						<Field.Label>Status</Field.Label>
						<NativeSelect.Root value={selectedStatus} onchange={(e) => { selectedStatus = e.currentTarget.value; updateFilters(); }}>
							{#each statusOptions as option}
								<NativeSelect.Option value={option.value}>{option.label}</NativeSelect.Option>
							{/each}
						</NativeSelect.Root>
					</Field.Field>

					<!-- Priority Filter -->
					<Field.Field>
						<Field.Label>Priority</Field.Label>
						<NativeSelect.Root value={selectedPriority} onchange={(e) => { selectedPriority = e.currentTarget.value; updateFilters(); }}>
							{#each priorityOptions as option}
								<NativeSelect.Option value={option.value}>{option.label}</NativeSelect.Option>
							{/each}
						</NativeSelect.Root>
					</Field.Field>
				</div>
			</Field.Group>
		</Card.Content>
	</Card.Root>

	<!-- Tasks List -->
	<div class="space-y-4" data-testid="team-tasks-list-section">
		{#if filteredTasks.length === 0}
			<Card.Root>
				<Card.Content class="flex flex-col items-center justify-center py-12">
					<Users class="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
					<h3 class="text-lg font-medium mb-2">No team tasks found</h3>
					<p class="text-sm text-muted-foreground mb-4">
						{#if searchQuery || selectedStatus || selectedPriority || selectedDepartment}
							Try adjusting your filters
						{:else}
							No team tasks at the moment
						{/if}
					</p>
				</Card.Content>
			</Card.Root>
		{:else}
			<TaskList
				tasks={filteredTasks}
				userId={data.user.id}
				onTaskClick={handleTaskClick}
				onStatusChange={handleStatusChange}
				showProgress={true}
				compact={false}
			/>
		{/if}
	</div>
</div>


