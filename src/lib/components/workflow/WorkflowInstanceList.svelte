<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    filteredInstances, 
    workflowActions, 
    isWorkflowLoading, 
    workflowError 
  } from '$lib/stores/workflow';
  import { canManageWorkflows } from '$lib/stores/auth';
  import WorkflowInstanceCard from './WorkflowInstanceCard.svelte';
  import WorkflowInstanceDetails from './WorkflowInstanceDetails.svelte';
  
  export let showFilters = true;
  export let limit = 50;
  export let definitionId: string | null = null;
  
  let statusFilter = '';
  let searchTerm = '';
  let selectedInstance: any = null;
  let showDetails = false;
  
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
  $: filteredBySearch = $filteredInstances.filter(instance => {
    const matchesSearch = !searchTerm || 
      instance.workflowDefinitionByWorkflowDefinitionId?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instance.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDefinition = !definitionId || instance.workflowDefinitionId === definitionId;
    
    return matchesSearch && matchesDefinition;
  });
  
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
  
  function handleViewDetails(event: CustomEvent) {
    selectedInstance = event.detail;
    showDetails = true;
  }
  
  function handleCloseDetails() {
    showDetails = false;
    selectedInstance = null;
  }
  
  function getStatusColor(status: string) {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
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
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">
        {definitionId ? 'Workflow Instances' : 'All Workflow Instances'}
      </h2>
      <p class="text-gray-600 mt-1">Monitor workflow execution and status</p>
    </div>
    
    <div class="flex gap-2">
      <button
        on:click={handleRefresh}
        class="btn btn-secondary"
        disabled={$isWorkflowLoading}
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh
      </button>
    </div>
  </div>
  
  <!-- Filters -->
  {#if showFilters}
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Search -->
        <div>
          <label for="search" class="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
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
          <label for="status-filter" class="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status-filter"
            bind:value={statusFilter}
            on:change={() => handleStatusFilter(statusFilter)}
            class="select"
          >
            {#each statusOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>
      </div>
      
      <!-- Clear Filters -->
      {#if statusFilter || searchTerm}
        <div class="mt-4">
          <button
            on:click={() => {
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
    <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div class="flex">
        <svg class="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <div>
          <h3 class="text-sm font-medium text-red-800">Error loading workflow instances</h3>
          <p class="text-sm text-red-700 mt-1">{$workflowError}</p>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- Loading State -->
  {#if $isWorkflowLoading}
    <div class="space-y-4">
      {#each Array(6) as _}
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
          <div class="flex justify-between items-start mb-4">
            <div class="flex-1">
              <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div class="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div class="h-6 bg-gray-200 rounded w-20"></div>
          </div>
          <div class="grid grid-cols-4 gap-4">
            <div class="h-4 bg-gray-200 rounded"></div>
            <div class="h-4 bg-gray-200 rounded"></div>
            <div class="h-4 bg-gray-200 rounded"></div>
            <div class="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Workflow Instances List -->
    {#if filteredBySearch.length > 0}
      <div class="space-y-4">
        {#each filteredBySearch as instance (instance.id)}
          <WorkflowInstanceCard 
            {instance} 
            on:viewDetails={handleViewDetails}
          />
        {/each}
      </div>
    {:else}
      <!-- Empty State -->
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
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
  <WorkflowInstanceDetails
    instance={selectedInstance}
    on:close={handleCloseDetails}
  />
{/if}

<style>
  .workflow-instances {
    @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8;
  }
  
  .btn {
    @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors;
  }
  
  .btn-secondary {
    @apply text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-blue-500;
  }
  
  .btn:disabled {
    @apply opacity-50 cursor-not-allowed;
  }
  
  .input {
    @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500;
  }
  
  .select {
    @apply block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500;
  }
</style>