<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { userService, users, isLoadingUsers, userError } from '$lib/services/userService';
  import { currentUser, hasPermission } from '$lib/services/auth';
  import DataTable from '../tables/DataTable.svelte';
  import Button from '../base/Button.svelte';
  import Input from '../base/Input.svelte';
  import Select from '../base/Select.svelte';
  import Badge from '../base/Badge.svelte';
  import Card from '../base/Card.svelte';
  import type { Column } from '../tables/DataTable.svelte';
  import type { User, UserFilter } from '$lib/types';

  // Props
  export let showHeader: boolean = true;
  export let showFilters: boolean = true;
  export let showActions: boolean = true;
  export let selectable: boolean = true;
  export let compact: boolean = false;

  // Internal state
  let selectedEmployees: User[] = [];
  let searchQuery = '';
  let statusFilter = '';
  let departmentFilter = '';
  let roleFilter = '';
  let sortField = 'displayName';
  let sortDirection: 'asc' | 'desc' = 'asc';

  // Filter options
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' }
  ];

  const departmentOptions = [
    { value: '', label: 'All Departments' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'hr', label: 'Human Resources' },
    { value: 'finance', label: 'Finance' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'sales', label: 'Sales' }
  ];

  const roleOptions = [
    { value: '', label: 'All Roles' },
    { value: 'employee', label: 'Employee' },
    { value: 'manager', label: 'Manager' },
    { value: 'hr_manager', label: 'HR Manager' },
    { value: 'admin', label: 'Admin' }
  ];

  // Table columns configuration
  const columns: Column[] = [
    {
      key: 'displayName',
      label: 'Name',
      sortable: true,
      type: 'custom'
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      type: 'text'
    },
    {
      key: 'jobTitle',
      label: 'Job Title',
      sortable: true,
      type: 'text'
    },
    {
      key: 'department',
      label: 'Department',
      sortable: true,
      type: 'text',
      format: (value) => value?.name || 'N/A'
    },
    {
      key: 'isActive',
      label: 'Status',
      sortable: true,
      type: 'badge',
      badgeVariant: (value) => value ? 'success' : 'secondary'
    },
    {
      key: 'jobInfo.hireDate',
      label: 'Hire Date',
      sortable: true,
      type: 'date'
    }
  ];

  // Add actions column if permissions allow
  if (showActions && ($currentUser && (hasPermission('user:update') || hasPermission('user:delete')))) {
    columns.push({
      key: 'actions',
      label: 'Actions',
      sortable: false,
      type: 'custom',
      align: 'center',
      width: '120px'
    });
  }

  // Reactive filters
  $: filters = buildFilters();
  $: hasFiltersApplied = searchQuery || statusFilter || departmentFilter || roleFilter;

  // Load data when filters change
  $: if (filters) {
    loadEmployees();
  }

  function buildFilters(): UserFilter {
    return {
      ...(searchQuery && { searchQuery }),
      ...(statusFilter !== '' && { isActive: statusFilter === 'true' }),
      ...(departmentFilter && { departmentId: departmentFilter }),
      ...(roleFilter && { roleId: roleFilter })
    };
  }

  async function loadEmployees() {
    try {
      await userService.loadUsers({
        filters,
        sorting: { field: sortField, direction: sortDirection },
        reset: true
      });
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  }

  function handleSort(event: CustomEvent) {
    sortField = event.detail.key;
    sortDirection = event.detail.direction;
    loadEmployees();
  }

  function handleRowClick(event: CustomEvent) {
    const { row } = event.detail;
    goto(`/employees/${row.id}`);
  }

  function handleSelectionChange(event: CustomEvent) {
    selectedEmployees = event.detail;
  }

  function clearFilters() {
    searchQuery = '';
    statusFilter = '';
    departmentFilter = '';
    roleFilter = '';
  }

  function handleBulkAction(action: string) {
    if (selectedEmployees.length === 0) return;

    switch (action) {
      case 'activate':
        // TODO: Implement bulk activation
        console.log('Bulk activate:', selectedEmployees);
        break;
      case 'deactivate':
        // TODO: Implement bulk deactivation
        console.log('Bulk deactivate:', selectedEmployees);
        break;
      case 'export':
        // TODO: Implement export
        console.log('Export:', selectedEmployees);
        break;
    }
  }

  function getEmployeeInitials(employee: User): string {
    return `${employee.firstName?.charAt(0) || ''}${employee.lastName?.charAt(0) || ''}`;
  }

  function getStatusText(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }

  onMount(() => {
    loadEmployees();
  });
</script>

<div class="employee-list">
  {#if showHeader}
    <div class="employee-list__header">
      <div class="employee-list__title">
        <h1 class="text-2xl font-bold text-gray-900">Employees</h1>
        <p class="mt-1 text-sm text-gray-600">
          Manage your organization's employees and their information.
        </p>
      </div>

      <div class="employee-list__actions">
        {#if $currentUser && hasPermission('user:create')}
          <Button
            variant="primary"
            leftIcon="plus"
            on:click={() => goto('/employees/new')}
          >
            Add Employee
          </Button>
        {/if}
      </div>
    </div>
  {/if}

  {#if showFilters}
    <Card padding="md" class="employee-list__filters">
      <div class="filter-grid">
        <div class="filter-item">
          <Input
            type="search"
            placeholder="Search employees..."
            leftIcon="search"
            bind:value={searchQuery}
            on:input={() => loadEmployees()}
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
            options={departmentOptions}
            bind:value={departmentFilter}
            placeholder="Filter by department"
          />
        </div>

        <div class="filter-item">
          <Select
            options={roleOptions}
            bind:value={roleFilter}
            placeholder="Filter by role"
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
  {/if}

  {#if selectedEmployees.length > 0}
    <Card padding="sm" class="employee-list__bulk-actions">
      <div class="bulk-actions">
        <span class="bulk-actions__count">
          {selectedEmployees.length} employee{selectedEmployees.length === 1 ? '' : 's'} selected
        </span>

        <div class="bulk-actions__buttons">
          {#if $currentUser && hasPermission('user:update')}
            <Button
              variant="secondary"
              size="sm"
              leftIcon="check"
              on:click={() => handleBulkAction('activate')}
            >
              Activate
            </Button>

            <Button
              variant="secondary"
              size="sm"
              leftIcon="x"
              on:click={() => handleBulkAction('deactivate')}
            >
              Deactivate
            </Button>
          {/if}

          <Button
            variant="secondary"
            size="sm"
            leftIcon="download"
            on:click={() => handleBulkAction('export')}
          >
            Export
          </Button>
        </div>
      </div>
    </Card>
  {/if}

  <Card padding="none" class="employee-list__table">
    <DataTable
      data={$users}
      {columns}
      loading={$isLoadingUsers}
      {selectable}
      {compact}
      hoverable={true}
      currentSort={{ key: sortField, direction: sortDirection }}
      bind:selectedRows={selectedEmployees}
      emptyMessage="No employees found"
      on:sort={handleSort}
      on:rowClick={handleRowClick}
      on:selectionChange={handleSelectionChange}
    >
      <svelte:fragment slot="cell" let:column let:value let:row>
        {#if column.key === 'displayName'}
          <div class="employee-avatar-cell">
            <div class="employee-avatar">
              {#if row.profileImage}
                <img src={row.profileImage} alt={row.displayName} />
              {:else}
                <span class="employee-initials">
                  {getEmployeeInitials(row)}
                </span>
              {/if}
            </div>
            <div class="employee-info">
              <div class="employee-name">{row.displayName}</div>
              {#if row.jobTitle}
                <div class="employee-title">{row.jobTitle}</div>
              {/if}
            </div>
          </div>
        {:else if column.key === 'isActive'}
          <Badge
            variant={row.isActive ? 'success' : 'secondary'}
            size="sm"
          >
            {getStatusText(row.isActive)}
          </Badge>
        {:else if column.key === 'actions'}
          <div class="action-buttons">
            {#if $currentUser && hasPermission('user:update')}
              <Button
                variant="ghost"
                size="xs"
                iconOnly
                leftIcon="edit"
                on:click={(e) => {
                  e.stopPropagation();
                  goto(`/employees/${row.id}/edit`);
                }}
              />
            {/if}

            {#if $currentUser && hasPermission('user:delete')}
              <Button
                variant="ghost"
                size="xs"
                iconOnly
                leftIcon="trash-2"
                on:click={(e) => {
                  e.stopPropagation();
                  // TODO: Show delete confirmation modal
                  console.log('Delete employee:', row);
                }}
              />
            {/if}
          </div>
        {/if}
      </svelte:fragment>
    </DataTable>
  </Card>

  {#if $userError}
    <Card padding="md" class="employee-list__error">
      <div class="error-message">
        <div class="error-icon">
          <i class="icon-alert-circle"></i>
        </div>
        <div class="error-content">
          <h3 class="error-title">Error Loading Employees</h3>
          <p class="error-description">{$userError}</p>
          <Button
            variant="secondary"
            size="sm"
            leftIcon="refresh-cw"
            on:click={() => loadEmployees()}
          >
            Retry
          </Button>
        </div>
      </div>
    </Card>
  {/if}
</div>

<style lang="postcss">
  .employee-list {
    @apply space-y-6;
  }

  /* Header */
  .employee-list__header {
    @apply flex items-start justify-between;
  }

  .employee-list__title h1 {
    @apply text-2xl font-bold text-gray-900;
  }

  .employee-list__title p {
    @apply mt-1 text-sm text-gray-600;
  }

  .employee-list__actions {
    @apply flex items-center space-x-3;
  }

  /* Filters */
  .filter-grid {
    @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4;
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

  /* Employee Avatar Cell */
  .employee-avatar-cell {
    @apply flex items-center space-x-3;
  }

  .employee-avatar {
    @apply flex-shrink-0 w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden;
  }

  .employee-avatar img {
    @apply w-full h-full object-cover;
  }

  .employee-initials {
    @apply text-sm font-medium text-gray-700;
  }

  .employee-info {
    @apply min-w-0 flex-1;
  }

  .employee-name {
    @apply text-sm font-medium text-gray-900 truncate;
  }

  .employee-title {
    @apply text-xs text-gray-500 truncate;
  }

  /* Action Buttons */
  .action-buttons {
    @apply flex items-center space-x-1;
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
    @apply text-sm font-medium text-gray-900;
  }

  .error-description {
    @apply mt-1 text-sm text-gray-600;
  }

  .error-content button {
    @apply mt-3;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .employee-list__header {
      @apply flex-col items-start space-y-4;
    }

    .filter-grid {
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