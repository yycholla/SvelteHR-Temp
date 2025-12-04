<script lang="ts">
	import { onMount } from 'svelte';
	import {
		filteredTasks,
		workflowActions,
		isWorkflowLoading,
		workflowError
	} from '$lib/stores/workflow';
	import { auth } from '$lib/stores/auth.svelte';
	import WorkflowTaskCard from './WorkflowTaskCard.svelte';

	// Props
	let {
		showFilters = true,
		limit = 50,
		instanceId = null,
		assignedToId = null
	}: {
		showFilters?: boolean;
		limit?: number;
		instanceId?: string | null;
		assignedToId?: string | null;
	} = $props();

	// Local state
	let statusFilter = $state('');
	let priorityFilter = $state('');
	let searchTerm = $state('');

	// Filter options
	const statusOptions = [
		{ value: '', label: 'All Statuses' },
		{ value: 'pending', label: 'Pending' },
		{ value: 'in_progress', label: 'In Progress' },
		{ value: 'completed', label: 'Completed' },
		{ value: 'failed', label: 'Failed' },
		{ value: 'cancelled', label: 'Cancelled' }
	];

	const priorityOptions = [
		{ value: '', label: 'All Priorities' },
		{ value: 'low', label: 'Low' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'high', label: 'High' },
		{ value: 'critical', label: 'Critical' }
	];

	// Apply client-side filtering
	const filteredBySearch = $derived(
		$filteredTasks.filter((task) => {
			const matchesSearch =
				!searchTerm ||
				task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
				task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				task.id.toLowerCase().includes(searchTerm.toLowerCase());

			const matchesInstance = !instanceId || task.workflowInstanceId === instanceId;
			const matchesPriority = !priorityFilter || task.priority === priorityFilter;
			const matchesAssignee = !assignedToId || task.assignedToId === assignedToId;

			return matchesSearch && matchesInstance && matchesPriority && matchesAssignee;
		})
	);

	// Group tasks by status
	const groupedTasks = $derived({
		pending: filteredBySearch.filter((task) => task.status === 'pending'),
		in_progress: filteredBySearch.filter((task) => task.status === 'in_progress'),
		completed: filteredBySearch.filter((task) => task.status === 'completed'),
		failed: filteredBySearch.filter((task) => task.status === 'failed'),
		cancelled: filteredBySearch.filter((task) => task.status === 'cancelled')
	});

	onMount(() => {
		const condition = instanceId
			? { workflowInstanceId: instanceId }
			: assignedToId
				? { assignedToId }
				: undefined;
		workflowActions.loadTasks(limit, condition);
	});

	function handleStatusFilter(status: string) {
		statusFilter = status;
		workflowActions.setFilters({ taskStatus: status || undefined });
	}

	function handleRefresh() {
		const condition = instanceId
			? { workflowInstanceId: instanceId }
			: assignedToId
				? { assignedToId }
				: undefined;
		workflowActions.loadTasks(limit, condition);
	}

	function handleTaskUpdate() {
		// Task was updated, refresh the list
		handleRefresh();
	}
</script>

<div class="workflow-tasks">
	<!-- Header -->
	<div class="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h2 class="text-2xl font-bold text-gray-900">
				{instanceId ? 'Instance Tasks' : assignedToId ? 'My Tasks' : 'All Workflow Tasks'}
			</h2>
			<p class="mt-1 text-gray-600">Manage and track individual workflow tasks</p>
		</div>

		<div class="flex gap-2">
			<button onclick={handleRefresh} class="btn btn-secondary" disabled={$isWorkflowLoading}>
				<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					/>
				</svg>
				Refresh
			</button>
		</div>
	</div>

	<!-- Stats Summary -->
	<div class="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
		{#each Object.entries(groupedTasks) as [status, tasks] (status)}
			<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium capitalize text-gray-600">
							{status.replace('_', ' ')}
						</p>
						<p class="text-2xl font-bold text-gray-900">{tasks.length}</p>
					</div>
					<div class="rounded-full bg-gray-50 p-2">
						{#if status === 'pending'}
							<svg
								class="h-5 w-5 text-yellow-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						{:else if status === 'in_progress'}
							<svg
								class="h-5 w-5 animate-spin text-blue-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								/>
							</svg>
						{:else if status === 'completed'}
							<svg
								class="h-5 w-5 text-green-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						{:else if status === 'failed'}
							<svg
								class="h-5 w-5 text-red-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						{:else if status === 'cancelled'}
							<svg
								class="h-5 w-5 text-gray-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
								/>
							</svg>
						{:else}
							<svg
								class="h-5 w-5 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Filters -->
	{#if showFilters}
		<div class="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<!-- Search -->
				<div>
					<label for="search" class="mb-1 block text-sm font-medium text-gray-700"> Search </label>
					<input
						id="search"
						type="text"
						bind:value={searchTerm}
						placeholder="Search by title, description, or ID..."
						class="input"
					/>
				</div>

				<!-- Status Filter -->
				<div>
					<label for="status-filter" class="mb-1 block text-sm font-medium text-gray-700">
						Status
					</label>
					<select
						id="status-filter"
						bind:value={statusFilter}
						onchange={() => handleStatusFilter(statusFilter)}
						class="select"
					>
						{#each statusOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<!-- Priority Filter -->
				<div>
					<label for="priority-filter" class="mb-1 block text-sm font-medium text-gray-700">
						Priority
					</label>
					<select id="priority-filter" bind:value={priorityFilter} class="select">
						{#each priorityOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Clear Filters -->
			{#if statusFilter || priorityFilter || searchTerm}
				<div class="mt-4">
					<button
						onclick={() => {
							statusFilter = '';
							priorityFilter = '';
							searchTerm = '';
							workflowActions.clearFilters();
						}}
						class="text-sm text-blue-600 hover:text-blue-800"
					>
						Clear all filters
					</button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Error Display -->
	{#if $workflowError}
		<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
			<div class="flex">
				<svg class="mr-2 h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
						clip-rule="evenodd"
					/>
				</svg>
				<div>
					<h3 class="text-sm font-medium text-red-800">Error loading workflow tasks</h3>
					<p class="mt-1 text-sm text-red-700">{$workflowError}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Loading State -->
	{#if $isWorkflowLoading}
		<div class="space-y-4">
			{#each Array(6) as _, i (i)}
				<div class="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<div class="mb-4 flex items-start justify-between">
						<div class="flex-1">
							<div class="mb-2 h-5 w-3/4 rounded bg-gray-200"></div>
							<div class="h-4 w-1/2 rounded bg-gray-200"></div>
						</div>
						<div class="h-6 w-20 rounded bg-gray-200"></div>
					</div>
					<div class="grid grid-cols-3 gap-4">
						<div class="h-4 rounded bg-gray-200"></div>
						<div class="h-4 rounded bg-gray-200"></div>
						<div class="h-4 rounded bg-gray-200"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Workflow Tasks List -->
		{#if filteredBySearch.length > 0}
			<div class="space-y-4">
				{#each filteredBySearch as task (task.id)}
					<WorkflowTaskCard {task} onupdate={handleTaskUpdate} />
				{/each}
			</div>
		{:else}
			<!-- Empty State -->
			<div class="py-12 text-center">
				<svg
					class="mx-auto h-12 w-12 text-gray-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
					/>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900">No workflow tasks found</h3>
				<p class="mt-1 text-sm text-gray-500">
					{#if searchTerm || statusFilter || priorityFilter}
						Try adjusting your filters to see more results.
					{:else if instanceId}
						No tasks have been created for this workflow instance yet.
					{:else if assignedToId}
						You don't have any workflow tasks assigned to you.
					{:else}
						No workflow tasks have been created yet.
					{/if}
				</p>
			</div>
		{/if}
	{/if}
</div>
