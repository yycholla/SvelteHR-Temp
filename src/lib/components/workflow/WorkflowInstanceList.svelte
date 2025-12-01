<script lang="ts">
	import { onMount } from 'svelte';
	import {
		filteredInstances,
		workflowActions,
		isWorkflowLoading,
		workflowError
	} from '$lib/stores/workflow';
	import { auth } from '$lib/stores/auth.svelte';
	import WorkflowInstanceCard from './WorkflowInstanceCard.svelte';
	import WorkflowInstanceDetails from './WorkflowInstanceDetails.svelte';

	// Props
	let {
		showFilters = true,
		limit = 50,
		definitionId = null
	}: {
		showFilters?: boolean;
		limit?: number;
		definitionId?: string | null;
	} = $props();

	// Local state
	let statusFilter = $state('');
	let searchTerm = $state('');
	let selectedInstance = $state<any>(null);
	let showDetails = $state(false);

	// Filter options
	const statusOptions = [
		{ value: '', label: 'All Statuses' },
		{ value: 'pending', label: 'Pending' },
		{ value: 'running', label: 'Running' },
		{ value: 'completed', label: 'Completed' },
		{ value: 'failed', label: 'Failed' },
		{ value: 'cancelled', label: 'Cancelled' }
	];

	// Apply client-side filtering
	const filteredBySearch = $derived(
		$filteredInstances.filter((instance) => {
			const matchesSearch =
				!searchTerm ||
				instance.workflowDefinitionByWorkflowDefinitionId?.name
					.toLowerCase()
					.includes(searchTerm.toLowerCase()) ||
				instance.id.toLowerCase().includes(searchTerm.toLowerCase());

			const matchesDefinition = !definitionId || instance.workflowDefinitionId === definitionId;

			return matchesSearch && matchesDefinition;
		})
	);

	onMount(() => {
		workflowActions.loadInstances(limit);
	});

	function handleStatusFilter(status: string) {
		statusFilter = status;
		workflowActions.setFilters({ instanceStatus: status || undefined });
	}

	function handleRefresh() {
		workflowActions.loadInstances(limit);
	}

	function handleViewDetails(instance: any) {
		selectedInstance = instance;
		showDetails = true;
	}

	function handleCloseDetails() {
		showDetails = false;
		selectedInstance = null;
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'running':
				return 'bg-blue-100 text-blue-800';
			case 'completed':
				return 'bg-green-100 text-green-800';
			case 'failed':
				return 'bg-red-100 text-red-800';
			case 'cancelled':
				return 'bg-gray-100 text-gray-800';
			case 'pending':
				return 'bg-yellow-100 text-yellow-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="workflow-instances">
	<!-- Header -->
	<div class="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h2 class="text-2xl font-bold text-gray-900">
				{definitionId ? 'Workflow Instances' : 'All Workflow Instances'}
			</h2>
			<p class="mt-1 text-gray-600">Monitor workflow execution and status</p>
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

	<!-- Filters -->
	{#if showFilters}
		<div class="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<!-- Search -->
				<div>
					<label for="search" class="mb-1 block text-sm font-medium text-gray-700"> Search </label>
					<input
						id="search"
						type="text"
						bind:value={searchTerm}
						placeholder="Search by workflow name or instance ID..."
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
			</div>

			<!-- Clear Filters -->
			{#if statusFilter || searchTerm}
				<div class="mt-4">
					<button
						onclick={() => {
							statusFilter = '';
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
					<h3 class="text-sm font-medium text-red-800">Error loading workflow instances</h3>
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
					<div class="grid grid-cols-4 gap-4">
						<div class="h-4 rounded bg-gray-200"></div>
						<div class="h-4 rounded bg-gray-200"></div>
						<div class="h-4 rounded bg-gray-200"></div>
						<div class="h-4 rounded bg-gray-200"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Workflow Instances List -->
		{#if filteredBySearch.length > 0}
			<div class="space-y-4">
				{#each filteredBySearch as instance (instance.id)}
					<WorkflowInstanceCard {instance} onviewDetails={handleViewDetails} />
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
						d="M13 10V3L4 14h7v7l9-11h-7z"
					/>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900">No workflow instances found</h3>
				<p class="mt-1 text-sm text-gray-500">
					{#if searchTerm || statusFilter}
						Try adjusting your filters to see more results.
					{:else if definitionId}
						No instances have been started for this workflow definition yet.
					{:else}
						No workflow instances have been created yet.
					{/if}
				</p>
			</div>
		{/if}
	{/if}
</div>

<!-- Instance Details Modal -->
{#if showDetails && selectedInstance}
	<WorkflowInstanceDetails instance={selectedInstance} onclose={handleCloseDetails} />
{/if}


