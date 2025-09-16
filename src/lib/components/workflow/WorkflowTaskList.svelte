<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    filteredTasks, 
    workflowActions, 
    isWorkflowLoading, 
    workflowError 
  } from '$lib/stores/workflow';
  import { user, canManageWorkflows } from '$lib/stores/auth';
  import WorkflowTaskCard from './WorkflowTaskCard.svelte';
  
  export let showFilters = true;
  export let limit = 50;
  export let instanceId: string | null = null;
  export let assignedToId: string | null = null;
  
  let statusFilter = '';
  let priorityFilter = '';
  let searchTerm = '';
  
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
  $: filteredBySearch = $filteredTasks.filter(task => {
    const matchesSearch = !searchTerm || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesInstance = !instanceId || task.workflowInstanceId === instanceId;
    const matchesPriority = !priorityFilter || task.priority === priorityFilter;
    const matchesAssignee = !assignedToId || task.assignedToId === assignedToId;
    
    return matchesSearch && matchesInstance && matchesPriority && matchesAssignee;
  });
  
  // Group tasks by status
  $: groupedTasks = {
    pending: filteredBySearch.filter(task => task.status === 'pending'),
    in_progress: filteredBySearch.filter(task => task.status === 'in_progress'),
    completed: filteredBySearch.filter(task => task.status === 'completed'),
    failed: filteredBySearch.filter(task => task.status === 'failed'),
    cancelled: filteredBySearch.filter(task => task.status === 'cancelled')
  };
  
  onMount(() => {
    const condition = instanceId ? { workflowInstanceId: instanceId } : 
                     assignedToId ? { assignedToId } : undefined;
    workflowActions.loadTasks(limit, condition);
  });
  
  function handleStatusFilter(status: string) {
    statusFilter = status;
    workflowActions.setFilters({ taskStatus: status || undefined });
  }
  
  function handleRefresh() {
    const condition = instanceId ? { workflowInstanceId: instanceId } : 
                     assignedToId ? { assignedToId } : undefined;
    workflowActions.loadTasks(limit, condition);
  }
  
  function handleTaskUpdate(event: CustomEvent) {
    // Task was updated, refresh the list
    handleRefresh();
  }
  
  function getStatusIcon(status: string) {
    switch (status) {
      case 'pending':
        return `
          <svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        `;
      case 'in_progress':
        return `
          <svg class="w-5 h-5 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        `;
      case 'completed':
        return `
          <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        `;
      case 'failed':
        return `
          <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        `;
      case 'cancelled':
        return `
          <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
          </svg>
        `;
      default:
        return `
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        `;
    }
  }
</script>

<div class="workflow-tasks">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">
        {instanceId ? 'Instance Tasks' : assignedToId ? 'My Tasks' : 'All Workflow Tasks'}
      </h2>
      <p class="text-gray-600 mt-1">Manage and track individual workflow tasks</p>
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
  
  <!-- Stats Summary -->
  <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
    {#each Object.entries(groupedTasks) as [status, tasks]}
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 capitalize">
              {status.replace('_', ' ')}
            </p>
            <p class="text-2xl font-bold text-gray-900">{tasks.length}</p>
          </div>
          <div class="p-2 bg-gray-50 rounded-full">
            {@html getStatusIcon(status)}
          </div>
        </div>
      </div>
    {/each}
  </div>
  
  <!-- Filters -->
  {#if showFilters}
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Search -->
        <div>
          <label for="search" class="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
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
        
        <!-- Priority Filter -->
        <div>
          <label for="priority-filter" class="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            id="priority-filter"
            bind:value={priorityFilter}
            class="select"
          >
            {#each priorityOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>
      </div>
      
      <!-- Clear Filters -->
      {#if statusFilter || priorityFilter || searchTerm}
        <div class="mt-4">
          <button
            on:click={() => {
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
    <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div class="flex">
        <svg class="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <div>
          <h3 class="text-sm font-medium text-red-800">Error loading workflow tasks</h3>
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
          <div class="grid grid-cols-3 gap-4">
            <div class="h-4 bg-gray-200 rounded"></div>
            <div class="h-4 bg-gray-200 rounded"></div>
            <div class="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Workflow Tasks List -->
    {#if filteredBySearch.length > 0}
      <div class="space-y-4">
        {#each filteredBySearch as task (task.id)}
          <WorkflowTaskCard 
            {task} 
            on:update={handleTaskUpdate}
          />
        {/each}
      </div>
    {:else}
      <!-- Empty State -->
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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

<style>
  .workflow-tasks {
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