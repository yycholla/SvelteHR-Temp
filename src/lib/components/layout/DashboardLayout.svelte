<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { auth, currentUser, isLoggedIn } from '$lib/services/auth';
  import { notifications, unreadCount } from '$lib/services/notificationService';
  import { goto } from '$app/navigation';
  import type { User } from '$lib/types';

  // Layout state
  let sidebarOpen = true;
  let mobileMenuOpen = false;
  let userMenuOpen = false;
  let notificationPanelOpen = false;

  // User and auth state
  $: user = $currentUser;
  $: authenticated = $isLoggedIn;

  // Navigation items based on user role
  $: navigationItems = getNavigationItems(user);

  // Reactive page title
  $: currentPath = $page.url.pathname;
  $: pageTitle = getPageTitle(currentPath);

  interface NavigationItem {
    name: string;
    href: string;
    icon: string;
    badge?: number;
    children?: NavigationItem[];
    requiredRole?: string;
    requiredPermission?: string;
  }

  function getNavigationItems(user: User | null): NavigationItem[] {
    const items: NavigationItem[] = [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: 'home'
      },
      {
        name: 'Employees',
        href: '/employees',
        icon: 'users',
        children: [
          { name: 'All Employees', href: '/employees', icon: 'list' },
          { name: 'Add Employee', href: '/employees/new', icon: 'plus', requiredPermission: 'user:create' },
          { name: 'Employee Directory', href: '/employees/directory', icon: 'book-open' },
          { name: 'Organizational Chart', href: '/employees/org-chart', icon: 'sitemap' }
        ]
      },
      {
        name: 'Departments',
        href: '/departments',
        icon: 'building',
        children: [
          { name: 'All Departments', href: '/departments', icon: 'list' },
          { name: 'Create Department', href: '/departments/new', icon: 'plus', requiredPermission: 'department:create' },
          { name: 'Budget Management', href: '/departments/budgets', icon: 'dollar-sign', requiredRole: 'finance_manager' }
        ]
      },
      {
        name: 'Tasks',
        href: '/tasks',
        icon: 'check-square',
        children: [
          { name: 'My Tasks', href: '/tasks/my', icon: 'user-check' },
          { name: 'All Tasks', href: '/tasks', icon: 'list' },
          { name: 'Create Task', href: '/tasks/new', icon: 'plus' },
          { name: 'Task Analytics', href: '/tasks/analytics', icon: 'bar-chart' }
        ]
      },
      {
        name: 'Leave & Attendance',
        href: '/attendance',
        icon: 'calendar',
        children: [
          { name: 'My Attendance', href: '/attendance/my', icon: 'clock' },
          { name: 'Leave Requests', href: '/leave/requests', icon: 'calendar-days' },
          { name: 'Submit Leave', href: '/leave/new', icon: 'plus-circle' },
          { name: 'Team Attendance', href: '/attendance/team', icon: 'users-clock', requiredPermission: 'attendance:view_team' },
          { name: 'Attendance Reports', href: '/attendance/reports', icon: 'file-text', requiredRole: 'hr_manager' }
        ]
      },
      {
        name: 'HR Requests',
        href: '/hr-requests',
        icon: 'clipboard-list',
        children: [
          { name: 'My Requests', href: '/hr-requests/my', icon: 'user-circle' },
          { name: 'Submit Request', href: '/hr-requests/new', icon: 'plus' },
          { name: 'Assigned to Me', href: '/hr-requests/assigned', icon: 'user-check', requiredPermission: 'hr_request:process' },
          { name: 'All Requests', href: '/hr-requests', icon: 'list', requiredRole: 'hr_manager' }
        ]
      }
    ];

    // Admin-only items
    if (user?.roles.some(role => role.name === 'admin')) {
      items.push({
        name: 'Administration',
        href: '/admin',
        icon: 'settings',
        children: [
          { name: 'User Management', href: '/admin/users', icon: 'users-cog' },
          { name: 'Role Management', href: '/admin/roles', icon: 'shield' },
          { name: 'System Settings', href: '/admin/settings', icon: 'cog' },
          { name: 'Audit Logs', href: '/admin/audit', icon: 'file-search' },
          { name: 'Analytics', href: '/admin/analytics', icon: 'trending-up' }
        ]
      });
    }

    return items.filter(item => hasPermissionForItem(item, user));
  }

  function hasPermissionForItem(item: NavigationItem, user: User | null): boolean {
    if (!user) return false;
    
    if (item.requiredRole) {
      return user.roles.some(role => role.name === item.requiredRole);
    }
    
    if (item.requiredPermission) {
      return user.permissions.some(permission => permission.name === item.requiredPermission);
    }
    
    return true;
  }

  function getPageTitle(path: string): string {
    const titles: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/employees': 'Employees',
      '/employees/new': 'Add Employee',
      '/employees/directory': 'Employee Directory',
      '/employees/org-chart': 'Organization Chart',
      '/departments': 'Departments',
      '/departments/new': 'Create Department',
      '/departments/budgets': 'Budget Management',
      '/tasks': 'Tasks',
      '/tasks/my': 'My Tasks',
      '/tasks/new': 'Create Task',
      '/tasks/analytics': 'Task Analytics',
      '/attendance': 'Attendance',
      '/attendance/my': 'My Attendance',
      '/attendance/team': 'Team Attendance',
      '/attendance/reports': 'Attendance Reports',
      '/leave/requests': 'Leave Requests',
      '/leave/new': 'Submit Leave Request',
      '/hr-requests': 'HR Requests',
      '/hr-requests/my': 'My HR Requests',
      '/hr-requests/new': 'Submit HR Request',
      '/hr-requests/assigned': 'Assigned Requests',
      '/admin': 'Administration',
      '/admin/users': 'User Management',
      '/admin/roles': 'Role Management',
      '/admin/settings': 'System Settings',
      '/admin/audit': 'Audit Logs',
      '/admin/analytics': 'Analytics'
    };
    
    return titles[path] || 'MountainHR';
  }

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function toggleUserMenu() {
    userMenuOpen = !userMenuOpen;
  }

  function toggleNotificationPanel() {
    notificationPanelOpen = !notificationPanelOpen;
  }

  async function handleLogout() {
    try {
      await auth.logout();
      goto('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  // Close menus when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as Element;
    
    if (userMenuOpen && !target.closest('#user-menu')) {
      userMenuOpen = false;
    }
    
    if (notificationPanelOpen && !target.closest('#notification-panel')) {
      notificationPanelOpen = false;
    }
  }

  onMount(() => {
    // Redirect if not authenticated
    if (!authenticated) {
      goto('/login');
      return;
    }

    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });

  // Handle responsive sidebar
  $: if (typeof window !== 'undefined') {
    if (window.innerWidth < 1024) {
      sidebarOpen = false;
    }
  }
</script>

<svelte:window 
  on:resize={() => {
    if (window.innerWidth < 1024) {
      sidebarOpen = false;
      mobileMenuOpen = false;
    }
  }}
/>

<div class="dashboard-layout">
  <!-- Mobile backdrop -->
  {#if mobileMenuOpen}
    <div 
      class="mobile-backdrop"
      on:click={toggleMobileMenu}
      on:keydown={(e) => e.key === 'Escape' && toggleMobileMenu()}
      role="button"
      tabindex="-1"
      aria-label="Close mobile menu"
    ></div>
  {/if}

  <!-- Sidebar -->
  <aside 
    class="sidebar"
    class:sidebar--open={sidebarOpen || mobileMenuOpen}
    class:sidebar--mobile-open={mobileMenuOpen}
  >
    <div class="sidebar__header">
      <div class="sidebar__logo">
        <img src="/logo.svg" alt="MountainHR" class="sidebar__logo-image" />
        <span class="sidebar__logo-text">MountainHR</span>
      </div>
      
      <button 
        type="button"
        class="sidebar__close lg:hidden"
        on:click={toggleMobileMenu}
      >
        <span class="sr-only">Close sidebar</span>
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <nav class="sidebar__nav">
      <ul class="sidebar__nav-list">
        {#each navigationItems as item}
          <li class="sidebar__nav-item">
            <a 
              href={item.href}
              class="sidebar__nav-link"
              class:sidebar__nav-link--active={currentPath === item.href || currentPath.startsWith(item.href + '/')}
            >
              <span class="sidebar__nav-icon">
                <i class="icon-{item.icon}"></i>
              </span>
              <span class="sidebar__nav-text">{item.name}</span>
              {#if item.badge}
                <span class="sidebar__nav-badge">{item.badge}</span>
              {/if}
            </a>
            
            {#if item.children && (currentPath.startsWith(item.href) || item.href === '/dashboard')}
              <ul class="sidebar__nav-sublist">
                {#each item.children as child}
                  {#if hasPermissionForItem(child, user)}
                    <li class="sidebar__nav-subitem">
                      <a 
                        href={child.href}
                        class="sidebar__nav-sublink"
                        class:sidebar__nav-sublink--active={currentPath === child.href}
                      >
                        <span class="sidebar__nav-subicon">
                          <i class="icon-{child.icon}"></i>
                        </span>
                        <span class="sidebar__nav-subtext">{child.name}</span>
                      </a>
                    </li>
                  {/if}
                {/each}
              </ul>
            {/if}
          </li>
        {/each}
      </ul>
    </nav>
  </aside>

  <!-- Main content area -->
  <div class="main-content" class:main-content--sidebar-open={sidebarOpen}>
    <!-- Top navigation bar -->
    <header class="topbar">
      <div class="topbar__left">
        <button 
          type="button"
          class="topbar__menu-button lg:hidden"
          on:click={toggleMobileMenu}
        >
          <span class="sr-only">Open main menu</span>
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <button 
          type="button"
          class="topbar__sidebar-toggle hidden lg:block"
          on:click={toggleSidebar}
        >
          <span class="sr-only">Toggle sidebar</span>
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h1 class="topbar__title">{pageTitle}</h1>
      </div>

      <div class="topbar__right">
        <!-- Search -->
        <div class="topbar__search">
          <input 
            type="search" 
            placeholder="Search..." 
            class="topbar__search-input"
          />
        </div>

        <!-- Notifications -->
        <div class="topbar__notification" id="notification-panel">
          <button 
            type="button"
            class="topbar__notification-button"
            on:click={toggleNotificationPanel}
          >
            <span class="sr-only">View notifications</span>
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5-5-5h5V3h5v14z" />
            </svg>
            {#if $unreadCount > 0}
              <span class="topbar__notification-badge">{$unreadCount}</span>
            {/if}
          </button>

          {#if notificationPanelOpen}
            <div class="topbar__notification-panel">
              <div class="notification-panel">
                <div class="notification-panel__header">
                  <h3>Notifications</h3>
                  {#if $unreadCount > 0}
                    <span class="notification-panel__count">{$unreadCount} unread</span>
                  {/if}
                </div>
                
                <div class="notification-panel__list">
                  {#each $notifications.slice(0, 5) as notification}
                    <div 
                      class="notification-item"
                      class:notification-item--unread={!notification.isRead}
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
                    </div>
                  {/each}
                </div>
                
                <div class="notification-panel__footer">
                  <a href="/notifications" class="notification-panel__view-all">
                    View all notifications
                  </a>
                </div>
              </div>
            </div>
          {/if}
        </div>

        <!-- User menu -->
        <div class="topbar__user" id="user-menu">
          <button 
            type="button"
            class="topbar__user-button"
            on:click={toggleUserMenu}
          >
            <span class="sr-only">Open user menu</span>
            <div class="topbar__user-avatar">
              {#if user?.profileImage}
                <img src={user.profileImage} alt={user.displayName} />
              {:else}
                <div class="topbar__user-initials">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </div>
              {/if}
            </div>
            <div class="topbar__user-info">
              <div class="topbar__user-name">{user?.displayName}</div>
              <div class="topbar__user-role">{user?.jobTitle}</div>
            </div>
            <svg class="topbar__user-chevron w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {#if userMenuOpen}
            <div class="topbar__user-menu">
              <div class="user-menu">
                <div class="user-menu__header">
                  <div class="user-menu__avatar">
                    {#if user?.profileImage}
                      <img src={user.profileImage} alt={user.displayName} />
                    {:else}
                      <div class="user-menu__initials">
                        {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                      </div>
                    {/if}
                  </div>
                  <div class="user-menu__info">
                    <div class="user-menu__name">{user?.displayName}</div>
                    <div class="user-menu__email">{user?.email}</div>
                  </div>
                </div>
                
                <div class="user-menu__divider"></div>
                
                <nav class="user-menu__nav">
                  <a href="/profile" class="user-menu__link">
                    <i class="icon-user"></i>
                    View Profile
                  </a>
                  <a href="/settings" class="user-menu__link">
                    <i class="icon-settings"></i>
                    Settings
                  </a>
                  <a href="/help" class="user-menu__link">
                    <i class="icon-help-circle"></i>
                    Help & Support
                  </a>
                </nav>
                
                <div class="user-menu__divider"></div>
                
                <button 
                  type="button"
                  class="user-menu__logout"
                  on:click={handleLogout}
                >
                  <i class="icon-log-out"></i>
                  Sign out
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </header>

    <!-- Page content -->
    <main class="page-content">
      <slot />
    </main>
  </div>
</div>

<style lang="postcss">
  /* Dashboard Layout Styles */
  .dashboard-layout {
    @apply min-h-screen bg-gray-50 flex;
  }

  /* Mobile Backdrop */
  .mobile-backdrop {
    @apply fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden;
  }

  /* Sidebar Styles */
  .sidebar {
    @apply fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform -translate-x-full transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0;
  }

  .sidebar--open {
    @apply translate-x-0;
  }

  .sidebar--mobile-open {
    @apply lg:translate-x-0;
  }

  .sidebar__header {
    @apply flex items-center justify-between p-4 border-b border-gray-200;
  }

  .sidebar__logo {
    @apply flex items-center;
  }

  .sidebar__logo-image {
    @apply w-8 h-8 mr-3;
  }

  .sidebar__logo-text {
    @apply text-xl font-bold text-gray-900;
  }

  .sidebar__close {
    @apply p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100;
  }

  .sidebar__nav {
    @apply flex-1 px-2 py-4 space-y-1 overflow-y-auto;
  }

  .sidebar__nav-list {
    @apply space-y-1;
  }

  .sidebar__nav-item {
    @apply space-y-1;
  }

  .sidebar__nav-link {
    @apply flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900;
  }

  .sidebar__nav-link--active {
    @apply bg-blue-100 text-blue-900;
  }

  .sidebar__nav-icon {
    @apply flex-shrink-0 w-5 h-5 mr-3 text-gray-400;
  }

  .sidebar__nav-link--active .sidebar__nav-icon {
    @apply text-blue-500;
  }

  .sidebar__nav-text {
    @apply flex-1;
  }

  .sidebar__nav-badge {
    @apply ml-3 inline-block py-0.5 px-2 text-xs font-medium bg-red-100 text-red-800 rounded-full;
  }

  .sidebar__nav-sublist {
    @apply ml-6 space-y-1;
  }

  .sidebar__nav-sublink {
    @apply flex items-center px-3 py-1.5 text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900;
  }

  .sidebar__nav-sublink--active {
    @apply bg-blue-50 text-blue-700;
  }

  .sidebar__nav-subicon {
    @apply flex-shrink-0 w-4 h-4 mr-2 text-gray-400;
  }

  .sidebar__nav-sublink--active .sidebar__nav-subicon {
    @apply text-blue-500;
  }

  /* Main Content Styles */
  .main-content {
    @apply flex-1 flex flex-col overflow-hidden lg:ml-0;
  }

  .main-content--sidebar-open {
    @apply lg:ml-64;
  }

  /* Topbar Styles */
  .topbar {
    @apply bg-white shadow-sm border-b border-gray-200 px-4 py-2 flex items-center justify-between;
  }

  .topbar__left {
    @apply flex items-center space-x-4;
  }

  .topbar__menu-button,
  .topbar__sidebar-toggle {
    @apply p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100;
  }

  .topbar__title {
    @apply text-xl font-semibold text-gray-900;
  }

  .topbar__right {
    @apply flex items-center space-x-4;
  }

  .topbar__search {
    @apply relative;
  }

  .topbar__search-input {
    @apply block w-64 px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500;
  }

  /* Notification Styles */
  .topbar__notification {
    @apply relative;
  }

  .topbar__notification-button {
    @apply p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100 relative;
  }

  .topbar__notification-badge {
    @apply absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center;
  }

  .topbar__notification-panel {
    @apply absolute right-0 mt-2 w-96 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50;
  }

  .notification-panel {
    @apply py-1;
  }

  .notification-panel__header {
    @apply px-4 py-3 border-b border-gray-200 flex items-center justify-between;
  }

  .notification-panel__header h3 {
    @apply text-lg font-medium text-gray-900;
  }

  .notification-panel__count {
    @apply text-sm text-blue-600;
  }

  .notification-panel__list {
    @apply max-h-96 overflow-y-auto;
  }

  .notification-item {
    @apply px-4 py-3 hover:bg-gray-50 border-b border-gray-100 flex;
  }

  .notification-item--unread {
    @apply bg-blue-50;
  }

  .notification-item__icon {
    @apply flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3;
  }

  .notification-item__content {
    @apply flex-1 min-w-0;
  }

  .notification-item__title {
    @apply text-sm font-medium text-gray-900 truncate;
  }

  .notification-item__message {
    @apply text-sm text-gray-600 mt-1;
  }

  .notification-item__time {
    @apply text-xs text-gray-400 mt-1;
  }

  .notification-panel__footer {
    @apply px-4 py-3 border-t border-gray-200;
  }

  .notification-panel__view-all {
    @apply text-sm text-blue-600 hover:text-blue-800;
  }

  /* User Menu Styles */
  .topbar__user {
    @apply relative;
  }

  .topbar__user-button {
    @apply flex items-center space-x-3 p-2 text-sm rounded-full hover:bg-gray-100;
  }

  .topbar__user-avatar {
    @apply w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden;
  }

  .topbar__user-avatar img {
    @apply w-full h-full object-cover;
  }

  .topbar__user-initials {
    @apply text-sm font-medium text-gray-700;
  }

  .topbar__user-info {
    @apply hidden lg:block text-left;
  }

  .topbar__user-name {
    @apply text-sm font-medium text-gray-900;
  }

  .topbar__user-role {
    @apply text-xs text-gray-500;
  }

  .topbar__user-chevron {
    @apply text-gray-400;
  }

  .topbar__user-menu {
    @apply absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50;
  }

  .user-menu {
    @apply py-1;
  }

  .user-menu__header {
    @apply px-4 py-3 flex items-center;
  }

  .user-menu__avatar {
    @apply w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden mr-3;
  }

  .user-menu__avatar img {
    @apply w-full h-full object-cover;
  }

  .user-menu__initials {
    @apply text-sm font-medium text-gray-700;
  }

  .user-menu__info {
    @apply flex-1;
  }

  .user-menu__name {
    @apply text-sm font-medium text-gray-900;
  }

  .user-menu__email {
    @apply text-sm text-gray-500;
  }

  .user-menu__divider {
    @apply border-t border-gray-200 my-1;
  }

  .user-menu__nav {
    @apply px-1;
  }

  .user-menu__link {
    @apply flex items-center px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100;
  }

  .user-menu__link i {
    @apply w-4 h-4 mr-3;
  }

  .user-menu__logout {
    @apply w-full text-left flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50;
  }

  .user-menu__logout i {
    @apply w-4 h-4 mr-3;
  }

  /* Page Content */
  .page-content {
    @apply flex-1 overflow-y-auto p-6;
  }

  /* Utility Classes */
  .sr-only {
    @apply absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0;
    clip: rect(0, 0, 0, 0);
  }
</style>