<script lang="ts">
	import {
		Users,
		Building2,
		Calendar,
		Settings,
		User,
		Home,
		Shield,
		FileText,
		TrendingUp,
		UserCheck,
		Target,
		ListTodo,
		ChevronDown,
		ChevronRight,
		Sun,
		Moon,
		LogOut,
		Clock,
		Award,
		BarChart3,
		LayoutDashboard,
		Bell,
		Activity,
		CheckSquare,
		FolderOpen,
		Upload,
		ScrollText,
		Tags
	} from '@lucide/svelte';
	import { currentUser, hasRole, authActions } from '$lib/stores/auth';
	import { page } from '$app/stores';
	import { toggleMode, mode } from 'mode-watcher';
	import { notificationStore } from '$lib/stores/notifications';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { debugSettings } from '$lib/stores/debug-settings';
	import NotificationDropdown from '$lib/components/notifications/NotificationDropdown.svelte';
	import DebugInfo from '$lib/components/DebugInfo.svelte';

	// Subscribe to notification store
	const notifications = $derived($notificationStore.notifications);

	// Check user roles
	const isSuperAdmin = hasRole('super_admin');
	const isSystemAdmin = hasRole('system_admin');
	const isAdmin = hasRole('admin') || isSuperAdmin || isSystemAdmin;
	const isHR = hasRole('hr_admin') || isAdmin;
	const isManager = hasRole('manager') || isHR;
	// Administration section access - restricted to hr_admin and system_admin only
	const canAccessAdministration = hasRole('hr_admin') || isSystemAdmin || isSuperAdmin;

	// Load debug settings on mount (system_admin only)
	onMount(() => {
		if (isSystemAdmin) {
			debugSettings.load();
		}
	});

	// Derived: Check if debug info should be shown
	const showDebugInfo = $derived(isSystemAdmin && $debugSettings.show_debug_info);

	// Track which sections are expanded
	let expandedSections = $state({
		leave: false,
		performance: false,
		documents: false,
		tasks: false,
		management: false,
		administration: false
	});

	// Toggle section expansion
	function toggleSection(section: keyof typeof expandedSections) {
		expandedSections[section] = !expandedSections[section];
	}

	// Handle logout
	async function handleLogout() {
		try {
			await authActions.logout($page.url.pathname);
			goto('/login');
		} catch (error) {
			console.error('Logout error:', error);
			// Still navigate to login even if logout fails
			goto('/login');
		}
	}

	// Auto-expand section based on current route
	$effect(() => {
		const currentPath = $page.url.pathname;

		// Auto-expand based on current page
		if (currentPath.includes('/leave') || currentPath.includes('/attendance'))
			expandedSections.leave = true;
		if (currentPath.includes('/performance') && currentPath.includes('/users/'))
			expandedSections.performance = true;
		if (currentPath.includes('/documents'))
			expandedSections.documents = true;
		if (currentPath.includes('/tasks') && !currentPath.includes('/tasks/department'))
			expandedSections.tasks = true;
		if (
			currentPath.includes('/management') ||
			currentPath.includes('/employees/new') ||
			currentPath.includes('/departments/new') ||
			currentPath.includes('/performance/team') ||
			currentPath.includes('/tasks/department')
		) {
			expandedSections.management = true;
		}
		if (
			currentPath.includes('/admin') ||
			currentPath.includes('/dashboard/activities/logs') ||
			currentPath.includes('/dashboard/activities/rollback') ||
			currentPath === '/dashboard/tasks'
		) {
			expandedSections.administration = true;
		}
	});

	// Main navigation items - employee-focused
	const navMain = [
		{
			title: 'Dashboard',
			url: '/dashboard',
			icon: Home,
			standalone: true // No submenu
		},
		{
			title: 'Employees',
			url: '/dashboard/employees',
			icon: Users,
			standalone: true // Now a simple link to tabbed page
		},
		{
			title: 'Departments',
			url: '/dashboard/departments',
			icon: Building2,
			standalone: true // Now a simple link
		},
		{
			title: 'Events',
			url: '/dashboard/events',
			icon: Calendar,
			standalone: true // Events list page
		},
		{
			title: 'Tasks',
			url: '/dashboard/tasks/my-tasks',
			icon: ListTodo,
			standalone: false, // Has submenu
			section: 'tasks',
			items: [
				{ title: 'My Tasks', url: '/dashboard/tasks/my-tasks' },
				{ title: 'Team Tasks', url: '/dashboard/tasks/team-tasks' }
			]
		},
		{
			title: 'Activities',
			url: '/dashboard/activities',
			icon: Activity,
			standalone: true // My activities page
		},
		{
			title: 'Notifications',
			url: '/dashboard/notifications',
			icon: Bell,
			standalone: true // Notifications center
		},
		{
			title: 'Leave & Attendance',
			url: `/dashboard/profile/attendance`,
			icon: Clock,
			section: 'leave',
			items: [
				{ title: 'My Attendance', url: `/dashboard/profile/attendance` },
				{ title: 'Leave Requests', url: `/dashboard/profile/leave/requests` }
			]
		},
		{
			title: 'Performance',
			url: `/dashboard/profile/performance`,
			icon: Target,
			section: 'performance',
			items: [
				{ title: 'My Goals', url: `/dashboard/profile/performance` },
				{ title: 'Reviews', url: `/dashboard/profile/performance/reviews` }
			]
		},
		{
			title: 'Documents',
			url: '/dashboard/documents',
			icon: FolderOpen,
			section: 'documents',
			items: [
				{ title: 'My Documents', url: '/dashboard/documents' },
				...(isManager ? [{ title: 'Upload Document', url: '/dashboard/documents/upload' }] : []),
				...(isAdmin ? [{ title: 'Audit Logs', url: '/dashboard/documents/audit' }] : [])
			]
		}
	];

	// Management submenu (for managers/supervisors)
	// Managers have full edit access to their own department, view-only for others
	const managementItems = [
		{
			title: 'Overview',
			url: '/dashboard/management',
			icon: LayoutDashboard,
			description: 'Management dashboard'
		},
		{
			title: 'Teams',
			url: '/dashboard/teams',
			icon: Users,
			description: 'Team overview'
		},
		{
			title: 'Department Tasks',
			url: '/dashboard/tasks/department',
			icon: CheckSquare,
			description: 'Department task management',
			managersOnly: 'Manage tasks for your department'
		},
		{
			title: 'Leave Approvals',
			url: '/dashboard/management/leave-approvals',
			icon: Clock,
			description: 'Approve team leave requests',
			managersOnly: 'Approve leave for your team'
		},
		{
			title: 'Reviews',
			url: '/dashboard/management/reviews',
			icon: Award,
			description: 'Performance reviews',
			managersOnly: 'Conduct reviews for your team'
		},
		{
			title: 'Goals & OKRs',
			url: '/dashboard/management/goals',
			icon: Target,
			description: 'Team goals and objectives',
			managersOnly: 'Manage goals for your team'
		},
		{
			title: 'Reports',
			url: '/dashboard/management/reports',
			icon: BarChart3,
			description: 'Analytics and reports',
			managersOnly: 'Generate reports for your team'
		}
	];

	// Admin submenu (only when expanded)
	// T024: Updated admin navigation per specifications
	// T044-T046: Added Feature 020 audit logging pages
	const adminItems = [
		{ title: 'All Tasks', url: '/dashboard/tasks', icon: ListTodo },
		{ title: 'User Management', url: '/dashboard/admin/users', icon: Users },
		{ title: 'Task Types', url: '/dashboard/admin/task-types', icon: Tags },
		{ title: 'System Settings', url: '/dashboard/admin/settings', icon: Settings },
		{ title: 'Audit Logs', url: '/dashboard/activities/logs', icon: FileText },
		{ title: 'Rollback Requests', url: '/dashboard/activities/rollback-requests', icon: Clock, superAdminOnly: true },
		{ title: 'Bulk Rollback', url: '/dashboard/activities/bulk-rollback', icon: Activity, superAdminOnly: true },
		{ title: 'Analytics Dashboard', url: '/dashboard/admin/analytics', icon: BarChart3 },
		{ title: 'Compliance Reports', url: '/dashboard/admin/compliance', icon: Shield }
	];
</script>

<div class="flex h-full flex-col bg-sidebar text-sidebar-foreground">
	<!-- Header - Compact with Notifications -->
	<div class="flex items-center justify-between px-4 py-4">
		<a href="/dashboard" class="flex items-center gap-2 font-semibold">
			<Building2 class="h-5 w-5 text-primary" />
			<span class="text-base">SvelteHR</span>
		</a>
		<NotificationDropdown {notifications} />
	</div>

	<!-- Main Navigation - Collapsible -->
	<div class="flex-1 overflow-auto px-3 py-3">
		<nav class="space-y-1">
			{#each navMain as item}
				{#if item.standalone}
					<!-- Simple link without submenu -->
					{@const Icon = item.icon}
					<a
						href={item.url}
						class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground hover:opacity-80"
						class:bg-primary={$page.url.pathname === item.url}
						class:text-primary-foreground={$page.url.pathname === item.url}
						data-testid={item.title === 'Dashboard' ? 'nav-dashboard' :
										item.title === 'Employees' ? 'nav-employees' :
										item.title === 'Events' ? 'nav-events' :
										null}
					>
						<Icon class="h-4 w-4" />
						{item.title}
					</a>
				{:else}
					<!-- Collapsible section -->
					{@const Icon = item.icon}
					{@const ChevronIcon = item.section && expandedSections[item.section] ? ChevronDown : ChevronRight}
					<div>
						<button
							onclick={() => item.section && toggleSection(item.section)}
							class="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground hover:opacity-80"
							class:bg-primary={(() => {
								const currentPath = $page.url.pathname;
								if (item.section === 'leave') {
									return currentPath.includes('/attendance') || currentPath.includes('/leave');
								}
								if (item.section === 'performance') {
									return currentPath.includes('/performance');
								}
								if (item.section === 'documents') {
									return currentPath.includes('/documents');
								}
								if (item.section === 'tasks') {
									return currentPath.includes('/tasks') && !currentPath.includes('/tasks/department');
								}
								return false;
							})()}
							class:text-primary-foreground={(() => {
								const currentPath = $page.url.pathname;
								if (item.section === 'leave') {
									return currentPath.includes('/attendance') || currentPath.includes('/leave');
								}
								if (item.section === 'performance') {
									return currentPath.includes('/performance');
								}
								if (item.section === 'documents') {
									return currentPath.includes('/documents');
								}
								if (item.section === 'tasks') {
									return currentPath.includes('/tasks') && !currentPath.includes('/tasks/department');
								}
								return false;
							})()}
							data-testid={item.title === "Tasks" ? "nav-tasks" : null}
						>
							<div class="flex items-center gap-3">
								<Icon class="h-4 w-4" />
								{item.title}
							</div>
							{#if item.items && item.section}
								<ChevronIcon class="h-3 w-3 text-sidebar-foreground/50" />
							{/if}
						</button>

						{#if item.items && item.section && expandedSections[item.section]}
							<div class="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
								{#each item.items as subItem}
									<a
										href={subItem.url}
										class="block rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-primary hover:text-primary-foreground hover:opacity-70"
										class:bg-primary={$page.url.pathname === subItem.url}
										class:text-primary-foreground={$page.url.pathname === subItem.url}
										class:font-medium={$page.url.pathname === subItem.url}
									>
										{subItem.title}
									</a>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			{/each}
		</nav>
	</div>

	<!-- Management Section - Only for managers/supervisors -->
	{#if isManager}
		{@const ManagementChevron = expandedSections.management ? ChevronDown : ChevronRight}
		<div class="px-3 pb-3">
			<button
				onclick={() => toggleSection('management')}
				class="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground hover:opacity-80"
				class:bg-primary={$page.url.pathname.includes('/management')}
				class:text-primary-foreground={$page.url.pathname.includes('/management')}
			>
				<div class="flex items-center gap-3">
					<UserCheck class="h-4 w-4" />
					Management
				</div>
				<ManagementChevron class="h-3 w-3 text-sidebar-foreground/50" />
			</button>

			{#if expandedSections.management}
				<div class="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
					{#each managementItems as item}
						{@const ItemIcon = item.icon}
						<a
							href={item.url}
							class="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-primary hover:text-primary-foreground hover:opacity-70"
							class:bg-primary={$page.url.pathname === item.url}
							class:text-primary-foreground={$page.url.pathname === item.url}
							class:font-medium={$page.url.pathname === item.url}
							title={isAdmin ? item.description : (item.managersOnly || item.description)}
						>
							<ItemIcon class="h-3.5 w-3.5" />
							<span class="flex-1">{item.title}</span>
							{#if !isAdmin && item.managersOnly}
								<span
									class="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300"
									title={item.managersOnly}
								>
									My Team
								</span>
							{/if}
							{#if isAdmin && item.url.includes('/management/')}
								<span
									class="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300"
									title="Full access to all departments"
								>
									All
								</span>
							{/if}
						</a>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Administration Section (Bottom) - Only for hr_admin and system_admin -->
	{#if canAccessAdministration}
		{@const AdminChevron = expandedSections.administration ? ChevronDown : ChevronRight}
		<div class="px-3 pb-3">
			<button
				onclick={() => toggleSection('administration')}
				class="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground hover:opacity-80"
				class:bg-primary={$page.url.pathname.includes('/admin') || $page.url.pathname === '/dashboard/tasks'}
				class:text-primary-foreground={$page.url.pathname.includes('/admin') || $page.url.pathname === '/dashboard/tasks'}
				data-testid="nav-admin"
			>
				<div class="flex items-center gap-3">
					<Shield class="h-4 w-4" />
					Administration
				</div>
				<AdminChevron class="h-3 w-3 text-sidebar-foreground/50" />
			</button>

			{#if expandedSections.administration}
				<div class="ml-4 mt-1 space-y-0.5 pl-3">
					{#each adminItems as item}
						{#if !item.superAdminOnly || isSuperAdmin}
							{@const ItemIcon = item.icon}
							<a
								href={item.url}
								class="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-primary hover:text-primary-foreground hover:opacity-70"
								class:bg-primary={$page.url.pathname === item.url}
								class:text-primary-foreground={$page.url.pathname === item.url}
								class:font-medium={$page.url.pathname === item.url}
							>
								<ItemIcon class="h-3.5 w-3.5" />
								<span class="flex-1">{item.title}</span>
								<!-- T024: "All" badge for admin items -->
								{#if item.superAdminOnly}
									<span class="rounded-sm bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-500/20 dark:text-red-400">
										Super
									</span>
								{:else}
									<span class="rounded-sm bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:bg-green-500/20 dark:text-green-400">
										All
									</span>
								{/if}
							</a>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Debug Info (system_admin only) -->
	{#if showDebugInfo}
		<div class="px-3 pb-3">
			<DebugInfo />
		</div>
	{/if}

	<!-- User Profile & Settings Footer -->
	{#if $currentUser}
		<div class="px-4 py-3">
			<div class="flex items-center justify-between">
				<!-- Profile Link (left side) -->
				<a
					href="/dashboard/profile"
					class="flex items-center gap-2 rounded-md pr-2 transition-colors hover:bg-sidebar-accent/50"
					title="My Profile"
					data-testid="nav-profile"
				>
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
						<User class="h-4 w-4" />
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-xs font-medium">
							{$currentUser.firstName || $currentUser.displayName || 'User'}
						</p>
						<p class="truncate text-xs text-sidebar-foreground/60">
							{$currentUser.email?.split('@')[0] || 'user'}
						</p>
					</div>
				</a>

				<!-- Theme Toggle and Settings (right side) -->
				<div class="flex items-center space-x-1">
					<!-- Logout Button -->
					<button
						onclick={handleLogout}
						class="flex items-center justify-center rounded-md p-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
						title="Logout"
					>
						<LogOut class="h-4 w-4" />
					</button>

					<!-- Dark Mode Toggle -->
					<button
						onclick={toggleMode}
						class="flex items-center justify-center rounded-md p-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
						title="Toggle theme"
					>
						{#if mode.current === 'dark'}
							<Sun class="h-4 w-4" />
						{:else}
							<Moon class="h-4 w-4" />
						{/if}
					</button>

					<!-- Settings Icon -->
					<a
						href="/dashboard/profile/settings"
						class="flex items-center justify-center rounded-md p-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
						title="Settings"
						data-testid="nav-settings"
					>
						<Settings class="h-4 w-4" />
					</a>
				</div>
			</div>
		</div>
	{/if}
</div>
