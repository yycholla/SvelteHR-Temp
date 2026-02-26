<script lang="ts">
	import { onMount } from 'svelte';
	import { logger } from '$lib/utils/logger';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { auth } from '$lib/stores/auth.svelte';
	// TODO: These services need to be implemented
	// import { taskService, tasks, isLoadingTasks, taskError } from '$lib/services/taskService';
	// import { userService, users } from '$lib/services/userService';

	// Mock stores until services are implemented
	import { writable } from 'svelte/store';
	import type { User } from '$lib/types';
	import type { Task as TaskType } from '$lib/types/task';
	const tasks = writable<TaskType[]>([]);
	const isLoadingTasks = writable(false);
	const taskError = writable<string | null>(null);
	const users = writable<User[]>([]);
	const taskService = {
		loadTasks: async () => {},
		createTask: async (task: unknown) => {},
		updateTask: async (id: string, updates: unknown) => {},
		deleteTask: async (id: string) => {},
		bulkUpdateTasks: async (ids: string[], updates: unknown) => {}
	};
	const userService = {
		loadUsers: async () => {}
	};

	// Shadcn UI components
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';

	// Lucide icons
	import { Plus, Search, X, Check, UserIcon, Trash2, RefreshCw, AlertCircle } from '@lucide/svelte';

	import DataTable from '$lib/components/tables/DataTable.svelte';
	import type { Column } from '$lib/components/tables/DataTable.svelte';
	import type { Task, TaskFilter, TaskPriority, TaskStatus } from '$lib/types/task';

	// Filter state
	let searchQuery = $state('');
	let statusFilter = $state('');
	let priorityFilter = $state('');
	let assigneeFilter = $state('');
	let sortField = $state('createdAt');
	let sortDirection = $state<'asc' | 'desc'>('desc');
	let selectedTasks = $state<TaskType[]>([]);

	// Filter options
	const statusOptions = [
		{ value: '', label: 'All Status' },
		{ value: 'TODO', label: 'To Do' },
		{ value: 'IN_PROGRESS', label: 'In Progress' },
		{ value: 'BLOCKED', label: 'Blocked' },
		{ value: 'REVIEW', label: 'In Review' },
		{ value: 'DONE', label: 'Done' },
		{ value: 'CANCELLED', label: 'Cancelled' }
	];

	const priorityOptions = [
		{ value: '', label: 'All Priority' },
		{ value: 'LOW', label: 'Low' },
		{ value: 'MEDIUM', label: 'Medium' },
		{ value: 'HIGH', label: 'High' },
		{ value: 'URGENT', label: 'Urgent' }
	];

	// Table columns
	const columns: Column[] = [
		{
			key: 'title',
			label: 'Task',
			sortable: true,
			type: 'text'
		},
		{
			key: 'assignee',
			label: 'Assignee',
			sortable: true,
			type: 'text',
			format: (value: unknown) => (value as { display_name?: string })?.display_name || 'Unassigned'
		},
		{
			key: 'priority',
			label: 'Priority',
			sortable: true,
			type: 'badge',
			badgeVariant: (value: unknown) => getPriorityVariant(value as TaskPriority)
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			type: 'badge',
			badgeVariant: (value: unknown) => getStatusVariant(value as TaskStatus)
		},
		{
			key: 'dueDate',
			label: 'Due Date',
			sortable: true,
			type: 'date'
		}
	];

	// Computed values
	let assigneeOptions = $derived([
		{ value: '', label: 'All Assignees' },
		...$users.map((user) => ({
			value: user.id,
			label: user.display_name
		}))
	]);

	let filters = $derived(buildFilters());
	let hasFiltersApplied = $derived(searchQuery || statusFilter || priorityFilter || assigneeFilter);

	function buildFilters(): TaskFilter {
		return {
			...(searchQuery && { search: searchQuery }),
			...(statusFilter && { status: statusFilter as TaskStatus }),
			...(priorityFilter && { priority: priorityFilter as TaskPriority }),
			...(assigneeFilter && { assigneeId: assigneeFilter })
		};
	}

	async function loadTasks() {
		try {
			await taskService.loadTasks();
		} catch (error) {
			logger.error('Failed to load tasks:', error as Error);
		}
	}

	function getPriorityVariant(priority: TaskPriority): string {
		const variants: Record<TaskPriority, string> = {
			LOW: 'secondary',
			MEDIUM: 'primary',
			HIGH: 'warning',
			URGENT: 'danger'
		};
		return variants[priority] || 'secondary';
	}

	function getStatusVariant(status: TaskStatus): string {
		const variants: Record<TaskStatus, string> = {
			TODO: 'secondary',
			IN_PROGRESS: 'primary',
			BLOCKED: 'danger',
			REVIEW: 'warning',
			DONE: 'success',
			CANCELLED: 'danger'
		};
		return variants[status] || 'secondary';
	}

	function handleSort(detail: { key: string; direction: 'asc' | 'desc' }) {
		sortField = detail.key;
		sortDirection = detail.direction;
		loadTasks();
	}

	function handleRowClick(detail: { row: Record<string, unknown>; index: number }) {
		goto(resolve(`/dashboard/tasks/${String(detail.row.id)}`));
	}

	function handleSelectionChange(detail: TaskType[]) {
		selectedTasks = detail;
	}

	function clearFilters() {
		searchQuery = '';
		statusFilter = '';
		priorityFilter = '';
		assigneeFilter = '';
	}

	function handleBulkAction(action: string) {
		if (selectedTasks.length === 0) return;

		switch (action) {
			case 'complete':
				// TODO: Implement bulk complete
				logger.info(`Bulk complete: ${selectedTasks}`);
				break;
			case 'assign':
				// TODO: Show bulk assign modal
				logger.info(`Bulk assign: ${selectedTasks}`);
				break;
			case 'delete':
				// TODO: Show bulk delete confirmation
				logger.info(`Bulk delete: ${selectedTasks}`);
				break;
		}
	}

	// Load data when filters change
	$effect(() => {
		if (filters) {
			loadTasks();
		}
	});

	onMount(() => {
		// Load users for assignee dropdown
		userService.loadUsers();
		loadTasks();
	});
</script>

<svelte:head>
	<title>Tasks - MountainHR</title>
	<meta name="description" content="View and manage all tasks in your organization" />
</svelte:head>

<div class="container mx-auto space-y-6 px-4 py-8">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-3xl font-bold text-foreground">Tasks</h1>
			<p class="mt-1 text-muted-foreground">Manage and track tasks across your organization.</p>
		</div>

		<div>
			{#if auth.user && auth.hasPermission('task:create')}
				<Button variant="default" onclick={() => goto(resolve('/dashboard/tasks/new'))}>
					<Plus class="mr-2 h-4 w-4" />
					Create Task
				</Button>
			{/if}
		</div>
	</div>

	<!-- Filters -->
	<Card.Root>
		<Card.Content class="pt-6">
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
				<div class="relative">
					<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Search tasks..."
						bind:value={searchQuery}
						oninput={() => loadTasks()}
						class="pl-9"
					/>
				</div>

				<Select.Root
					type="single"
					onValueChange={(v) => {
						statusFilter = v ?? '';
					}}
				>
					<Select.Trigger class="w-full">
						<Select.Value placeholder="Filter by status" />
					</Select.Trigger>
					<Select.Content>
						{#each statusOptions as option (option.value)}
							<Select.Item value={option.value} label={option.label} />
						{/each}
					</Select.Content>
				</Select.Root>

				<Select.Root
					type="single"
					onValueChange={(v) => {
						priorityFilter = v ?? '';
					}}
				>
					<Select.Trigger class="w-full">
						<Select.Value placeholder="Filter by priority" />
					</Select.Trigger>
					<Select.Content>
						{#each priorityOptions as option (option.value)}
							<Select.Item value={option.value} label={option.label} />
						{/each}
					</Select.Content>
				</Select.Root>

				<Select.Root
					type="single"
					onValueChange={(v) => {
						assigneeFilter = v ?? '';
					}}
				>
					<Select.Trigger class="w-full">
						<Select.Value placeholder="Filter by assignee" />
					</Select.Trigger>
					<Select.Content>
						{#each assigneeOptions as option (option.value)}
							<Select.Item value={option.value} label={option.label} />
						{/each}
					</Select.Content>
				</Select.Root>

				{#if hasFiltersApplied}
					<Button variant="ghost" size="sm" onclick={clearFilters}>
						<X class="mr-2 h-4 w-4" />
						Clear Filters
					</Button>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Bulk Actions -->
	{#if selectedTasks.length > 0}
		<Card.Root>
			<Card.Content class="py-3">
				<div class="flex items-center justify-between">
					<span class="text-sm text-muted-foreground">
						{selectedTasks.length} task{selectedTasks.length === 1 ? '' : 's'} selected
					</span>

					<div class="flex gap-2">
						{#if auth.user && auth.hasPermission('task:update')}
							<Button variant="secondary" size="sm" onclick={() => handleBulkAction('complete')}>
								<Check class="mr-2 h-4 w-4" />
								Mark Complete
							</Button>

							<Button variant="secondary" size="sm" onclick={() => handleBulkAction('assign')}>
								<UserIcon class="mr-2 h-4 w-4" />
								Assign
							</Button>
						{/if}

						{#if auth.user && auth.hasPermission('task:delete')}
							<Button variant="destructive" size="sm" onclick={() => handleBulkAction('delete')}>
								<Trash2 class="mr-2 h-4 w-4" />
								Delete
							</Button>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Tasks Table -->
	<Card.Root class="overflow-hidden">
		<DataTable
			data={$tasks}
			{columns}
			loading={$isLoadingTasks}
			selectable={true}
			hoverable={true}
			currentSort={{ key: sortField, direction: sortDirection }}
			bind:selectedRows={selectedTasks}
			emptyMessage="No tasks found"
			onsort={handleSort}
			onrowClick={handleRowClick}
			onselectionChange={handleSelectionChange}
		/>
	</Card.Root>

	<!-- Error State -->
	{#if $taskError}
		<Card.Root class="border-destructive/50 bg-destructive/10">
			<Card.Content class="py-6">
				<div class="flex items-start gap-4">
					<AlertCircle class="h-5 w-5 text-destructive" />
					<div class="flex-1">
						<h3 class="font-semibold text-destructive">Error Loading Tasks</h3>
						<p class="mt-1 text-sm text-destructive/80">{$taskError}</p>
						<Button variant="secondary" size="sm" onclick={loadTasks} class="mt-3">
							<RefreshCw class="mr-2 h-4 w-4" />
							Retry
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
