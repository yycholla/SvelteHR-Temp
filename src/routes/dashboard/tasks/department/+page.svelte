<script lang="ts">
	// Department Tasks Page
	// Feature: 019-we-need-to - Task T027
	// Purpose: Display department-wide tasks for managers

	import type { PageData } from './$types';
	import TaskList from '$lib/components/tasks/TaskList.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { TaskPriority, TaskStatus } from '$lib/graphql/types';
	import { getTaskStatistics } from '$lib/utils/tasks';

	const { data }: { data: PageData } = $props();

	// Derived statistics
	const statistics = $derived(getTaskStatistics(data.allTasks));

	// Filter state
	let selectedStatus = $state<TaskStatus | 'all'>(data.filters.status || 'all');
	let selectedPriority = $state<TaskPriority | 'all'>(data.filters.priority || 'all');
	let selectedSort = $state(data.filters.sortBy || 'priority');
	let selectedDepartment = $state(data.filters.departmentId || '');

	// Handle task click (navigate to task detail)
	function handleTaskClick(task: any) {
		goto(`/dashboard/tasks/${task.id}`);
	}

	// Handle status change
	async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
		// TODO: Implement status update mutation
		// For now, reload the page to show updated data
		window.location.reload();
	}

	// Apply filters
	function applyFilters() {
		const params = new URLSearchParams($page.url.searchParams);

		if (selectedDepartment) {
			params.set('department', selectedDepartment);
		} else {
			params.delete('department');
		}

		if (selectedStatus !== 'all') {
			params.set('status', selectedStatus);
		} else {
			params.delete('status');
		}

		if (selectedPriority !== 'all') {
			params.set('priority', selectedPriority);
		} else {
			params.delete('priority');
		}

		params.set('sort', selectedSort);
		params.set('page', '1'); // Reset to first page

		goto(`?${params.toString()}`, { replaceState: true });
	}

	// Pagination
	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', pageNum.toString());
		goto(`?${params.toString()}`);
	}
</script>

<svelte:head>
	<title>Department Tasks - MountainHR</title>
	<meta name="description" content="Manage department-wide tasks" />
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-foreground">Department Tasks</h1>
		<p class="mt-2 text-muted-foreground">Manage tasks assigned to your department</p>
	</div>

	<!-- Filters and Controls -->
	<div class="mb-6 rounded-lg border border-border bg-card p-4 shadow-sm">
		<div class="flex flex-wrap items-end gap-4">
			<!-- Department Selector (if managing multiple departments) -->
			{#if data.managedDepartments.length > 1}
				<div class="min-w-[200px] flex-1">
					<label for="department-filter" class="mb-1 block text-sm font-medium text-foreground">
						Department
					</label>
					<select
						id="department-filter"
						bind:value={selectedDepartment}
						onchange={applyFilters}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
					>
						{#each data.managedDepartments as dept}
							<option value={dept.id}>{dept.name}</option>
						{/each}
					</select>
				</div>
			{:else if data.selectedDepartment}
				<!-- Show current department if only one -->
				<div class="min-w-[200px] flex-1">
					<div class="mb-1 block text-sm font-medium text-foreground">Department</div>
					<div
						class="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
					>
						{data.selectedDepartment.name}
					</div>
				</div>
			{/if}

			<!-- Status Filter -->
			<div class="min-w-[200px] flex-1">
				<label for="status-filter" class="mb-1 block text-sm font-medium text-foreground">
					Status
				</label>
				<select
					id="status-filter"
					bind:value={selectedStatus}
					onchange={applyFilters}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
				>
					<option value="all">All Statuses</option>
					<option value="pending">Pending</option>
					<option value="in_progress">In Progress</option>
					<option value="completed">Completed</option>
					<option value="cancelled">Cancelled</option>
				</select>
			</div>

			<!-- Priority Filter -->
			<div class="min-w-[200px] flex-1">
				<label for="priority-filter" class="mb-1 block text-sm font-medium text-foreground">
					Priority
				</label>
				<select
					id="priority-filter"
					bind:value={selectedPriority}
					onchange={applyFilters}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
				>
					<option value="all">All Priorities</option>
					<option value="low">Low</option>
					<option value="medium">Medium</option>
					<option value="high">High</option>
					<option value="urgent">Urgent</option>
				</select>
			</div>

			<!-- Sort Order -->
			<div class="min-w-[200px] flex-1">
				<label for="sort-filter" class="mb-1 block text-sm font-medium text-foreground">
					Sort By
				</label>
				<select
					id="sort-filter"
					bind:value={selectedSort}
					onchange={applyFilters}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
				>
					<option value="priority">Priority</option>
					<option value="dueDate">Due Date</option>
					<option value="created">Created Date</option>
					<option value="status">Status</option>
				</select>
			</div>

			<!-- Reset Filters Button -->
			<div>
				<button
					type="button"
					onclick={() => goto('/dashboard/tasks/department')}
					class="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
				>
					Reset
				</button>
			</div>
		</div>
	</div>

	<!-- Statistics Summary -->
	<div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
		<div class="rounded-lg border border-border bg-card p-4 shadow-sm">
			<div class="text-2xl font-bold text-foreground">{statistics.total}</div>
			<div class="text-sm text-muted-foreground">Total</div>
		</div>

		<div class="rounded-lg border border-border bg-card p-4 shadow-sm">
			<div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
				{statistics.pending}
			</div>
			<div class="text-sm text-muted-foreground">Pending</div>
		</div>

		<div class="rounded-lg border border-border bg-card p-4 shadow-sm">
			<div class="text-2xl font-bold text-primary">{statistics.inProgress}</div>
			<div class="text-sm text-muted-foreground">In Progress</div>
		</div>

		<div class="rounded-lg border border-border bg-card p-4 shadow-sm">
			<div class="text-2xl font-bold text-green-600 dark:text-green-400">
				{statistics.completed}
			</div>
			<div class="text-sm text-muted-foreground">Completed</div>
		</div>

		<div class="rounded-lg border border-border bg-card p-4 shadow-sm">
			<div class="text-2xl font-bold text-destructive">{statistics.urgent}</div>
			<div class="text-sm text-muted-foreground">Urgent</div>
		</div>

		<div class="rounded-lg border border-border bg-card p-4 shadow-sm">
			<div class="text-2xl font-bold text-orange-600 dark:text-orange-400">{statistics.high}</div>
			<div class="text-sm text-muted-foreground">High</div>
		</div>

		<div class="rounded-lg border border-border bg-card p-4 shadow-sm">
			<div class="text-2xl font-bold text-destructive">{statistics.overdue}</div>
			<div class="text-sm text-muted-foreground">Overdue</div>
		</div>
	</div>

	<!-- Task List -->
	<div class="mb-6">
		<TaskList
			tasks={data.tasks}
			onTaskClick={handleTaskClick}
			onStatusChange={handleStatusChange}
			sortBy={selectedSort}
			filterStatus={selectedStatus}
			filterPriority={selectedPriority}
			compact={false}
			showStatistics={false}
			emptyMessage="No department tasks found"
		/>
	</div>

	<!-- Pagination -->
	{#if data.totalCount > data.limit}
		<div class="flex items-center justify-between border-t border-border bg-card px-4 py-3 sm:px-6">
			<div class="flex flex-1 justify-between sm:hidden">
				<button
					type="button"
					disabled={data.currentPage === 1}
					onclick={() => goToPage(data.currentPage - 1)}
					class="relative inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
				>
					Previous
				</button>
				<button
					type="button"
					disabled={!data.hasNextPage}
					onclick={() => goToPage(data.currentPage + 1)}
					class="relative ml-3 inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
				>
					Next
				</button>
			</div>

			<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
				<div>
					<p class="text-sm text-foreground">
						Showing
						<span class="font-medium">{(data.currentPage - 1) * data.limit + 1}</span>
						to
						<span class="font-medium"
							>{Math.min(data.currentPage * data.limit, data.totalCount)}</span
						>
						of
						<span class="font-medium">{data.totalCount}</span>
						tasks
					</p>
				</div>

				<div>
					<nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
						<button
							type="button"
							disabled={data.currentPage === 1}
							onclick={() => goToPage(data.currentPage - 1)}
							class="relative inline-flex items-center rounded-l-md px-2 py-2 text-muted-foreground ring-1 ring-border ring-inset hover:bg-accent hover:text-accent-foreground focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<span class="sr-only">Previous</span>
							<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
									clip-rule="evenodd"
								/>
							</svg>
						</button>

						<span
							class="relative inline-flex items-center bg-card px-4 py-2 text-sm font-semibold text-foreground ring-1 ring-border ring-inset"
						>
							Page {data.currentPage}
						</span>

						<button
							type="button"
							disabled={!data.hasNextPage}
							onclick={() => goToPage(data.currentPage + 1)}
							class="relative inline-flex items-center rounded-r-md px-2 py-2 text-muted-foreground ring-1 ring-border ring-inset hover:bg-accent hover:text-accent-foreground focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<span class="sr-only">Next</span>
							<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
									clip-rule="evenodd"
								/>
							</svg>
						</button>
					</nav>
				</div>
			</div>
		</div>
	{/if}
</div>
