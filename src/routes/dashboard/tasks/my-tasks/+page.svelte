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
	import { goto, invalidateAll, replaceState } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Separator from '$lib/components/ui/separator';
	import TaskList from '$lib/components/tasks/TaskList.svelte';
	import QuickAddTask from '$lib/components/tasks/QuickAddTask.svelte';
	import {
		AlertCircle,
		AlertTriangle,
		CalendarDays,
		CheckCircle,
		ChevronDown,
		Clock,
		Columns,
		Filter,
		GitBranch,
		LayoutGrid,
		List,
		Plus,
		Search,
		SortAsc,
		TrendingUp,
		User,
		X
	} from '@lucide/svelte';
	import { CHANGE_TASK_STATUS } from '$lib/graphql/tasks-operations';
	import { client } from '$lib/graphql/client';
	import type { TaskPriority, TaskStatus } from '$lib/types/task';
	import { toast } from 'svelte-sonner';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import * as Avatar from '$lib/components/ui/avatar';

	// Page data from server
	const { data }: { data: PageData } = $props();

	// Local filter state
	// Use defensive access to prevent hydration errors if data is partial
	let searchQuery = $state(
		data && data.filters && data.filters.searchTerm ? data.filters.searchTerm : ''
	);
	let selectedStatus = $state<TaskStatus | 'all'>(
		data && data.filters && data.filters.statusFilter
			? (data.filters.statusFilter as TaskStatus | 'all')
			: 'all'
	);
	let selectedPriority = $state<TaskPriority | 'all'>(
		data && data.filters && data.filters.priorityFilter
			? (data.filters.priorityFilter as TaskPriority | 'all')
			: 'all'
	);

	// View state
	let viewMode = $state<'list' | 'hierarchy' | 'kanban'>('list');
	let sortBy = $state<'created_at' | 'due_date' | 'priority' | 'title' | 'smart'>('smart');
	let sortOrder = $state<'asc' | 'desc'>('desc');

	// Client-side filtered tasks (only search + explicit filter)
	// Sorting is handled by TaskList now
	const filteredTasks = $derived(
		(() => {
			let result = data?.tasks || [];

			if (!Array.isArray(result)) return [];

			// Search filter
			if (searchQuery) {
				const searchLower = searchQuery.toLowerCase();
				result = result.filter((task: any) => {
					if (!task) return false;
					const title = task.title?.toLowerCase() || '';
					const description = task.description?.toLowerCase() || '';
					return title.includes(searchLower) || description.includes(searchLower);
				});
			}

			// Status filter (if applied locally)
			if (selectedStatus !== 'all') {
				result = result.filter((task: any) => task?.status === selectedStatus);
			}

			// Priority filter (if applied locally)
			if (selectedPriority !== 'all') {
				result = result.filter((task: any) => task?.priority === selectedPriority);
			}

			return result;
		})()
	);

	// Statistics cards configuration - derived to update reactively
	const statsCards = $derived([
		{
			label: 'Total',
			value: data?.taskStats?.total || 0,
			icon: User,
			color: 'text-primary',
			bgColor: 'bg-primary/10',
			trend: ''
		},
		{
			label: 'Todo',
			value: data?.taskStats?.notStarted || 0,
			icon: Clock,
			color: 'text-amber-600',
			bgColor: 'bg-amber-100 dark:bg-amber-900/30',
			trend: ''
		},
		{
			label: 'Doing',
			value: data?.taskStats?.inProgress || 0,
			icon: TrendingUp,
			color: 'text-blue-600',
			bgColor: 'bg-blue-100 dark:bg-blue-900/30',
			trend: ''
		},
		{
			label: 'Blocked',
			value: data?.taskStats?.blocked || 0,
			icon: AlertCircle,
			color: 'text-red-600',
			bgColor: 'bg-red-100 dark:bg-red-900/30',
			trend: ''
		},
		{
			label: 'Done',
			value: data?.taskStats?.completed || 0,
			icon: CheckCircle,
			color: 'text-green-600',
			bgColor: 'bg-green-100 dark:bg-green-900/30',
			trend: ''
		}
	]);

	// Weekly Progress Calculation
	const weeklyProgress = $derived(
		(() => {
			const total = data?.taskStats?.total || 0;
			const completed = data?.taskStats?.completed || 0;
			const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
			return {
				completed,
				total,
				percentage
			};
		})()
	);

	// Options for dropdowns
	const statusOptions: Array<{ value: TaskStatus | 'all'; label: string }> = [
		{ value: 'all', label: 'All Statuses' },
		{ value: 'TODO', label: 'To Do' },
		{ value: 'IN_PROGRESS', label: 'In Progress' },
		{ value: 'REVIEW', label: 'In Review' },
		{ value: 'BLOCKED', label: 'Blocked' },
		{ value: 'DONE', label: 'Done' },
		{ value: 'CANCELLED', label: 'Cancelled' }
	];

	const priorityOptions: Array<{ value: TaskPriority | 'all'; label: string }> = [
		{ value: 'all', label: 'All Priorities' },
		{ value: 'URGENT', label: 'Urgent' },
		{ value: 'HIGH', label: 'High' },
		{ value: 'MEDIUM', label: 'Medium' },
		{ value: 'LOW', label: 'Low' }
	];

	const sortOptions = [
		{ value: 'smart', label: 'Smart Sort' },
		{ value: 'created_at', label: 'Created Date' },
		{ value: 'due_date', label: 'Due Date' },
		{ value: 'priority', label: 'Priority' },
		{ value: 'title', label: 'Title' }
	];

	// Debounce timer for URL updates
	let urlUpdateTimer: any = null;

	// Update URL without navigation (for bookmarking)
	function updateURL() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (selectedStatus !== 'all') params.set('status', selectedStatus);
		if (selectedPriority !== 'all') params.set('priority', selectedPriority);

		const queryString = params.toString();
		const newUrl = queryString ? `?${queryString}` : '/dashboard/tasks/my-tasks';
		replaceState(newUrl, {});
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

	// Handle filter changes - update immediately
	function handleFilterChange() {
		updateURL();
	}

	function clearFilters() {
		searchQuery = '';
		selectedStatus = 'all';
		selectedPriority = 'all';
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

	// Today's events from server (filtered by RSVP status: accepted, tentative, pending)
	const upcomingEvents = $derived(data?.todayEvents || []);
</script>

<svelte:head>
	<title>My Tasks - MountainHR</title>
	<meta name="description" content="View and manage your assigned tasks" />
</svelte:head>

<div class="min-h-screen bg-muted/20 p-6 font-sans" data-testid="my-tasks-page">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- Header Section -->
		<div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
			<div>
				<h1 class="text-2xl font-bold tracking-tight text-foreground">My Workspace</h1>
				<p class="text-sm text-muted-foreground">Manage your tasks and daily overview</p>
			</div>
			<div class="flex items-center gap-2">
				<Button variant="outline" size="sm" class="h-9 gap-2">
					<CalendarDays class="h-4 w-4" />
					<span
						>{new Date().toLocaleDateString('en-US', {
							month: 'short',
							day: 'numeric',
							year: 'numeric'
						})}</span
					>
				</Button>

				<!-- Quick Add Task -->
				<QuickAddTask
					currentUser={data.user}
					assignees={data.assignees}
					taskTypes={data.taskTypes}
					canAssign={false}
					formAction="/dashboard/tasks/my-tasks"
					onSuccess={async () => {
						await invalidateAll();
					}}
				/>
			</div>
		</div>

		<!-- Bento Grid Layout -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-12 lg:grid-rows-[auto_auto]">
			<!-- 1. Summary Stats (Top Left - Spans 8 cols) -->
			<div class="col-span-1 md:col-span-8 grid grid-cols-2 md:grid-cols-5 gap-4">
				{#each statsCards as stat (stat.label)}
					{@const Icon = stat.icon}
					<div class="rounded-xl border bg-card px-3 py-2 shadow-sm transition-all hover:shadow-md">
						<div class="flex items-center gap-2">
							<div class="flex h-7 w-7 items-center justify-center rounded-full {stat.bgColor}">
								<Icon class="h-3.5 w-3.5 {stat.color}" />
							</div>
							<div class="flex flex-col">
								<span class="text-[10px] font-medium text-muted-foreground leading-tight"
									>{stat.label}</span
								>
								<span class="text-lg font-bold leading-none">{stat.value}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- 2. Weekly Goal / Progress (Top Right - Spans 4 cols) -->
			<div class="col-span-1 md:col-span-4 rounded-xl border bg-card p-5 shadow-sm">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="font-semibold">Weekly Progress</h3>
					<Badge variant="outline" class="text-xs font-normal">Current</Badge>
				</div>
				<div class="space-y-4">
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Tasks Completed</span>
						<span class="font-medium">{weeklyProgress.completed}/{weeklyProgress.total}</span>
					</div>
					<Progress value={weeklyProgress.percentage} class="h-2" />
					<div class="flex gap-2 mt-2">
						<div class="flex-1 rounded-lg bg-muted/50 p-2 text-center">
							<div class="text-xs text-muted-foreground">Completion</div>
							<div class="font-semibold text-green-600">{weeklyProgress.percentage}%</div>
						</div>
						<div class="flex-1 rounded-lg bg-muted/50 p-2 text-center">
							<div class="text-xs text-muted-foreground">Focus</div>
							<div class="font-semibold text-blue-600">--</div>
						</div>
					</div>
				</div>
			</div>

			<!-- 3. Main Task List (Bottom Left - Spans 8 cols, Tall) -->
			<div
				class="col-span-1 md:col-span-8 row-span-2 rounded-xl border bg-card shadow-sm flex flex-col min-h-[600px]"
			>
				<!-- Toolbar -->
				<div class="flex items-center justify-between border-b p-4 flex-wrap gap-2">
					<div class="flex items-center gap-4">
						<h3 class="font-semibold">Tasks</h3>
						<div class="flex items-center rounded-lg bg-muted p-1">
							<button
								class="rounded-md px-2 py-1 {viewMode === 'list'
									? 'bg-background shadow-sm text-foreground'
									: 'text-muted-foreground hover:text-foreground'}"
								onclick={() => (viewMode = 'list')}
								title="List View"
							>
								<List class="h-4 w-4" />
							</button>
							<button
								class="rounded-md px-2 py-1 {viewMode === 'kanban'
									? 'bg-background shadow-sm text-foreground'
									: 'text-muted-foreground hover:text-foreground'}"
								onclick={() => (viewMode = 'kanban')}
								title="Kanban View"
							>
								<LayoutGrid class="h-4 w-4" />
							</button>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<div class="relative hidden sm:block w-48">
							<Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
							<Input
								type="text"
								placeholder="Search..."
								value={searchQuery}
								oninput={handleSearchInput}
								class="h-9 w-full pl-9"
							/>
						</div>

						<!-- Status Filter Dropdown -->
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								<Button variant="ghost" size="icon" class="h-9 w-9">
									<Filter class="h-4 w-4 text-muted-foreground" />
								</Button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end" class="w-48">
								<DropdownMenu.Label>Filter by Status</DropdownMenu.Label>
								<DropdownMenu.Separator />
								{#each statusOptions as option (option.value)}
									<DropdownMenu.Item
										onclick={() => {
											selectedStatus = option.value;
											handleFilterChange();
										}}
									>
										<div class="flex items-center gap-2">
											{#if selectedStatus === option.value}
												<CheckCircle class="h-3.5 w-3.5 text-primary" />
											{:else}
												<div class="h-3.5 w-3.5"></div>
											{/if}
											{option.label}
										</div>
									</DropdownMenu.Item>
								{/each}
							</DropdownMenu.Content>
						</DropdownMenu.Root>

						<!-- Sort Dropdown -->
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								<Button variant="ghost" size="icon" class="h-9 w-9">
									<SortAsc class="h-4 w-4 text-muted-foreground" />
								</Button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end" class="w-48">
								<DropdownMenu.Label>Sort by</DropdownMenu.Label>
								<DropdownMenu.Separator />
								{#each sortOptions as option (option.value)}
									<DropdownMenu.Item
										onclick={() =>
											(sortBy = option.value as 'created_at' | 'due_date' | 'priority' | 'title' | 'smart')}
									>
										<div class="flex items-center gap-2">
											{#if sortBy === option.value}
												<CheckCircle class="h-3.5 w-3.5 text-primary" />
											{:else}
												<div class="h-3.5 w-3.5"></div>
											{/if}
											{option.label}
										</div>
									</DropdownMenu.Item>
								{/each}
								<DropdownMenu.Separator />
								<DropdownMenu.Item
									onclick={() => (sortOrder = sortOrder === 'asc' ? 'desc' : 'asc')}
								>
									<div class="flex items-center gap-2">
										<div class="h-3.5 w-3.5"></div>
										{sortOrder === 'asc' ? 'Ascending' : 'Descending'}
									</div>
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				</div>

				<!-- Compact List -->
				<div class="flex-1 overflow-auto p-2">
					<TaskList
						tasks={filteredTasks}
						userId={data.user?.id || ''}
						showFilters={false}
						bind:viewMode
						bind:sortBy
						bind:sortOrder
						onTaskClick={handleTaskClick}
						onStatusChange={handleStatusChange}
						loading={false}
					/>
				</div>
			</div>

			<!-- 4. Upcoming / Schedule (Bottom Right - Spans 4 cols) -->
			<div
				class="col-span-1 md:col-span-4 rounded-xl border bg-card p-5 shadow-sm h-full min-h-[300px]"
			>
				<h3 class="mb-4 font-semibold">Today's Schedule</h3>
				{#if upcomingEvents.length > 0}
					<div class="relative border-l border-muted pl-6 space-y-6">
						{#each upcomingEvents as event}
							<div class="relative">
								<span
									class="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary ring-4 ring-background"
								></span>
								<div class="flex flex-col gap-1">
									<span class="text-xs font-medium text-muted-foreground">
										{event.isAllDay ? 'All Day' : event.time}
									</span>
									<span class="text-sm font-medium">{event.title}</span>
									{#if event.location}
										<span class="text-xs text-muted-foreground">{event.location}</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="flex h-full items-center justify-center pb-12">
						<div class="text-center">
							<CalendarDays class="mx-auto h-12 w-12 text-muted-foreground/50" />
							<p class="mt-3 text-sm text-muted-foreground">No events scheduled</p>
						</div>
					</div>
				{/if}
			</div>

			<!-- 5. Quick Notes / Scratchpad (Bottom Right - Spans 4 cols) -->
			<div class="col-span-1 md:col-span-4 rounded-xl border bg-card p-5 shadow-sm min-h-[200px]">
				<div class="mb-2 flex items-center justify-between">
					<h3 class="font-semibold">Quick Notes</h3>
					<Button variant="ghost" size="icon" class="h-6 w-6"><Plus class="h-3 w-3" /></Button>
				</div>
				<textarea
					class="w-full resize-none rounded-md bg-muted/30 p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 h-32"
					placeholder="Jot down something..."
				></textarea>
			</div>
		</div>
	</div>
</div>
