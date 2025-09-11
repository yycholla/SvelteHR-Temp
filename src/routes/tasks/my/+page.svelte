<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentUser } from '$lib/services/auth';
  import { taskService, myTasks, isLoadingTasks, taskError } from '$lib/services/taskService';
  import DataTable from '$lib/components/tables/DataTable.svelte';
  import Button from '$lib/components/base/Button.svelte';
  import Input from '$lib/components/base/Input.svelte';
  import Select from '$lib/components/base/Select.svelte';
  import Badge from '$lib/components/base/Badge.svelte';
  import Card from '$lib/components/base/Card.svelte';
  import type { Column } from '$lib/components/tables/DataTable.svelte';
  import type { Task, TaskStatus, TaskPriority } from '$lib/types';

  // Filter state
  let searchQuery = '';
  let statusFilter = '';
  let priorityFilter = '';
  let sortField = 'dueDate';
  let sortDirection: 'asc' | 'desc' = 'asc';

  // Filter options
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'TODO', label: 'To Do' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'REVIEW', label: 'In Review' },
    { value: 'COMPLETED', label: 'Completed' }
  ];

  const priorityOptions = [
    { value: '', label: 'All Priority' },
    { value: 'LOW', label: 'Low' },
    { value: 'NORMAL', label: 'Normal' },
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
      key: 'priority',
      label: 'Priority',
      sortable: true,
      type: 'badge',
      badgeVariant: (value) => getPriorityVariant(value)
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      type: 'badge',
      badgeVariant: (value) => getStatusVariant(value)
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      sortable: true,
      type: 'date'
    },
    {
      key: 'progress',
      label: 'Progress',
      sortable: true,
      type: 'custom'
    }
  ];

  // Computed values
  $: filteredTasks = $myTasks.filter(task => {
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter && task.status !== statusFilter) {
      return false;
    }
    if (priorityFilter && task.priority !== priorityFilter) {
      return false;
    }
    return true;
  });

  $: overdueTasks = $myTasks.filter(task => {
    if (task.status === 'COMPLETED' || !task.dueDate) return false;
    return new Date(task.dueDate) < new Date();
  });

  $: upcomingTasks = $myTasks.filter(task => {
    if (task.status === 'COMPLETED' || !task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    return dueDate >= now && dueDate <= threeDaysFromNow;
  });

  $: hasFiltersApplied = searchQuery || statusFilter || priorityFilter;

  function getPriorityVariant(priority: TaskPriority): string {
    const variants = {
      LOW: 'secondary',
      NORMAL: 'primary',
      HIGH: 'warning',
      URGENT: 'danger'
    };
    return variants[priority] || 'secondary';
  }

  function getStatusVariant(status: TaskStatus): string {
    const variants = {
      TODO: 'secondary',
      IN_PROGRESS: 'primary',
      REVIEW: 'warning',
      COMPLETED: 'success',
      CANCELLED: 'danger'
    };
    return variants[status] || 'secondary';
  }

  function handleSort(event: CustomEvent) {
    sortField = event.detail.key;
    sortDirection = event.detail.direction;
    // Note: For filtered data, we'd need to implement client-side sorting
    // or reload from server with new sort parameters
  }

  function handleRowClick(event: CustomEvent) {
    const { row } = event.detail;
    goto(`/tasks/${row.id}`);
  }

  function clearFilters() {
    searchQuery = '';
    statusFilter = '';
    priorityFilter = '';
  }

  async function handleQuickUpdate(taskId: string, update: { status?: TaskStatus; progress?: number }) {
    try {
      await taskService.updateTask(taskId, update);
      // Task list will update automatically via the store
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }

  onMount(() => {
    taskService.loadMyTasks();
  });
</script>

<svelte:head>
  <title>My Tasks - MountainHR</title>
  <meta name="description" content="View and manage your assigned tasks" />
</svelte:head>

<div class="my-tasks-page">
  <!-- Page Header -->
  <div class="page-header">
    <div class="page-header__content">
      <h1 class="page-header__title">My Tasks</h1>
      <p class="page-header__subtitle">
        Track and manage your assigned tasks.
      </p>
    </div>

    <div class="page-header__actions">
      <Button
        variant="tertiary"
        leftIcon="list"
        href="/tasks"
      >
        All Tasks
      </Button>
    </div>
  </div>

  <!-- Quick Stats -->
  <div class="task-stats">
    <Card padding="lg" class="stat-card">
      <div class="stat-card__content">
        <div class="stat-card__icon stat-card__icon--blue">
          <i class="icon-check-square"></i>
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{$myTasks.length}</div>
          <div class="stat-card__label">Total Tasks</div>
        </div>
      </div>
    </Card>

    <Card padding="lg" class="stat-card">
      <div class="stat-card__content">
        <div class="stat-card__icon stat-card__icon--yellow">
          <i class="icon-clock"></i>
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{upcomingTasks.length}</div>
          <div class="stat-card__label">Due Soon</div>
        </div>
      </div>
    </Card>

    <Card padding="lg" class="stat-card">
      <div class="stat-card__content">
        <div class="stat-card__icon stat-card__icon--red">
          <i class="icon-alert-triangle"></i>
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{overdueTasks.length}</div>
          <div class="stat-card__label">Overdue</div>
        </div>
      </div>
    </Card>
  </div>

  <!-- Filters -->
  <Card padding="md" class="filters-card">
    <div class="filters-grid">
      <div class="filter-item">
        <Input
          type="search"
          placeholder="Search my tasks..."
          leftIcon="search"
          bind:value={searchQuery}
        />
      </div>

      <div class="filter-item">
        <Select
          options={statusOptions}
          bind:value={statusFilter}
          placeholder="Filter by status"
        />
      </div>

      <div class="filter-item">
        <Select
          options={priorityOptions}
          bind:value={priorityFilter}
          placeholder="Filter by priority"
        />
      </div>

      {#if hasFiltersApplied}
        <div class="filter-item">
          <Button
            variant="ghost"
            size="sm"
            leftIcon="x"
            on:click={clearFilters}
          >
            Clear Filters
          </Button>
        </div>
      {/if}
    </div>
  </Card>

  <!-- Tasks Table -->
  <Card padding="none" class="tasks-table">
    <DataTable
      data={filteredTasks}
      {columns}
      loading={$isLoadingTasks}
      hoverable={true}
      currentSort={{ key: sortField, direction: sortDirection }}
      emptyMessage="No tasks assigned to you"
      on:sort={handleSort}
      on:rowClick={handleRowClick}
    >
      <svelte:fragment slot="cell" let:column let:value let:row>
        {#if column.key === 'progress'}
          <div class="progress-cell">
            <div class="progress-bar">
              <div 
                class="progress-bar__fill" 
                style="width: {row.progress || 0}%"
              ></div>
            </div>
            <span class="progress-text">{row.progress || 0}%</span>
            
            {#if row.status !== 'COMPLETED'}
              <div class="progress-actions">
                <Button
                  variant="ghost"
                  size="xs"
                  iconOnly
                  leftIcon="play"
                  on:click={(e) => {
                    e.stopPropagation();
                    handleQuickUpdate(row.id, { status: 'IN_PROGRESS' });
                  }}
                />
                <Button
                  variant="ghost"
                  size="xs"
                  iconOnly
                  leftIcon="check"
                  on:click={(e) => {
                    e.stopPropagation();
                    handleQuickUpdate(row.id, { status: 'COMPLETED', progress: 100 });
                  }}
                />
              </div>
            {/if}
          </div>
        {/if}
      </svelte:fragment>
    </DataTable>
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
          <Button
            variant="secondary"
            size="sm"
            leftIcon="refresh-cw"
            on:click={() => taskService.loadMyTasks()}
          >
            Retry
          </Button>
        </div>
      </div>
    </Card>
  {/if}
</div>

<style lang="postcss">
  .my-tasks-page {
    @apply space-y-6;
  }

  /* Page Header */
  .page-header {
    @apply flex items-start justify-between;
  }

  .page-header__content {
    @apply space-y-2;
  }

  .page-header__title {
    @apply text-3xl font-bold text-gray-900;
  }

  .page-header__subtitle {
    @apply text-lg text-gray-600;
  }

  .page-header__actions {
    @apply flex items-center space-x-3;
  }

  /* Task Stats */
  .task-stats {
    @apply grid grid-cols-1 md:grid-cols-3 gap-4;
  }

  .stat-card__content {
    @apply flex items-center space-x-4;
  }

  .stat-card__icon {
    @apply flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center;
  }

  .stat-card__icon--blue { @apply bg-blue-100 text-blue-600; }
  .stat-card__icon--yellow { @apply bg-yellow-100 text-yellow-600; }
  .stat-card__icon--red { @apply bg-red-100 text-red-600; }

  .stat-card__icon i {
    @apply w-6 h-6;
  }

  .stat-card__value {
    @apply text-2xl font-bold text-gray-900;
  }

  .stat-card__label {
    @apply text-sm text-gray-600;
  }

  /* Filters */
  .filters-grid {
    @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4;
  }

  .filter-item {
    @apply min-w-0;
  }

  /* Progress Cell */
  .progress-cell {
    @apply flex items-center space-x-3;
  }

  .progress-bar {
    @apply flex-1 h-2 bg-gray-200 rounded-full overflow-hidden;
  }

  .progress-bar__fill {
    @apply h-full bg-blue-500 transition-all duration-300;
  }

  .progress-text {
    @apply text-sm text-gray-600 min-w-0 flex-shrink-0;
  }

  .progress-actions {
    @apply flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity;
  }

  /* Error State */
  .error-message {
    @apply flex items-start space-x-3;
  }

  .error-icon {
    @apply flex-shrink-0 text-red-500;
  }

  .error-icon i {
    @apply w-5 h-5;
  }

  .error-content {
    @apply flex-1;
  }

  .error-title {
    @apply text-sm font-medium text-gray-900 mb-1;
  }

  .error-description {
    @apply text-sm text-gray-600 mb-3;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .page-header {
      @apply flex-col items-start space-y-4;
    }

    .task-stats {
      @apply grid-cols-1;
    }

    .filters-grid {
      @apply grid-cols-1;
    }

    .progress-cell {
      @apply flex-col items-start space-y-2 space-x-0;
    }

    .progress-bar {
      @apply w-full;
    }
  }
</style>