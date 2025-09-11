<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentUser, hasPermission } from '$lib/services/auth';
  import { 
    userService, 
    users, 
    getActiveUserCount, 
    getNewHiresCount 
  } from '$lib/services/userService';
  import { 
    taskService, 
    myTasks, 
    assignedTasks, 
    getOverdueTasks,
    getTasksCompletedThisWeek 
  } from '$lib/services/taskService';
  import { 
    leaveService, 
    myLeaveRequests,
    pendingLeaveRequests,
    getUpcomingLeaves 
  } from '$lib/services/leaveService';
  import { 
    attendanceService, 
    getTodaysAttendanceStats,
    getWeeklyAttendanceStats 
  } from '$lib/services/attendanceService';
  import { 
    notificationService, 
    unreadNotifications, 
    unreadCount 
  } from '$lib/services/notificationService';
  import Card from '$lib/components/base/Card.svelte';
  import Button from '$lib/components/base/Button.svelte';
  import Badge from '$lib/components/base/Badge.svelte';
  import DataTable from '$lib/components/tables/DataTable.svelte';
  import type { Column } from '$lib/components/tables/DataTable.svelte';
  import type { Task, LeaveRequest, Notification, AttendanceStats } from '$lib/types';

  // Dashboard stats
  let dashboardStats = {
    totalEmployees: 0,
    activeEmployees: 0,
    newHires: 0,
    myTasks: 0,
    overdueTasks: 0,
    pendingLeaveRequests: 0,
    todaysAttendance: 0,
    weeklyTasksCompleted: 0
  };

  let attendanceStats: AttendanceStats | null = null;
  let loading = true;

  // Quick actions for different user roles
  $: quickActions = getQuickActions($currentUser);

  function getQuickActions(user: any) {
    const actions = [
      {
        title: 'Submit Leave Request',
        description: 'Request time off',
        icon: 'calendar-plus',
        href: '/leave/new',
        variant: 'primary' as const
      },
      {
        title: 'View My Tasks',
        description: 'Check assigned tasks',
        icon: 'check-square',
        href: '/tasks/my',
        variant: 'secondary' as const
      }
    ];

    if (user && hasPermission('user:create')) {
      actions.push({
        title: 'Add Employee',
        description: 'Create new employee',
        icon: 'user-plus',
        href: '/employees/new',
        variant: 'success' as const
      });
    }

    if (user && hasPermission('hr_request:process')) {
      actions.push({
        title: 'HR Requests',
        description: 'Process requests',
        icon: 'clipboard-list',
        href: '/hr-requests/assigned',
        variant: 'warning' as const
      });
    }

    return actions;
  }

  // Table configurations
  const taskColumns: Column[] = [
    { key: 'title', label: 'Task', sortable: true, type: 'text' },
    { key: 'priority', label: 'Priority', sortable: true, type: 'badge' },
    { key: 'dueDate', label: 'Due Date', sortable: true, type: 'date' },
    { key: 'status', label: 'Status', sortable: true, type: 'badge' }
  ];

  const leaveColumns: Column[] = [
    { key: 'type', label: 'Type', sortable: true, type: 'text' },
    { key: 'startDate', label: 'Start Date', sortable: true, type: 'date' },
    { key: 'endDate', label: 'End Date', sortable: true, type: 'date' },
    { key: 'status', label: 'Status', sortable: true, type: 'badge' }
  ];

  const notificationColumns: Column[] = [
    { key: 'title', label: 'Title', sortable: true, type: 'text' },
    { key: 'message', label: 'Message', sortable: false, type: 'text' },
    { key: 'createdAt', label: 'Date', sortable: true, type: 'date' }
  ];

  async function loadDashboardData() {
    try {
      loading = true;

      // Load basic data in parallel
      const [
        usersResult,
        myTasksResult,
        myLeaveResult,
        notificationsResult
      ] = await Promise.allSettled([
        userService.loadUsers({ reset: true }),
        taskService.loadMyTasks(),
        leaveService.loadMyLeaveRequests(),
        notificationService.loadNotifications({ reset: true })
      ]);

      // Update dashboard stats
      dashboardStats = {
        totalEmployees: userService.getTotalUsers(),
        activeEmployees: userService.getActiveUserCount(),
        newHires: userService.getNewHiresCount(30),
        myTasks: $myTasks.filter(t => t.status !== 'COMPLETED').length,
        overdueTasks: getOverdueTasks().length,
        pendingLeaveRequests: $pendingLeaveRequests.length,
        todaysAttendance: 0, // Will be updated below
        weeklyTasksCompleted: getTasksCompletedThisWeek().length
      };

      // Load attendance stats if user has permission
      if ($currentUser && hasPermission('attendance:view_team')) {
        try {
          attendanceStats = await getTodaysAttendanceStats();
          dashboardStats.todaysAttendance = attendanceStats?.presentCount || 0;
        } catch (error) {
          console.error('Failed to load attendance stats:', error);
        }
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      loading = false;
    }
  }

  function handleTaskRowClick(event: CustomEvent) {
    const { row } = event.detail;
    goto(`/tasks/${row.id}`);
  }

  function handleLeaveRowClick(event: CustomEvent) {
    const { row } = event.detail;
    goto(`/leave/requests/${row.id}`);
  }

  function handleNotificationClick(notification: Notification) {
    // Mark as read
    notificationService.markNotificationAsRead(notification.id);
    
    // Navigate if there's an action URL
    if (notification.actionUrl) {
      goto(notification.actionUrl);
    }
  }

  function getStatIcon(statKey: string): string {
    const icons = {
      totalEmployees: 'users',
      activeEmployees: 'user-check',
      newHires: 'user-plus',
      myTasks: 'check-square',
      overdueTasks: 'alert-triangle',
      pendingLeaveRequests: 'calendar-x',
      todaysAttendance: 'clock',
      weeklyTasksCompleted: 'trending-up'
    };
    return icons[statKey] || 'help-circle';
  }

  function getStatColor(statKey: string): string {
    const colors = {
      totalEmployees: 'blue',
      activeEmployees: 'green',
      newHires: 'purple',
      myTasks: 'yellow',
      overdueTasks: 'red',
      pendingLeaveRequests: 'orange',
      todaysAttendance: 'cyan',
      weeklyTasksCompleted: 'green'
    };
    return colors[statKey] || 'gray';
  }

  function formatStatLabel(statKey: string): string {
    const labels = {
      totalEmployees: 'Total Employees',
      activeEmployees: 'Active Employees',
      newHires: 'New Hires (30d)',
      myTasks: 'My Active Tasks',
      overdueTasks: 'Overdue Tasks',
      pendingLeaveRequests: 'Pending Leave',
      todaysAttendance: 'Present Today',
      weeklyTasksCompleted: 'Tasks Done This Week'
    };
    return labels[statKey] || statKey;
  }

  onMount(() => {
    loadDashboardData();
  });
</script>

<div class="dashboard">
  <div class="dashboard__header">
    <div class="dashboard__welcome">
      <h1 class="dashboard__title">
        Welcome back, {$currentUser?.firstName || 'User'}!
      </h1>
      <p class="dashboard__subtitle">
        Here's what's happening at your organization today.
      </p>
    </div>

    <div class="dashboard__date">
      <span class="dashboard__date-text">
        {new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </span>
    </div>
  </div>

  <!-- Quick Stats -->
  <div class="dashboard__stats">
    {#each Object.entries(dashboardStats) as [key, value]}
      {#if key !== 'todaysAttendance' || ($currentUser && hasPermission('attendance:view_team'))}
        <Card hoverable clickable padding="lg" class="stat-card">
          <div class="stat-card__content">
            <div class="stat-card__icon stat-card__icon--{getStatColor(key)}">
              <i class="icon-{getStatIcon(key)}"></i>
            </div>
            <div class="stat-card__info">
              <div class="stat-card__value">{value}</div>
              <div class="stat-card__label">{formatStatLabel(key)}</div>
            </div>
          </div>
        </Card>
      {/if}
    {/each}
  </div>

  <!-- Quick Actions -->
  <div class="dashboard__section">
    <h2 class="dashboard__section-title">Quick Actions</h2>
    <div class="quick-actions">
      {#each quickActions as action}
        <Card hoverable clickable padding="lg" class="action-card">
          <div 
            class="action-card__content" 
            on:click={() => goto(action.href)}
            on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? goto(action.href) : null}
            role="button"
            tabindex="0"
            aria-label="{action.title} - {action.description}"
          >
            <div class="action-card__icon action-card__icon--{action.variant}">
              <i class="icon-{action.icon}"></i>
            </div>
            <div class="action-card__info">
              <div class="action-card__title">{action.title}</div>
              <div class="action-card__description">{action.description}</div>
            </div>
            <div class="action-card__arrow">
              <i class="icon-arrow-right"></i>
            </div>
          </div>
        </Card>
      {/each}
    </div>
  </div>

  <!-- Dashboard Content Grid -->
  <div class="dashboard__content">
    <!-- My Tasks -->
    <div class="dashboard__widget">
      <Card padding="none" class="widget-card">
        <div class="widget-header">
          <h3 class="widget-title">My Recent Tasks</h3>
          <Button
            variant="ghost"
            size="sm"
            rightIcon="arrow-right"
            href="/tasks/my"
          >
            View All
          </Button>
        </div>

        <div class="widget-content">
          <DataTable
            data={$myTasks.slice(0, 5)}
            columns={taskColumns}
            {loading}
            compact={true}
            hoverable={true}
            emptyMessage="No tasks assigned"
            on:rowClick={handleTaskRowClick}
          />
        </div>
      </Card>
    </div>

    <!-- Leave Requests -->
    <div class="dashboard__widget">
      <Card padding="none" class="widget-card">
        <div class="widget-header">
          <h3 class="widget-title">My Leave Requests</h3>
          <Button
            variant="ghost"
            size="sm"
            rightIcon="arrow-right"
            href="/leave/requests"
          >
            View All
          </Button>
        </div>

        <div class="widget-content">
          <DataTable
            data={$myLeaveRequests.slice(0, 5)}
            columns={leaveColumns}
            {loading}
            compact={true}
            hoverable={true}
            emptyMessage="No leave requests"
            on:rowClick={handleLeaveRowClick}
          />
        </div>
      </Card>
    </div>

    <!-- Recent Notifications -->
    <div class="dashboard__widget dashboard__widget--full-width">
      <Card padding="none" class="widget-card">
        <div class="widget-header">
          <h3 class="widget-title">
            Recent Notifications
            {#if $unreadCount > 0}
              <Badge variant="danger" size="sm">{$unreadCount}</Badge>
            {/if}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            rightIcon="arrow-right"
            href="/notifications"
          >
            View All
          </Button>
        </div>

        <div class="widget-content">
          {#if $unreadNotifications.length > 0}
            <div class="notification-list">
              {#each $unreadNotifications.slice(0, 4) as notification}
                <div 
                  class="notification-item"
                  class:notification-item--unread={!notification.isRead}
                  on:click={() => handleNotificationClick(notification)}
                  on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? handleNotificationClick(notification) : null}
                  role="button"
                  tabindex="0"
                  aria-label="{notification.title} - {notification.message}"
                >
                  <div class="notification-item__icon">
                    <i class="icon-{notification.type}"></i>
                  </div>
                  <div class="notification-item__content">
                    <div class="notification-item__title">{notification.title}</div>
                    <div class="notification-item__message">{notification.message}</div>
                    <div class="notification-item__time">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {#if !notification.isRead}
                    <div class="notification-item__dot"></div>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <div class="empty-state">
              <div class="empty-state__icon">
                <i class="icon-bell-off"></i>
              </div>
              <div class="empty-state__message">No new notifications</div>
            </div>
          {/if}
        </div>
      </Card>
    </div>
  </div>
</div>

<style lang="postcss">
  .dashboard {
    @apply space-y-8;
  }

  /* Header */
  .dashboard__header {
    @apply flex items-start justify-between;
  }

  .dashboard__title {
    @apply text-3xl font-bold text-gray-900;
  }

  .dashboard__subtitle {
    @apply mt-1 text-lg text-gray-600;
  }

  .dashboard__date-text {
    @apply text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full;
  }

  /* Stats Grid */
  .dashboard__stats {
    @apply grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-4;
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

  /* Line clamp utility */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>