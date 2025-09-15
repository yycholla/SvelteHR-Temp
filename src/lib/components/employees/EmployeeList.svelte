<script lang="ts">
  import { onMount } from 'svelte';
  import { query } from '@urql/svelte';
  import { GET_EMPLOYEES_LIST } from '$lib/graphql/hasura-operations';
  import { currentUser, hasPermission } from '$lib/stores/auth';
  import RoleGuard from '$lib/components/auth/RoleGuard.svelte';

  /**
   * Employee List Component
   * Main interface for browsing, searching, and managing employees
   */

  interface Props {
    initialFilters?: EmployeeFilters;
    compactView?: boolean;
    showFilters?: boolean;
    showAddButton?: boolean;
    maxHeight?: string;
  }

  interface EmployeeFilters {
    search?: string;
    department?: string;
    role?: string;
    status?: string;
    manager?: string;
  }

  interface Employee {
    id: string;
    email: string;
    displayName: string;
    jobTitle?: string;
    onboardingStatus: string;
    createdAt: string;
    lastLoginAt?: string;
    departmentId?: string;
    managerId?: string;
    roles: Array<{ role: string }>;
    department?: { id: string; name: string };
    manager?: { id: string; displayName: string; email: string };
    directReports: { aggregate: { count: number } };
  }

  let {
    initialFilters = {},
    compactView = false,
    showFilters = true,
    showAddButton = true,
    maxHeight = '600px'
  }: Props = $props();

  // State
  let filters: EmployeeFilters = { ...initialFilters };
  let currentPage = 1;
  let itemsPerPage = 20;
  let viewMode: 'grid' | 'list' = 'grid';
  let selectedEmployees: string[] = $state([]);

  // Build GraphQL variables
  $: variables = $derived(() => {
    const where: any = {};
    
    // Search filter
    if (filters.search) {
      where._or = [
        { displayName: { _ilike: `%${filters.search}%` } },
        { email: { _ilike: `%${filters.search}%` } },
        { jobTitle: { _ilike: `%${filters.search}%` } }
      ];
    }

    // Department filter
    if (filters.department) {
      where.departmentId = { _eq: filters.department };
    }

    // Status filter
    if (filters.status) {
      where.onboardingStatus = { _eq: filters.status };
    }

    // Role filter
    if (filters.role) {
      where.user_roles = { role: { _eq: filters.role } };
    }

    // Manager filter
    if (filters.manager) {
      where.managerId = { _eq: filters.manager };
    }

    // Only show non-terminated users for regular views
    if (!filters.status || filters.status !== 'terminated') {
      where.onboardingStatus = { _neq: 'terminated' };
    }

    return {
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
      where,
      orderBy: [{ displayName: 'asc' }]
    };
  });

  // Execute query
  const employeesQuery = query(GET_EMPLOYEES_LIST, variables);
  $: employees = $employeesQuery.data?.users || [];
  $: totalCount = $employeesQuery.data?.users_aggregate?.aggregate?.count || 0;
  $: totalPages = Math.ceil(totalCount / itemsPerPage);

  // Handle filter changes
  const handleFiltersChange = (newFilters: EmployeeFilters) => {
    filters = { ...newFilters };
    currentPage = 1; // Reset to first page
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    currentPage = page;
  };

  // Handle selection
  const toggleSelection = (employeeId: string) => {
    if (selectedEmployees.includes(employeeId)) {
      selectedEmployees = selectedEmployees.filter(id => id !== employeeId);
    } else {
      selectedEmployees = [...selectedEmployees, employeeId];
    }
  };

  const selectAll = () => {
    selectedEmployees = employees.map((emp: Employee) => emp.id);
  };

  const clearSelection = () => {
    selectedEmployees = [];
  };

  // Bulk actions
  const handleBulkAction = (action: string) => {
    switch (action) {
      case 'export':
        exportSelected();
        break;
      case 'deactivate':
        deactivateSelected();
        break;
      default:
        console.log(`Bulk action: ${action} for`, selectedEmployees);
    }
  };

  const exportSelected = () => {
    // TODO: Implement export functionality
    console.log('Exporting employees:', selectedEmployees);
  };

  const deactivateSelected = () => {
    // TODO: Implement bulk deactivation
    console.log('Deactivating employees:', selectedEmployees);
  };

  // Refresh data
  const refresh = () => {
    $employeesQuery.rerun({ requestPolicy: 'network-only' });
  };

  onMount(() => {
    // Auto-refresh every 5 minutes
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  });
</script>

<div class="employee-list" style:max-height={maxHeight}>
  <!-- Header -->
  <div class="header">
    <div class="title-section">
      <h2 class="title">
        Employees 
        {#if totalCount > 0}
          <span class="count">({totalCount})</span>
        {/if}
      </h2>
      
      {#if selectedEmployees.length > 0}
        <div class="selection-info">
          <span>{selectedEmployees.length} selected</span>
          <button class="clear-selection" onclick={clearSelection}>
            Clear
          </button>
        </div>
      {/if}
    </div>

    <div class="actions">
      <!-- View mode toggle -->
      <div class="view-toggle">
        <button 
          class="view-btn"
          class:active={viewMode === 'grid'}
          onclick={() => viewMode = 'grid'}
          title="Grid view"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/>
          </svg>
        </button>
        <button 
          class="view-btn"
          class:active={viewMode === 'list'}
          onclick={() => viewMode = 'list'}
          title="List view"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 2.5A.5.5 0 0 1 1.5 2h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm0 3A.5.5 0 0 1 1.5 5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm0 3A.5.5 0 0 1 1.5 8h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5z"/>
          </svg>
        </button>
      </div>

      <!-- Add employee button -->
      {#if showAddButton}
        <RoleGuard permissions={['hr:manage', 'admin:*']}>
          <button class="btn-primary add-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a.5.5 0 0 1 .5.5v7h7a.5.5 0 0 1 0 1h-7v7a.5.5 0 0 1-1 0v-7h-7a.5.5 0 0 1 0-1h7v-7A.5.5 0 0 1 8 0z"/>
            </svg>
            Add Employee
          </button>
        </RoleGuard>
      {/if}

      <!-- Refresh button -->
      <button 
        class="btn-secondary refresh-btn" 
        onclick={refresh}
        disabled={$employeesQuery.fetching}
        title="Refresh data"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class:spinning={$employeesQuery.fetching}>
          <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
          <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- Loading state -->
  {#if $employeesQuery.fetching && !$employeesQuery.data}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading employees...</p>
    </div>
  {/if}

  <!-- Error state -->
  {#if $employeesQuery.error}
    <div class="error-container">
      <h3>Failed to load employees</h3>
      <p>{$employeesQuery.error.message}</p>
      <button class="btn-secondary" onclick={refresh}>
        Try Again
      </button>
    </div>
  {/if}

  <!-- Employee grid/list -->
  {#if !$employeesQuery.fetching && !$employeesQuery.error && employees.length === 0}
    <div class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
          <path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
        </svg>
      </div>
      <h3>No employees found</h3>
      <p>
        {#if Object.values(filters).some(Boolean)}
          Try adjusting your filters or search terms.
        {:else}
          Get started by adding your first employee.
        {/if}
      </p>
    </div>
  {:else if employees.length > 0}
    <!-- Employee cards/rows -->
    <div class="employee-container" class:grid-view={viewMode === 'grid'} class:list-view={viewMode === 'list'}>
      {#each employees as employee (employee.id)}
        <div class="employee-card">
          <div class="employee-info">
            <div class="employee-avatar">
              {employee.displayName?.charAt(0) || '?'}
            </div>
            <div class="employee-details">
              <h4 class="employee-name">{employee.displayName}</h4>
              <p class="employee-email">{employee.email}</p>
              {#if employee.jobTitle}
                <p class="employee-title">{employee.jobTitle}</p>
              {/if}
              {#if employee.department}
                <p class="employee-department">{employee.department.name}</p>
              {/if}
              <div class="employee-status status-{employee.onboardingStatus}">
                {employee.onboardingStatus}
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Simple pagination -->
    {#if totalPages > 1}
      <div class="pagination">
        <button 
          class="btn-secondary" 
          disabled={currentPage === 1}
          onclick={() => handlePageChange(currentPage - 1)}
        >
          Previous
        </button>
        <span class="page-info">
          Page {currentPage} of {totalPages} ({totalCount} total)
        </span>
        <button 
          class="btn-secondary" 
          disabled={currentPage === totalPages}
          onclick={() => handlePageChange(currentPage + 1)}
        >
          Next
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .employee-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .title-section {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #111827;
  }

  .count {
    font-weight: 400;
    color: #6b7280;
    font-size: 1rem;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .view-toggle {
    display: flex;
    background-color: #f3f4f6;
    border-radius: 0.375rem;
    padding: 0.125rem;
  }

  .view-btn {
    padding: 0.375rem;
    background: none;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    color: #6b7280;
    transition: all 0.15s;
  }

  .view-btn:hover {
    color: #111827;
  }

  .view-btn.active {
    background-color: white;
    color: #111827;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }

  .btn-primary, .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-primary {
    background-color: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background-color: #2563eb;
  }

  .btn-secondary {
    background-color: white;
    color: #374151;
    border-color: #d1d5db;
  }

  .btn-secondary:hover {
    background-color: #f9fafb;
  }

  .btn-secondary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .loading-container, .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    gap: 1rem;
    color: #6b7280;
  }

  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid #e5e7eb;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
    color: #6b7280;
  }

  .empty-icon {
    color: #d1d5db;
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    margin: 0 0 0.5rem;
    color: #111827;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .empty-state p {
    margin: 0 0 1.5rem;
    max-width: 28rem;
  }

  .employee-container.grid-view {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }

  .employee-container.list-view {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .employee-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1rem;
    transition: all 0.15s;
  }

  .employee-card:hover {
    border-color: #d1d5db;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }

  .employee-info {
    display: flex;
    gap: 0.75rem;
  }

  .employee-avatar {
    width: 2.5rem;
    height: 2.5rem;
    background-color: #3b82f6;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1rem;
    flex-shrink: 0;
  }

  .employee-details {
    flex: 1;
    min-width: 0;
  }

  .employee-name {
    margin: 0 0 0.25rem;
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
  }

  .employee-email {
    margin: 0 0 0.25rem;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .employee-title, .employee-department {
    margin: 0 0 0.25rem;
    font-size: 0.875rem;
    color: #374151;
  }

  .employee-status {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .status-active {
    background-color: #dcfce7;
    color: #166534;
  }

  .status-invited {
    background-color: #fef3c7;
    color: #92400e;
  }

  .status-in_progress {
    background-color: #dbeafe;
    color: #1e40af;
  }

  .status-completed {
    background-color: #dcfce7;
    color: #166534;
  }

  .status-terminated {
    background-color: #fee2e2;
    color: #991b1b;
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    padding: 1rem 0;
  }

  .page-info {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .header {
      flex-direction: column;
      align-items: stretch;
    }

    .actions {
      justify-content: space-between;
    }

    .employee-container.grid-view {
      grid-template-columns: 1fr;
    }
  }
</style>