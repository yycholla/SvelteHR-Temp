<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentUser, hasPermission } from '$lib/services/auth';
  import { 
    leaveService, 
    myLeaveRequests, 
    pendingLeaveRequests,
    isLoadingLeave, 
    leaveError 
  } from '$lib/services/leaveService';
  import DataTable from '$lib/components/tables/DataTable.svelte';
  import Button from '$lib/components/base/Button.svelte';
  import Input from '$lib/components/base/Input.svelte';
  import Select from '$lib/components/base/Select.svelte';
  import Badge from '$lib/components/base/Badge.svelte';
  import Card from '$lib/components/base/Card.svelte';
  import type { Column } from '$lib/components/tables/DataTable.svelte';
  import type { LeaveRequest, LeaveType, LeaveStatus } from '$lib/types';

  // View mode
  let viewMode: 'my' | 'all' | 'pending' = 'my';
  
  // Filter state
  let searchQuery = '';
  let statusFilter = '';
  let typeFilter = '';
  let sortField = 'createdAt';
  let sortDirection: 'asc' | 'desc' = 'desc';
  let selectedRequests: LeaveRequest[] = [];

  // Filter options
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'VACATION', label: 'Vacation' },
    { value: 'SICK', label: 'Sick Leave' },
    { value: 'PERSONAL', label: 'Personal' },
    { value: 'MATERNITY', label: 'Maternity' },
    { value: 'PATERNITY', label: 'Paternity' },
    { value: 'BEREAVEMENT', label: 'Bereavement' },
    { value: 'OTHER', label: 'Other' }
  ];

  // Table columns
  const columns: Column[] = [
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      type: 'badge',
      badgeVariant: (value) => getTypeVariant(value)
    },
    {
      key: 'startDate',
      label: 'Start Date',
      sortable: true,
      type: 'date'
    },
    {
      key: 'endDate',
      label: 'End Date',
      sortable: true,
      type: 'date'
    },
    {
      key: 'totalDays',
      label: 'Days',
      sortable: true,
      type: 'number'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      type: 'badge',
      badgeVariant: (value) => getStatusVariant(value)
    },
    {
      key: 'createdAt',
      label: 'Submitted',
      sortable: true,
      type: 'date'
    }
  ];

  // Add employee column for managers/HR
  if (viewMode !== 'my' && $currentUser && hasPermission('leave:view_all')) {
    columns.unshift({
      key: 'employee',
      label: 'Employee',
      sortable: true,
      type: 'text',
      format: (value) => value?.displayName || 'Unknown'
    });
  }

  // Computed values
  $: currentRequests = getCurrentRequests();
  $: canViewAll = $currentUser && hasPermission('leave:view_all');
  $: canApprove = $currentUser && hasPermission('leave:approve');

  function getCurrentRequests() {
    switch (viewMode) {
      case 'my':
        return $myLeaveRequests;
      case 'pending':
        return $pendingLeaveRequests;
      case 'all':
        // Would need to implement this in the service
        return $myLeaveRequests;
      default:
        return [];
    }
  }

  function getTypeVariant(type: LeaveType): string {
    const variants = {
      VACATION: 'primary',
      SICK: 'warning',
      PERSONAL: 'secondary',
      MATERNITY: 'success',
      PATERNITY: 'success',
      BEREAVEMENT: 'dark',
      OTHER: 'secondary'
    };
    return variants[type] || 'secondary';
  }

  function getStatusVariant(status: LeaveStatus): string {
    const variants = {
      PENDING: 'warning',
      APPROVED: 'success',
      REJECTED: 'danger',
      CANCELLED: 'secondary'
    };
    return variants[status] || 'secondary';
  }

  function handleViewModeChange(mode: 'my' | 'all' | 'pending') {
    viewMode = mode;
    loadRequests();
  }

  async function loadRequests() {
    try {
      switch (viewMode) {
        case 'my':
          await leaveService.loadMyLeaveRequests();
          break;
        case 'pending':
          if (canApprove) {
            await leaveService.loadPendingLeaveRequests();
          }
          break;
        case 'all':
          if (canViewAll) {
            // TODO: Implement loadAllLeaveRequests
            await leaveService.loadMyLeaveRequests();
          }
          break;
      }
    } catch (error) {
      console.error('Failed to load leave requests:', error);
    }
  }

  function handleSort(event: CustomEvent) {
    sortField = event.detail.key;
    sortDirection = event.detail.direction;
    loadRequests();
  }

  function handleRowClick(event: CustomEvent) {
    const { row } = event.detail;
    goto(`/leave/requests/${row.id}`);
  }

  function handleSelectionChange(event: CustomEvent) {
    selectedRequests = event.detail;
  }

  function handleBulkAction(action: string) {
    if (selectedRequests.length === 0) return;

    switch (action) {
      case 'approve':
        // TODO: Implement bulk approval
        console.log('Bulk approve:', selectedRequests);
        break;
      case 'reject':
        // TODO: Implement bulk rejection
        console.log('Bulk reject:', selectedRequests);
        break;
      case 'cancel':
        // TODO: Implement bulk cancellation
        console.log('Bulk cancel:', selectedRequests);
        break;
    }
  }

  function getViewModeTitle(): string {
    switch (viewMode) {
      case 'my':
        return 'My Leave Requests';
      case 'pending':
        return 'Pending Approvals';
      case 'all':
        return 'All Leave Requests';
      default:
        return 'Leave Requests';
    }
  }

  onMount(() => {
    loadRequests();
  });
</script>

<svelte:head>
  <title>Leave Requests - MountainHR</title>
  <meta name="description" content="View and manage leave requests" />
</svelte:head>

<div class="leave-requests-page">
  <!-- Page Header -->
  <div class="page-header">
    <div class="page-header__content">
      <h1 class="page-header__title">{getViewModeTitle()}</h1>
      <p class="page-header__subtitle">
        View and manage leave requests and time off.
      </p>
    </div>

    <div class="page-header__actions">
      <Button
        variant="primary"
        leftIcon="calendar-plus"
        on:click={() => goto('/leave/new')}
      >
        Request Leave
      </Button>
    </div>
  </div>

  <!-- View Mode Tabs -->
  <div class="view-mode-tabs">
    <button
      class="tab-button"
      class:tab-button--active={viewMode === 'my'}
      on:click={() => handleViewModeChange('my')}
    >
      <i class="icon-user"></i>
      My Requests
    </button>

    {#if canApprove}
      <button
        class="tab-button"
        class:tab-button--active={viewMode === 'pending'}
        on:click={() => handleViewModeChange('pending')}
      >
        <i class="icon-clock"></i>
        Pending Approvals
        {#if $pendingLeaveRequests.length > 0}
          <Badge variant="warning" size="sm">{$pendingLeaveRequests.length}</Badge>
        {/if}
      </button>
    {/if}

    {#if canViewAll}
      <button
        class="tab-button"
        class:tab-button--active={viewMode === 'all'}
        on:click={() => handleViewModeChange('all')}
      >
        <i class="icon-list"></i>
        All Requests
      </button>
    {/if}
  </div>

  <!-- Filters -->
  <Card padding="md" class="filters-card">
    <div class="filters-grid">
      <div class="filter-item">
        <Input
          type="search"
          placeholder="Search requests..."
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
          options={typeOptions}
          bind:value={typeFilter}
          placeholder="Filter by type"
        />
      </div>

      {#if searchQuery || statusFilter || typeFilter}
        <div class="filter-item">
          <Button
            variant="ghost"
            size="sm"
            leftIcon="x"
            on:click={() => {
              searchQuery = '';
              statusFilter = '';
              typeFilter = '';
            }}
          >
            Clear Filters
          </Button>
        </div>
      {/if}
    </div>
  </Card>

  <!-- Bulk Actions -->
  {#if selectedRequests.length > 0 && (canApprove || viewMode === 'my')}
    <Card padding="sm" class="bulk-actions-card">
      <div class="bulk-actions">
        <span class="bulk-actions__count">
          {selectedRequests.length} request{selectedRequests.length === 1 ? '' : 's'} selected
        </span>

        <div class="bulk-actions__buttons">
          {#if canApprove && viewMode === 'pending'}
            <Button
              variant="success"
              size="sm"
              leftIcon="check"
              on:click={() => handleBulkAction('approve')}
            >
              Approve
            </Button>

            <Button
              variant="danger"
              size="sm"
              leftIcon="x"
              on:click={() => handleBulkAction('reject')}
            >
              Reject
            </Button>
          {/if}

          {#if viewMode === 'my'}
            <Button
              variant="secondary"
              size="sm"
              leftIcon="x-circle"
              on:click={() => handleBulkAction('cancel')}
            >
              Cancel
            </Button>
          {/if}
        </div>
      </div>
    </Card>
  {/if}

  <!-- Requests Table -->
  <Card padding="none" class="requests-table">
    <DataTable
      data={currentRequests}
      {columns}
      loading={$isLoadingLeave}
      selectable={true}
      hoverable={true}
      currentSort={{ key: sortField, direction: sortDirection }}
      bind:selectedRows={selectedRequests}
      emptyMessage="No leave requests found"
      on:sort={handleSort}
      on:rowClick={handleRowClick}
      on:selectionChange={handleSelectionChange}
    />
  </Card>

  <!-- Error State -->
  {#if $leaveError}
    <Card padding="md" class="error-card">
      <div class="error-message">
        <div class="error-icon">
          <i class="icon-alert-circle"></i>
        </div>
        <div class="error-content">
          <h3 class="error-title">Error Loading Requests</h3>
          <p class="error-description">{$leaveError}</p>
          <Button
            variant="secondary"
            size="sm"
            leftIcon="refresh-cw"
            on:click={loadRequests}
          >
            Retry
          </Button>
        </div>
      </div>
    </Card>
  {/if}
</div>

<style lang="postcss">
  .leave-requests-page {
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

  /* View Mode Tabs */
  .view-mode-tabs {
    @apply flex items-center space-x-1 bg-gray-100 p-1 rounded-lg;
  }

  .tab-button {
    @apply flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 rounded-md transition-all duration-200;
  }

  .tab-button:hover {
    @apply text-gray-900 bg-white;
  }

  .tab-button--active {
    @apply text-blue-700 bg-white shadow-sm;
  }

  .tab-button i {
    @apply w-4 h-4;
  }

  /* Filters */
  .filters-grid {
    @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4;
  }

  .filter-item {
    @apply min-w-0;
  }

  /* Bulk Actions */
  .bulk-actions {
    @apply flex items-center justify-between bg-blue-50 px-4 py-3 border-b border-blue-200;
  }

  .bulk-actions__count {
    @apply text-sm font-medium text-blue-900;
  }

  .bulk-actions__buttons {
    @apply flex items-center space-x-2;
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

    .view-mode-tabs {
      @apply flex-col space-x-0 space-y-1 bg-transparent p-0;
    }

    .tab-button {
      @apply w-full justify-start bg-gray-100;
    }

    .tab-button--active {
      @apply bg-blue-100 text-blue-700;
    }

    .filters-grid {
      @apply grid-cols-1;
    }

    .bulk-actions {
      @apply flex-col items-start space-y-3 px-3 py-4;
    }

    .bulk-actions__buttons {
      @apply w-full justify-start;
    }
  }
</style>