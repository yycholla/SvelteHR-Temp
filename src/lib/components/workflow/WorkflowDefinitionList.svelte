<script lang="ts">
	import { onMount } from 'svelte';
	import {
		filteredDefinitions,
		workflowActions,
		isWorkflowLoading,
		workflowError,
		workflowStats
	} from '$lib/stores/workflow';
	import { canManageWorkflows } from '$lib/stores/auth';
	import WorkflowDefinitionCard from './WorkflowDefinitionCard.svelte';
	import CreateWorkflowDefinition from './CreateWorkflowDefinition.svelte';
	import WorkflowStatsCards from './WorkflowStatsCards.svelte';

	export let showCreateButton = true;
	export let showStats = true;
	export let limit = 50;

	let showCreateDialog = false;
	let statusFilter = '';
	let categoryFilter = '';
	let searchTerm = '';

	// Filter categories from definitions
	$: categories = [...new Set($filteredDefinitions.map((def) => def.category).filter(Boolean))];

	// Apply client-side filtering
	$: filteredBySearch = $filteredDefinitions.filter((definition) => {
		const matchesSearch =
			!searchTerm ||
			definition.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			definition.description?.toLowerCase().includes(searchTerm.toLowerCase());

		return matchesSearch;
	});

	onMount(() => {
		workflowActions.loadDefinitions(limit);
	});

	function handleStatusFilter(status: string) {
		statusFilter = status;
		workflowActions.setFilters({ definitionStatus: status || undefined });
	}

	function handleCategoryFilter(category: string) {
		categoryFilter = category;
		workflowActions.setFilters({ category: category || undefined });
	}

	function handleRefresh() {
		workflowActions.loadDefinitions(limit);
	}

	function handleCreateSuccess() {
		showCreateDialog = false;
		workflowActions.loadDefinitions(limit); // Refresh list
	}
</script>

<div class="workflow-definitions">
	<!-- Header -->
	<div class="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h2 class="text-2xl font-bold text-gray-900">Workflow Definitions</h2>
			<p class="mt-1 text-gray-600">Manage and monitor automated HR processes</p>
		</div>

		<div class="flex gap-2">
			<button on:click={handleRefresh} class="btn btn-secondary" disabled={$isWorkflowLoading}>
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

			{#if showCreateButton && $canManageWorkflows}
				<button on:click={() => (showCreateDialog = true)} class="btn btn-primary">
					<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6v6m0 0v6m0-6h6m-6 0H6"
						/>
					</svg>
					Create Workflow
				</button>
			{/if}
		</div>
	</div>

	<!-- Stats Cards -->
	{#if showStats}
		<WorkflowStatsCards />
	{/if}

	<!-- Filters -->
	<div class="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<!-- Search -->
			<div>
				<label for="search" class="mb-1 block text-sm font-medium text-gray-700"> Search </label>
				<input
					id="search"
					type="text"
					bind:value={searchTerm}
					placeholder="Search by name or description..."
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
					on:change={() => handleStatusFilter(statusFilter)}
					class="select"
				>
					<option value="">All Statuses</option>
					<option value="active">Active</option>
					<option value="inactive">Inactive</option>
					<option value="draft">Draft</option>
				</select>
			</div>

			<!-- Category Filter -->
			<div>
				<label for="category-filter" class="mb-1 block text-sm font-medium text-gray-700">
					Category
				</label>
				<select
					id="category-filter"
					bind:value={categoryFilter}
					on:change={() => handleCategoryFilter(categoryFilter)}
					class="select"
				>
					<option value="">All Categories</option>
					{#each categories as category}
						<option value={category}>{category}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Clear Filters -->
		{#if statusFilter || categoryFilter || searchTerm}
			<div class="mt-4">
				<button
					on:click={() => {
						statusFilter = '';
						categoryFilter = '';
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
					<h3 class="text-sm font-medium text-red-800">Error loading workflow definitions</h3>
					<p class="mt-1 text-sm text-red-700">{$workflowError}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Loading State -->
	{#if $isWorkflowLoading}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each Array(6) as _}
				<div class="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<div class="mb-4 h-4 w-3/4 rounded bg-gray-200"></div>
					<div class="mb-2 h-3 w-full rounded bg-gray-200"></div>
					<div class="mb-4 h-3 w-2/3 rounded bg-gray-200"></div>
					<div class="flex items-center justify-between">
						<div class="h-3 w-16 rounded bg-gray-200"></div>
						<div class="h-3 w-20 rounded bg-gray-200"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Workflow Definitions Grid -->
		{#if filteredBySearch.length > 0}
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each filteredBySearch as definition (definition.id)}
					<WorkflowDefinitionCard {definition} />
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
						d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
					/>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900">No workflow definitions found</h3>
				<p class="mt-1 text-sm text-gray-500">
					{#if searchTerm || statusFilter || categoryFilter}
						Try adjusting your filters to see more results.
					{:else}
						Get started by creating your first workflow definition.
					{/if}
				</p>
				{#if $canManageWorkflows && !searchTerm && !statusFilter && !categoryFilter}
					<div class="mt-6">
						<button on:click={() => (showCreateDialog = true)} class="btn btn-primary">
							<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 6v6m0 0v6m0-6h6m-6 0H6"
								/>
							</svg>
							Create Your First Workflow
						</button>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<!-- Create Workflow Dialog -->
{#if showCreateDialog}
	<CreateWorkflowDefinition
		on:success={handleCreateSuccess}
		on:cancel={() => (showCreateDialog = false)}
	/>
{/if}


