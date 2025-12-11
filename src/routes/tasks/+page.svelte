<script lang="ts">
	import { onMount } from 'svelte';
	import { logger } from '$lib/utils/logger';
	import { goto } from '$app/navigation';
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
		createTask: async (task: any) => {},
		updateTask: async (id: string, updates: any) => {},
		deleteTask: async (id: string) => {},
		bulkUpdateTasks: async (ids: string[], updates: any) => {}
	};
	const userService = {
		loadUsers: async () => {}
	};
	import DataTable from '$lib/components/tables/DataTable.svelte';
	import Button from '$lib/components/base/Button.svelte';
	import Input from '$lib/components/base/Input.svelte';
	import Select from '$lib/components/base/Select.svelte';
	import Badge from '$lib/components/base/Badge.svelte';
	import Card from '$lib/components/base/Card.svelte';
	import type { Column } from '$lib/components/tables/DataTable.svelte';
	import type { Task, TaskFilter, TaskPriority, TaskStatus } from '$lib/types/task';

	// Filter state
	let searchQuery = '';
	let statusFilter = '';
	let priorityFilter = '';
	let assigneeFilter = '';
	let sortField = 'createdAt';
	let sortDirection: 'asc' | 'desc' = 'desc';
	let selectedTasks: TaskType[] = [];

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
			format: (value: any) => (value?.display_name || 'Unassigned')
		},
		{
			key: 'priority',
			label: 'Priority',
			sortable: true,
			type: 'badge',
			badgeVariant: (value: any) => getPriorityVariant(value as TaskPriority)
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			type: 'badge',
			badgeVariant: (value: any) => getStatusVariant(value as TaskStatus)
		},
		{
			key: 'dueDate',
			label: 'Due Date',
			sortable: true,
			type: 'date'
		}
	];

	// Computed values
	$: assigneeOptions = [
		{ value: '', label: 'All Assignees' },
		...$users.map((user) => ({
			value: user.id,
			label: user.display_name
		}))
	];

	$: filters = buildFilters();
	$: hasFiltersApplied = searchQuery || statusFilter || priorityFilter || assigneeFilter;

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

	function handleRowClick(detail: { row: Record<string, any>; index: number }) {
		goto(`/tasks/${detail.row.id}`);
	}

	function handleSelectionChange(detail: any[]) {
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
	$: if (filters) {
		loadTasks();
	}

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

<div class="tasks-page">
	<!-- Page Header -->
	<div class="page-header">
		<div class="page-header__content">
			<h1 class="page-header__title">Tasks</h1>
			<p class="page-header__subtitle">Manage and track tasks across your organization.</p>
		</div>

		<div class="page-header__actions">
			{#if auth.user && auth.hasPermission('task:create')}
				<Button variant="primary" leftIcon="plus" onclick={() => goto('/tasks/new')}>
					Create Task
				</Button>
			{/if}
		</div>
	</div>

	<!-- Filters -->
	<Card padding="md" class="filters-card">
		<div class="filters-grid">
			<div class="filter-item">
				<Input
					type="search"
					placeholder="Search tasks..."
					leftIcon="search"
					bind:value={searchQuery}
					oninput={loadTasks}
				/>
			</div>

			<div class="filter-item">
				<Select options={statusOptions} bind:value={statusFilter} placeholder="Filter by status" />
			</div>

			<div class="filter-item">
				<Select
					options={priorityOptions}
					bind:value={priorityFilter}
					placeholder="Filter by priority"
				/>
			</div>

			<div class="filter-item">
				<Select
					options={assigneeOptions}
					bind:value={assigneeFilter}
					placeholder="Filter by assignee"
				/>
			</div>

			{#if hasFiltersApplied}
				<div class="filter-item">
					<Button variant="ghost" size="sm" leftIcon="x" onclick={clearFilters}>
						Clear Filters
					</Button>
				</div>
			{/if}
		</div>
	</Card>

	<!-- Bulk Actions -->
	{#if selectedTasks.length > 0}
		<Card padding="sm" class="bulk-actions-card">
			<div class="bulk-actions">
				<span class="bulk-actions__count">
					{selectedTasks.length} task{selectedTasks.length === 1 ? '' : 's'} selected
				</span>

				<div class="bulk-actions__buttons">
					{#if auth.user && auth.hasPermission('task:update')}
						<Button
							variant="secondary"
							size="sm"
							leftIcon="check"
							onclick={() => handleBulkAction('complete')}
						>
							Mark Complete
						</Button>

						<Button
							variant="secondary"
							size="sm"
							leftIcon="user"
							onclick={() => handleBulkAction('assign')}
						>
							Assign
						</Button>
					{/if}

					{#if auth.user && auth.hasPermission('task:delete')}
						<Button
							variant="danger"
							size="sm"
							leftIcon="trash-2"
							onclick={() => handleBulkAction('delete')}
						>
							Delete
						</Button>
					{/if}
				</div>
			</div>
		</Card>
	{/if}

	<!-- Tasks Table -->
	<Card padding="none" class="tasks-table">
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
	</Card>

	<!-- Error State -->
	{#if $taskError}
		<Card padding="md" class="error-card">
			<div class="error-message">
				<div class="error-icon">
					<i class="icon-alert-circle"></i>
				</div>
				<div class="error-content">
					<h3 class="error-title">Error Loading Tasks</h3>
					<p class="error-description">{$taskError}</p>
					<Button variant="secondary" size="sm" leftIcon="refresh-cw" onclick={loadTasks}>
						Retry
					</Button>
				</div>
			</div>
		</Card>
	{/if}
</div>
