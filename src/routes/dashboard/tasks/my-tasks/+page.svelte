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
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as NativeSelect from '$lib/components/ui/native-select';
	import * as Field from '$lib/components/ui/field';
	import TaskList from '$lib/components/tasks/TaskList.svelte';
	import QuickAddTask from '$lib/components/tasks/QuickAddTask.svelte';
	import {
		AlertCircle,
		AlertTriangle,
		CheckCircle,
		Clock,
		Search,
		TrendingUp,
		User
	} from '@lucide/svelte';
	import { CHANGE_TASK_STATUS } from '$lib/graphql/tasks-operations';
	import { client } from '$lib/graphql/client';
	import { invalidateAll } from '$app/navigation';
	import type { TaskStatus } from '$lib/types/task';
	import { toast } from 'svelte-sonner';

	// Page data from server
	const { data }: { data: PageData } = $props();

	// Local filter state
	let searchQuery = $state(data.filters.searchTerm);
	let selectedStatus = $state(data.filters.statusFilter);
	let selectedPriority = $state(data.filters.priorityFilter);

	// Priority order for sorting
	const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

	// Client-side filtered and sorted tasks
	const filteredTasks = $derived.by(() => {
		let result = data.tasks;

		// Search filter
		if (searchQuery) {
			const searchLower = searchQuery.toLowerCase();
			result = result.filter((task: any) => {
				const title = task.title?.toLowerCase() || '';
				const description = task.description?.toLowerCase() || '';
				return title.includes(searchLower) || description.includes(searchLower);
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
	const statsCards = $derived([
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
	]);

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

	// Debounce timer for URL updates
	let urlUpdateTimer: any = null;

	// Update URL without navigation (for bookmarking)
	function updateURL() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (selectedStatus) params.set('status', selectedStatus);
		if (selectedPriority) params.set('priority', selectedPriority);

		const queryString = params.toString();
		const newUrl = queryString ? `?${queryString}` : '/dashboard/tasks/my-tasks';
		window.history.replaceState({}, '', newUrl);
	}

	// Handle search input with debounced URL update
	function handleSearchInput(e: Event) {
		searchQuery = (e.target as HTMLInputElement).value;

		// Clear existing timer
		if (urlUpdateTimer) clearTimeout(urlUpdateTimer);

		// Debounce URL update (500ms after user stops typing)
		urlUpdateTimer = setTimeout(() => {
			updateURL();
		}, 500);
	}

	// Handle filter changes - update immediately for selects
	function updateFilters() {
		updateURL();
	}

	// Handle task click
	function handleTaskClick(taskId: string) {
		goto(`/dashboard/tasks/${taskId}`);
	}

	// Handle status change
	async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
		try {
			const result = await client
				.mutation(CHANGE_TASK_STATUS, {
					input: {
						taskId,
						status: newStatus
					}
				})
				.toPromise();

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
	<title>My Tasks - MountainHR</title>
	<meta name="description" content="View and manage your assigned tasks" />
</svelte:head>

<div class="space-y-6" data-testid="my-tasks-page">
	<!-- Page Header -->
	<div class="flex items-start justify-end gap-4">
		<QuickAddTask
			currentUser={data.user}
			assignees={data.assignees}
			taskTypes={data.taskTypes}
			canAssign={false}
			formAction="/dashboard/tasks/my-tasks"
			onSuccess={async () => {
				// Refresh the page data after task creation
				await invalidateAll();
			}}
		/>
	</div>

	<!-- Statistics Cards -->
	<div
		class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6"
		data-testid="my-tasks-stats-grid"
	>
		{#each statsCards as stat}
			{@const Icon = stat.icon}
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between pb-2">
					<Card.Title class="text-sm font-medium text-muted-foreground">
						{stat.label}
					</Card.Title>
					<div class="flex h-8 w-8 items-center justify-between rounded-full {stat.bgColor}">
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
				<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
					<!-- Search -->
					<Field.Field>
						<Field.Label>Search</Field.Label>
						<div class="relative">
							<Search
								class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
							/>
							<Input
								type="text"
								placeholder="Search tasks..."
								value={searchQuery}
								oninput={handleSearchInput}
								class="pl-9"
							/>
						</div>
					</Field.Field>

					<!-- Status Filter -->
					<Field.Field>
						<Field.Label>Status</Field.Label>
						<NativeSelect.Root
							value={selectedStatus}
							onchange={(e) => {
								selectedStatus = e.currentTarget.value;
								updateFilters();
							}}
						>
							{#each statusOptions as option}
								<NativeSelect.Option value={option.value}>{option.label}</NativeSelect.Option>
							{/each}
						</NativeSelect.Root>
					</Field.Field>

					<!-- Priority Filter -->
					<Field.Field>
						<Field.Label>Priority</Field.Label>
						<NativeSelect.Root
							value={selectedPriority}
							onchange={(e) => {
								selectedPriority = e.currentTarget.value;
								updateFilters();
							}}
						>
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
	<div class="space-y-4" data-testid="my-tasks-list-section">
		{#if filteredTasks.length === 0}
			<Card.Root>
				<Card.Content class="flex flex-col items-center justify-center py-12">
					<CheckCircle class="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
					<h3 class="mb-2 text-lg font-medium">No tasks found</h3>
					<p class="mb-4 text-sm text-muted-foreground">
						{#if searchQuery || selectedStatus || selectedPriority}
							Try adjusting your filters
						{:else}
							You have no assigned tasks at the moment
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
