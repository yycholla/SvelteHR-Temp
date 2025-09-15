<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { query } from '@urql/svelte';
  import { currentUser, hasPermission, hasRole } from '$lib/stores/auth';
  import { GET_DASHBOARD_STATS } from '$lib/graphql/hasura-operations';
  import RoleGuard from '$lib/components/auth/RoleGuard.svelte';
  import EmployeeList from '$lib/components/employees/EmployeeList.svelte';

  /**
   * HR Dashboard
   * Real-time analytics and quick actions for HR management
   */

  // Execute GraphQL query for dashboard stats
  const dashboardQuery = query(GET_DASHBOARD_STATS, {});
  $: dashboardData = $dashboardQuery.data;
  $: loading = $dashboardQuery.fetching;

  // Transform GraphQL data for dashboard stats
  $: dashboardStats = $derived(() => {
    if (!dashboardData) return {};
    
    return {
      totalEmployees: dashboardData.totalEmployees?.aggregate?.count || 0,
      activeEmployees: dashboardData.activeEmployees?.aggregate?.count || 0,
      pendingOnboarding: dashboardData.pendingOnboarding?.aggregate?.count || 0,
      departmentCount: dashboardData.departmentCount?.aggregate?.count || 0
    };
  });

  // Recent hires from dashboard data
  $: recentHires = dashboardData?.recentHires || [];

  // Quick actions for different user roles
  $: quickActions = getQuickActions($currentUser);

  function getQuickActions(user: any) {
    const actions = [
      {
        title: 'View Profile',
        description: 'Update your information',
        icon: 'user',
        href: '/profile',
        variant: 'primary' as const
      },
      {
        title: 'Directory',
        description: 'Browse employees',
        icon: 'users',
        href: '/employees',
        variant: 'secondary' as const
      }
    ];

    if (user && hasRole('hr_admin')) {
      actions.push({
        title: 'Manage Employees',
        description: 'HR management tools',
        icon: 'user-cog',
        href: '/admin/employees',
        variant: 'success' as const
      });
      actions.push({
        title: 'Departments',
        description: 'Manage departments',
        icon: 'building',
        href: '/departments',
        variant: 'warning' as const
      });
    }

    if (user && hasRole('admin')) {
      actions.push({
        title: 'System Admin',
        description: 'System settings',
        icon: 'settings',
        href: '/admin',
        variant: 'danger' as const
      });
    }

    return actions;
  }

  // Utility functions for dashboard stats
  function getStatIcon(statKey: string): string {
    const icons = {
      totalEmployees: 'users',
      activeEmployees: 'user-check',
      pendingOnboarding: 'user-plus',
      departmentCount: 'building'
    };
    return icons[statKey] || 'help-circle';
  }

  function getStatColor(statKey: string): string {
    const colors = {
      totalEmployees: 'blue',
      activeEmployees: 'green',
      pendingOnboarding: 'yellow',
      departmentCount: 'purple'
    };
    return colors[statKey] || 'gray';
  }

  function formatStatLabel(statKey: string): string {
    const labels = {
      totalEmployees: 'Total Employees',
      activeEmployees: 'Active Employees', 
      pendingOnboarding: 'Pending Onboarding',
      departmentCount: 'Departments'
    };
    return labels[statKey] || statKey;
  }

  // Refresh dashboard data
  const refreshDashboard = () => {
    $dashboardQuery.rerun({ requestPolicy: 'network-only' });
  };

  onMount(() => {
    // Dashboard initialization - user data loaded by auth service
  });
</script>

<div class="dashboard">
  <div class="dashboard-header">
    <div class="welcome-section">
      <h1 class="dashboard-title">
        Welcome back, {$currentUser?.displayName || 'User'}!
      </h1>
      <p class="dashboard-subtitle">
        Here's your HR dashboard overview for today.
      </p>
    </div>

    <div class="date-section">
      <button 
        class="refresh-btn" 
        onclick={refreshDashboard}
        disabled={loading}
        title="Refresh dashboard data"
      >
        <svg class="refresh-icon" class:spinning={loading} width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
        </svg>
        Refresh
      </button>
      <span class="date-text">
        {new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </span>
    </div>
  </div>

  <!-- Loading State -->
  {#if loading && !dashboardData}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading dashboard...</p>
    </div>
  {/if}

  <!-- Error State -->
  {#if $dashboardQuery.error}
    <div class="error-container">
      <h3>Failed to load dashboard</h3>
      <p>{$dashboardQuery.error.message}</p>
      <button class="btn-primary" onclick={refreshDashboard}>
        Try Again
      </button>
    </div>
  {/if}

  <!-- Dashboard Content -->
  {#if !loading || dashboardData}
    <!-- Quick Stats -->
    <div class="stats-grid">
      {#each Object.entries(dashboardStats()) as [key, value]}
        <div class="stat-card">
          <div class="stat-content">
            <div class="stat-icon stat-icon--{getStatColor(key)}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                {#if getStatIcon(key) === 'users'}
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="m22 21-3-3m0 0a2 2 0 0 0 0-4 2 2 0 0 0 0 4z"></path>
                {:else if getStatIcon(key) === 'user-check'}
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <path d="m17 11 2 2 4-4"></path>
                {:else if getStatIcon(key) === 'user-plus'}
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" x2="20" y1="8" y2="14"></line>
                  <line x1="23" x2="17" y1="11" y2="11"></line>
                {:else if getStatIcon(key) === 'building'}
                  <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"></path>
                  <path d="M6 12H4a2 2 0 0 0-2 2v8h4"></path>
                  <path d="M18 9h2a2 2 0 0 1 2 2v11h-4"></path>
                  <path d="M10 6h4"></path>
                  <path d="M10 10h4"></path>
                  <path d="M10 14h4"></path>
                  <path d="M10 18h4"></path>
                {/if}
              </svg>
            </div>
            <div class="stat-info">
              <div class="stat-value">{value}</div>
              <div class="stat-label">{formatStatLabel(key)}</div>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions-section">
      <h2 class="section-title">Quick Actions</h2>
      <div class="actions-grid">
        {#each quickActions as action}
          <button 
            class="action-card action-card--{action.variant}" 
            onclick={() => goto(action.href)}
          >
            <div class="action-content">
              <div class="action-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  {#if action.icon === 'user'}
                    <path d="M10 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z"/>
                    <path d="M17.5 18a7.5 7.5 0 1 0-15 0h15Z"/>
                  {:else if action.icon === 'users'}
                    <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>
                    <path d="M11 14H3a1 1 0 0 0-1 1v3h20v-3a1 1 0 0 0-1-1h-8a1 1 0 0 1-1-1 1 1 0 0 1 1-1Z"/>
                  {:else if action.icon === 'user-cog'}
                    <path d="M10 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z"/>
                    <path d="M17.5 18a7.5 7.5 0 1 0-15 0h15Z"/>
                    <path d="M15 8a1 1 0 0 1 1-1h2a1 1 0 0 1 0 2h-2a1 1 0 0 1-1-1Z"/>
                  {:else if action.icon === 'building'}
                    <path d="M3 21h4V9H3v12ZM9 21h4V3H9v18ZM15 21h4v-8h-4v8Z"/>
                  {:else if action.icon === 'settings'}
                    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-1.42 3.42h-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-3.42-1.42v-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 1.42-3.42h.06a1.65 1.65 0 0 0 1.82.33H8a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 3.42 1.42v.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
                  {/if}
                </svg>
              </div>
              <div class="action-info">
                <div class="action-title">{action.title}</div>
                <div class="action-description">{action.description}</div>
              </div>
              <div class="action-arrow">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"/>
                </svg>
              </div>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Recent Hires -->
    <div class="content-section">
      <div class="content-grid">
        <div class="content-card">
          <div class="card-header">
            <h3 class="card-title">Recent Hires (30 days)</h3>
            <button class="view-all-link" onclick={() => goto('/employees')}>
              View All →
            </button>
          </div>
          <div class="card-content">
            {#if recentHires.length > 0}
              <div class="hire-list">
                {#each recentHires as hire}
                  <div class="hire-item">
                    <div class="hire-avatar">
                      {hire.displayName?.charAt(0) || '?'}
                    </div>
                    <div class="hire-info">
                      <div class="hire-name">{hire.displayName}</div>
                      <div class="hire-title">{hire.jobTitle}</div>
                      {#if hire.department}
                        <div class="hire-department">{hire.department.name}</div>
                      {/if}
                      <div class="hire-date">
                        Started: {new Date(hire.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="empty-state">
                <div class="empty-icon">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
                    <path d="M24 30a6 6 0 1 1 0-12 6 6 0 0 1 0 12Z"/>
                    <path d="M35 42v-4a8 8 0 0 0-8-8h-6a8 8 0 0 0-8 8v4h22Z"/>
                    <path d="M32 18a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/>
                    <path d="M40 30v4h6v-4h-6ZM36 28h2v8h-2v-8Z"/>
                  </svg>
                </div>
                <div class="empty-message">No new hires in the last 30 days</div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Employee Directory Preview -->
        <RoleGuard permissions={['hr:view', 'admin:*']}>
          <div class="content-card content-card--large">
            <div class="card-header">
              <h3 class="card-title">Employee Directory</h3>
              <button class="view-all-link" onclick={() => goto('/employees')}>
                Manage All →
              </button>
            </div>
            <div class="card-content">
              <EmployeeList 
                compactView={true}
                showFilters={false}
                showAddButton={false}
                maxHeight="400px"
              />
            </div>
          </div>
        </RoleGuard>
      </div>
    </div>
  {/if}
</div>

<style>
  .dashboard {
    padding: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* Header */
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .welcome-section {
    flex: 1;
  }

  .dashboard-title {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    color: #111827;
    line-height: 1.2;
  }

  .dashboard-subtitle {
    margin: 0.5rem 0 0;
    font-size: 1.125rem;
    color: #6b7280;
    line-height: 1.4;
  }

  .date-section {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    color: #374151;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .refresh-btn:hover {
    background: #e5e7eb;
  }

  .refresh-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .refresh-icon.spinning {
    animation: spin 1s linear infinite;
  }

  .date-text {
    font-size: 0.875rem;
    color: #6b7280;
    background: #f9fafb;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: 1px solid #e5e7eb;
  }

  /* Loading and Error States */
  .loading-container, .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
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

  .btn-primary {
    padding: 0.75rem 1.5rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .stat-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    transition: all 0.15s;
  }

  .stat-card:hover {
    border-color: #d1d5db;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .stat-content {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 0.75rem;
    flex-shrink: 0;
  }

  .stat-icon--blue { background: #dbeafe; color: #2563eb; }
  .stat-icon--green { background: #dcfce7; color: #16a34a; }
  .stat-icon--yellow { background: #fef3c7; color: #d97706; }
  .stat-icon--purple { background: #e9d5ff; color: #9333ea; }

  .stat-info {
    flex: 1;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #111827;
    line-height: 1;
  }

  .stat-label {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 500;
  }

  .stat-card__content {
    @apply flex items-center space-x-4;
  }

  .stat-card__icon {
    @apply flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center;
  }

  .stat-card__icon--blue { @apply bg-blue-100 text-blue-600; }
  .stat-card__icon--green { @apply bg-green-100 text-green-600; }
  .stat-card__icon--purple { @apply bg-purple-100 text-purple-600; }
  .stat-card__icon--yellow { @apply bg-yellow-100 text-yellow-600; }
  .stat-card__icon--red { @apply bg-red-100 text-red-600; }
  .stat-card__icon--orange { @apply bg-orange-100 text-orange-600; }
  .stat-card__icon--cyan { @apply bg-cyan-100 text-cyan-600; }

  .stat-card__icon i {
    @apply w-6 h-6;
  }

  .stat-card__value {
    @apply text-2xl font-bold text-gray-900;
  }

  .stat-card__label {
    @apply text-sm text-gray-600;
  }

  /* Section Headers */
  .dashboard__section {
    @apply space-y-4;
  }

  .dashboard__section-title {
    @apply text-xl font-semibold text-gray-900;
  }

  /* Quick Actions */
  .quick-actions {
    @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4;
  }

  .action-card__content {
    @apply flex items-center space-x-4 cursor-pointer;
  }

  .action-card__icon {
    @apply flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center;
  }

  .action-card__icon--primary { @apply bg-blue-100 text-blue-600; }
  .action-card__icon--secondary { @apply bg-gray-100 text-gray-600; }
  .action-card__icon--success { @apply bg-green-100 text-green-600; }
  .action-card__icon--warning { @apply bg-yellow-100 text-yellow-600; }

  .action-card__icon i {
    @apply w-5 h-5;
  }

  .action-card__info {
    @apply flex-1;
  }

  .action-card__title {
    @apply text-sm font-medium text-gray-900;
  }

  .action-card__description {
    @apply text-xs text-gray-600;
  }

  .action-card__arrow {
    @apply flex-shrink-0 text-gray-400;
  }

  .action-card__arrow i {
    @apply w-4 h-4;
  }

  /* Content Grid */
  .dashboard__content {
    @apply grid grid-cols-1 lg:grid-cols-2 gap-6;
  }

  .dashboard__widget--full-width {
    @apply lg:col-span-2;
  }

  /* Widget Cards */
  .widget-header {
    @apply flex items-center justify-between p-6 border-b border-gray-200;
  }

  .widget-title {
    @apply text-lg font-semibold text-gray-900 flex items-center space-x-2;
  }

  .widget-content {
    @apply min-h-48;
  }

  /* Notification List */
  .notification-list {
    @apply divide-y divide-gray-200;
  }

  .notification-item {
    @apply flex items-start space-x-3 p-4 hover:bg-gray-50 cursor-pointer relative;
  }

  .notification-item--unread {
    @apply bg-blue-50;
  }

  .notification-item__icon {
    @apply flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center;
  }

  .notification-item__icon i {
    @apply w-4 h-4 text-gray-500;
  }

  .notification-item__content {
    @apply flex-1 min-w-0;
  }

  .notification-item__title {
    @apply text-sm font-medium text-gray-900 truncate;
  }

  .notification-item__message {
    @apply text-sm text-gray-600 mt-1 line-clamp-2;
  }

  .notification-item__time {
    @apply text-xs text-gray-400 mt-1;
  }

  .notification-item__dot {
    @apply absolute top-4 right-4 w-2 h-2 bg-blue-600 rounded-full;
  }

  /* Empty State */
  .empty-state {
    @apply flex flex-col items-center justify-center py-12 text-gray-500;
  }

  .empty-state__icon i {
    @apply w-12 h-12 mb-4;
  }

  .empty-state__message {
    @apply text-sm;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .dashboard__header {
      @apply flex-col space-y-4 items-start;
    }

    .dashboard__stats {
      @apply grid-cols-2;
    }

    .quick-actions {
      @apply grid-cols-1;
    }

    .dashboard__content {
      @apply grid-cols-1;
    }

    .dashboard__widget--full-width {
      @apply col-span-1;
    }
  }

  /* Task List */
  .task-list {
    @apply divide-y divide-gray-200;
  }

  .task-item {
    @apply flex items-center justify-between p-4 hover:bg-gray-50;
  }

  .task-item__content {
    @apply flex-1;
  }

  .task-item__title {
    @apply text-sm font-medium text-gray-900;
  }

  .task-item__meta {
    @apply flex items-center space-x-3 mt-1;
  }

  .task-item__priority {
    @apply text-xs px-2 py-1 rounded-full;
  }

  .priority--high {
    @apply bg-red-100 text-red-800;
  }

  .priority--medium {
    @apply bg-yellow-100 text-yellow-800;
  }

  .priority--low {
    @apply bg-green-100 text-green-800;
  }

  .task-item__date {
    @apply text-xs text-gray-500;
  }

  .task-item__status {
    @apply text-xs px-2 py-1 rounded-full;
  }

  .status--in-progress {
    @apply bg-blue-100 text-blue-800;
  }

  .status--pending {
    @apply bg-yellow-100 text-yellow-800;
  }

  .status--completed {
    @apply bg-green-100 text-green-800;
  }

  .status--approved {
    @apply bg-green-100 text-green-800;
  }

  /* Leave List */
  .leave-list {
    @apply divide-y divide-gray-200;
  }

  .leave-item {
    @apply flex items-center justify-between p-4 hover:bg-gray-50;
  }

  .leave-item__content {
    @apply flex-1;
  }

  .leave-item__title {
    @apply text-sm font-medium text-gray-900;
  }

  .leave-item__dates {
    @apply text-xs text-gray-500 mt-1;
  }

  .leave-item__status {
    @apply text-xs px-2 py-1 rounded-full;
  }

  /* Line clamp utility */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>