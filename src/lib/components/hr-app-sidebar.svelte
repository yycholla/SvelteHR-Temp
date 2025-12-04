<script lang="ts">
	import {
		Activity,
		Award,
		BarChart3,
		Bell,
		BookOpen,
		Building2,
		Calendar,
		CheckSquare,
		ChevronDown,
		ChevronRight,
		Clock,
		FileText,
		FolderOpen,
		GraduationCap,
		Home,
		LayoutDashboard,
		ListTodo,
		LogOut,
		Moon,
		PanelLeftClose,
		PanelLeftOpen,
		ScrollText,
		Settings,
		Shield,
		Sun,
		Tags,
		Target,
		TrendingUp,
		Upload,
		User,
		UserCheck,
		Users
	} from '@lucide/svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { page } from '$app/stores';
	import { mode, toggleMode } from 'mode-watcher';
	import { notificationStore } from '$lib/stores/notifications.svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { debugSettings } from '$lib/stores/debug-settings.svelte';
	import { sidebarState } from '$lib/stores/sidebar.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import NotificationDropdown from '$lib/components/notifications/NotificationDropdown.svelte';
	import DebugInfo from '$lib/components/DebugInfo.svelte';

	// Accept permissions and systemName as props (passed from dashboard layout with test mode support)
	interface Props {
		permissions: string[];
		systemName?: string;
	}

	const { permissions, systemName = 'MountainHR' }: Props = $props();

	// Use notification store with Svelte 5 runes pattern
	// notificationStore.notifications is already reactive with $state
	const notifications = $derived(notificationStore.notifications);

	// Use permissions from props (already in string format from layout)
	// Fallback to page data if prop is not provided (for backwards compatibility)
	const userPermissions = $derived(permissions || $page.data.permissions || []);

	// Convert permission objects to "resource:action" strings if needed
	const permissionStrings = $derived(
		userPermissions.map((p: any) => {
			if (typeof p === 'string') return p;
			// Handle object format {resource: "dashboard", action: "read"}
			return `${p.resource}:${p.action}`;
		})
	);

	// Debug: Log permissions when they change
	$effect(() => {
		// Logging disabled for production
	});

	// Permission helper functions - updated for scoped permissions
	const hasPermission = (permission: string): boolean => {
		// Check for wildcard permission
		const hasWildcard = permissionStrings.includes('*') || permissionStrings.includes('*:*');
		if (hasWildcard) return true;

		// Direct permission check
		if (permissionStrings.includes(permission)) {
			return true;
		}

		// For old-style permissions (e.g., "employees:read"), also check scoped variants
		if (!permission.includes(':read:')) {
			const parts = permission.split(':');
			if (parts.length === 2 && parts[1] === 'read') {
				// Check if user has any scoped read permission
				const resource = parts[0];
				const hasScoped =
					permissionStrings.includes(`${resource}:read:self`) ||
					permissionStrings.includes(`${resource}:read:team`) ||
					permissionStrings.includes(`${resource}:read:all`);
				if (hasScoped) {
					return true;
				}
			}
		}

		return false;
	};

	const hasAnyPermission = (...permissions: string[]): boolean => {
		// Check for wildcard permission
		if (permissionStrings.includes('*') || permissionStrings.includes('*:*')) return true;

		const has = permissions.some((p) => hasPermission(p));
		return has;
	};

	// New: Check if user has a specific read scope for a resource
	const hasReadScope = (resource: string, scope: 'self' | 'team' | 'all'): boolean => {
		// Check for wildcard permission
		if (permissionStrings.includes('*') || permissionStrings.includes('*:*')) return true;

		// Check for specific scoped permission
		const scopedPermission = `${resource}:read:${scope}`;
		if (permissionStrings.includes(scopedPermission)) {
			return true;
		}

		// If checking for self or team, also accept higher scopes
		if (scope === 'self') {
			return (
				permissionStrings.includes(`${resource}:read:team`) ||
				permissionStrings.includes(`${resource}:read:all`) ||
				permissionStrings.includes(`${resource}:read`)
			); // Legacy
		}
		if (scope === 'team') {
			return permissionStrings.includes(`${resource}:read:all`);
		}

		return false;
	};

	// New: Check if user has ANY permissions at a specific scope level
	const hasAnyReadScope = (scope: 'self' | 'team' | 'all'): boolean => {
		// Check for wildcard permission
		if (permissionStrings.includes('*') || permissionStrings.includes('*:*')) return true;

		// Check if any permission has the specified scope
		return permissionStrings.some((p) => {
			if (scope === 'team') {
				return p.includes(':read:team') || p.includes(':read:all');
			}
			if (scope === 'all') {
				return p.includes(':read:all');
			}
			// For 'self', any read permission qualifies
			return (
				p.includes(':read:self') ||
				p.includes(':read:team') ||
				p.includes(':read:all') ||
				p.endsWith(':read')
			);
		});
	};

	// Check user roles (keep for super admin checks)
	const isSuperAdmin = auth.hasRole('super_admin');
	const isSystemAdmin = auth.hasRole('system_admin');

	// Load debug settings on mount
	onMount(async () => {
		if (isSystemAdmin) {
			debugSettings.load();
		}
	});

	// Derived: Check if debug info should be shown
	const showDebugInfo = $derived(isSystemAdmin && debugSettings.show_debug_info);

	// Track which sections are expanded
	let expandedSections = $state({
		leave: false,
		performance: false,
		tasks: false,
		management: false,
		administration: false
	});

	// Restore expanded sections from localStorage on mount
	onMount(() => {
		if (browser) {
			const saved = localStorage.getItem('sidebar-expanded');
			if (saved) {
				try {
					expandedSections = JSON.parse(saved);
				} catch (error) {
					console.error('Failed to parse saved sidebar state:', error);
				}
			}
		}
	});

	// Persist expanded sections to localStorage whenever they change
	$effect(() => {
		if (browser) {
			localStorage.setItem('sidebar-expanded', JSON.stringify(expandedSections));
		}
	});

	// Toggle section expansion
	function toggleSection(section: keyof typeof expandedSections) {
		expandedSections[section] = !expandedSections[section];
	}

	// Handle logout
	async function handleLogout() {
		try {
			await auth.logout($page.url.pathname);
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

	// Main navigation items - employee-focused with permission requirements
	const navMain = [
		{
			title: 'Dashboard',
			url: '/dashboard',
			icon: Home,
			standalone: true,
			permission: 'dashboard:read'
		},
		{
			title: 'Employees',
			url: '/dashboard/employees',
			icon: Users,
			standalone: true,
			permission: 'employees:read'
		},
		{
			title: 'Departments',
			url: '/dashboard/departments',
			icon: Building2,
			standalone: true,
			permission: 'departments:read'
		},
		{
			title: 'Events',
			url: '/dashboard/events',
			icon: Calendar,
			standalone: true,
			permission: 'events:read'
		},
		{
			title: 'Tasks',
			url: '/dashboard/tasks/my-tasks',
			icon: ListTodo,
			standalone: false,
			section: 'tasks',
			permission: 'tasks:read',
			items: [
				{ title: 'My Tasks', url: '/dashboard/tasks/my-tasks' },
				{ title: 'Team Tasks', url: '/dashboard/tasks/team-tasks' }
			]
		},
		{
			title: 'Activities',
			url: '/dashboard/activities',
			icon: Activity,
			standalone: true,
			permission: 'activities:read'
		},
		{
			title: 'Notifications',
			url: '/dashboard/notifications',
			icon: Bell,
			standalone: true,
			permission: 'notifications:read'
		},
		{
			title: 'Leave & Attendance',
			url: `/dashboard/profile/attendance`,
			icon: Clock,
			section: 'leave',
			permissionAny: ['leave:read', 'attendance:read'], // Show if has either
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
			permissionAny: ['performance:read', 'reviews:read'], // Show if has either
			items: [
				{ title: 'My Goals', url: `/dashboard/profile/performance` },
				{ title: 'Reviews', url: `/dashboard/profile/performance/reviews` }
			]
		},
		{
			title: 'Training',
			url: '/dashboard/training',
			icon: GraduationCap,
			standalone: true,
			permission: 'training:read'
		},
		{
			title: 'Onboarding',
			url: '/dashboard/onboarding',
			icon: BookOpen,
			standalone: true,
			permission: 'onboarding:read'
		},
		{
			title: 'Documents',
			url: '/dashboard/documents',
			icon: FolderOpen,
			standalone: true,
			permission: 'documents:read'
		}
	];

	// Management submenu (for managers/supervisors)
	// Requires read:team or read:all permissions
	const managementItems = [
		{
			title: 'Overview',
			url: '/dashboard/management',
			icon: LayoutDashboard,
			description: 'Management dashboard',
			permission: 'management:read:team'
		},
		{
			title: 'Team Reviews',
			url: '/dashboard/management/reviews',
			icon: Award,
			description: 'Performance reviews',
			permission: 'reviews:read:team'
		},
		{
			title: 'Team Goals',
			url: '/dashboard/management/goals',
			icon: Target,
			description: 'Team goals and objectives',
			permission: 'goals:read:team'
		},
		{
			title: 'Team Reports',
			url: '/dashboard/management/reports',
			icon: BarChart3,
			description: 'Team analytics and reports',
			permission: 'reports:read:team'
		}
	];

	// Admin submenu (only when expanded)
	// Requires read:all permissions for system-wide access
	const adminItems = [
		{
			title: 'All Documents',
			url: '/dashboard/admin/documents',
			icon: FolderOpen,
			permission: 'documents:read:all'
		},
		{
			title: 'Training Modules',
			url: '/dashboard/admin/trainings',
			icon: GraduationCap,
			permissionAny: ['training:write', 'training:assign']
		},
		{
			title: 'Onboarding Modules',
			url: '/dashboard/admin/onboarding',
			icon: BookOpen,
			permissionAny: ['onboarding:write', 'onboarding:assign']
		},
		{
			title: 'User Management',
			url: '/dashboard/admin/users',
			icon: User,
			permission: 'users:read:all'
		},
		{
			title: 'Roles & Permissions',
			url: '/dashboard/admin/permissions',
			icon: Shield,
			permissionAny: ['roles:read:all', 'permissions:read:all']
		},
		{
			title: 'System Settings',
			url: '/dashboard/admin/settings',
			icon: Settings,
			permission: 'admin:read:all'
		},
		{
			title: 'Audit Logs',
			url: '/dashboard/admin/audit',
			icon: FileText,
			permission: 'activities:read:all'
		},
		{
			title: 'Analytics Dashboard',
			url: '/dashboard/admin/analytics',
			icon: BarChart3,
			permissionAny: ['reports:read:all', 'reports:analytics']
		},
		{
			title: 'Rollback Requests',
			url: '/dashboard/activities/rollback-requests',
			icon: Clock,
			superAdminOnly: true,
			permission: 'admin:read:all'
		},
		{
			title: 'Bulk Rollback',
			url: '/dashboard/activities/bulk-rollback',
			icon: Activity,
			superAdminOnly: true,
			permission: 'admin:read:all'
		}
	];

	// Filter menu items based on permissions
	const filteredNavMain = $derived.by(() => {
		const filtered = navMain.filter((item) => {
			// Check permission or permissionAny
			if ((item as any).permission) {
				return hasPermission((item as any).permission);
			} else if ((item as any).permissionAny) {
				return hasAnyPermission(...(item as any).permissionAny);
			}
			return true; // Show if no permission requirement
		});
		return filtered;
	});

	// Filter management items based on read:team or read:all permissions
	const filteredManagementItems = $derived.by(() => {
		const filtered = managementItems.filter((item) => {
			// Check permission or permissionAny
			if ((item as any).permission) {
				return hasPermission((item as any).permission);
			} else if ((item as any).permissionAny) {
				return hasAnyPermission(...(item as any).permissionAny);
			}
			return true;
		});
		return filtered;
	});

	// Filter admin items based on read:all permissions and role
	const filteredAdminItems = $derived.by(() => {
		const filtered = adminItems.filter((item) => {
			// Check super admin only items
			if ((item as any).superAdminOnly && !isSuperAdmin) {
				return false;
			}
			// Check permission or permissionAny
			if ((item as any).permission) {
				return hasPermission((item as any).permission);
			} else if ((item as any).permissionAny) {
				return hasAnyPermission(...(item as any).permissionAny);
			}
			return true;
		});
		return filtered;
	});

	// Permission-based access checks - updated to check if any items are actually visible
	// Show Management section only if there are filtered items
	const canAccessManagement = $derived(filteredManagementItems.length > 0);
	// Show Administration section only if there are filtered items
	const canAccessAdministration = $derived(filteredAdminItems.length > 0);
</script>

<div class="flex h-full flex-col bg-sidebar text-sidebar-foreground">
	<!-- Header - Compact with Notifications -->
	<div class="flex items-center {sidebarState.isCollapsed ? 'justify-center flex-col gap-4' : 'justify-between'} px-4 py-4 transition-all">
		{#if !sidebarState.isCollapsed}
			<a href="/dashboard" class="flex items-center gap-2 font-semibold">
				<Building2 class="h-5 w-5 text-primary" />
				<span class="text-base">{systemName}</span>
			</a>
			<div class="flex items-center gap-1">
				<NotificationDropdown {notifications} />
				<button
					onclick={() => sidebarState.toggle()}
					class="ml-1 rounded-md p-1 hover:bg-sidebar-accent"
					title="Collapse sidebar"
				>
					<PanelLeftClose class="h-4 w-4" />
				</button>
			</div>
		{:else}
			<a href="/dashboard" title={systemName}>
				<Building2 class="h-5 w-5 text-primary" />
			</a>
			<button
				onclick={() => sidebarState.toggle()}
				class="rounded-md p-1 hover:bg-sidebar-accent"
				title="Expand sidebar"
			>
				<PanelLeftOpen class="h-4 w-4" />
			</button>
		{/if}
	</div>

	<!-- Main Navigation - Collapsible -->
	<div class="flex-1 overflow-auto px-3 py-3">
		<nav class="space-y-1">
			{#each filteredNavMain as item}
				{#if item.standalone}
					<!-- Simple link without submenu -->
					{@const Icon = item.icon}
					<a
						href={item.url}
						data-sveltekit-reload
						class="flex items-center {sidebarState.isCollapsed ? 'justify-center' : 'gap-3'} rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground hover:opacity-80"
						class:bg-primary={$page.url.pathname === item.url}
						class:text-primary-foreground={$page.url.pathname === item.url}
						title={sidebarState.isCollapsed ? item.title : ''}
						data-testid={item.title === 'Dashboard'
							? 'nav-dashboard'
							: item.title === 'Employees'
								? 'nav-employees'
								: item.title === 'Events'
									? 'nav-events'
									: null}
					>
						<Icon class="h-4 w-4" />
						{#if !sidebarState.isCollapsed}
							{item.title}
						{/if}
					</a>
				{:else}
					<!-- Dropdown Menu section -->
					{@const Icon = item.icon}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger class="w-full focus:outline-none">
							<div
								class="flex w-full items-center {sidebarState.isCollapsed ? 'justify-center' : 'justify-between'} rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground hover:opacity-80"
								class:bg-primary={(() => {
									const currentPath = $page.url.pathname;
									if (item.section === 'leave') {
										return currentPath.includes('/attendance') || currentPath.includes('/leave');
									}
									if (item.section === 'performance') {
										return currentPath.includes('/performance');
									}
									if (item.section === 'tasks') {
										return (
											currentPath.includes('/tasks') && !currentPath.includes('/tasks/department')
										);
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
									if (item.section === 'tasks') {
										return (
											currentPath.includes('/tasks') && !currentPath.includes('/tasks/department')
										);
									}
									return false;
								})()}
								title={sidebarState.isCollapsed ? item.title : ''}
								data-testid={item.title === 'Tasks' ? 'nav-tasks' : null}
							>
								<div class="flex items-center gap-3">
									<Icon class="h-4 w-4" />
									{#if !sidebarState.isCollapsed}
										{item.title}
									{/if}
								</div>
								{#if !sidebarState.isCollapsed}
									<ChevronRight class="h-3 w-3 text-sidebar-foreground/50" />
								{/if}
							</div>
						</DropdownMenu.Trigger>

						<DropdownMenu.Content side="right" align="start" class="w-48 ml-2">
							{#if item.items}
								{#each item.items as subItem}
									<DropdownMenu.Item>
										<a href={subItem.url} data-sveltekit-reload class="flex w-full items-center">
											{subItem.title}
										</a>
									</DropdownMenu.Item>
								{/each}
							{/if}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{/if}
			{/each}
		</nav>
	</div>

	<!-- Management Section - Permission-based access -->
	{#if canAccessManagement}
		<div class="px-3 pb-3">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger class="w-full focus:outline-none">
					<div
						class="flex w-full items-center {sidebarState.isCollapsed ? 'justify-center' : 'justify-between'} rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground hover:opacity-80"
						class:bg-primary={$page.url.pathname.includes('/management')}
						class:text-primary-foreground={$page.url.pathname.includes('/management')}
						title={sidebarState.isCollapsed ? 'Management' : ''}
					>
						<div class="flex items-center gap-3">
							<UserCheck class="h-4 w-4" />
							{#if !sidebarState.isCollapsed}
								Management
							{/if}
						</div>
						{#if !sidebarState.isCollapsed}
							<ChevronRight class="h-3 w-3 text-sidebar-foreground/50" />
						{/if}
					</div>
				</DropdownMenu.Trigger>
				
				<DropdownMenu.Content side="right" align="start" class="w-56 ml-2">
					{#each filteredManagementItems as item}
						{@const ItemIcon = item.icon}
						<DropdownMenu.Item>
							<a href={item.url} data-sveltekit-reload class="flex items-center w-full">
								<ItemIcon class="mr-2 h-4 w-4" />
								<span class="flex-1">{item.title}</span>
								<span class="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
									Team
								</span>
							</a>
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	{/if}

	<!-- Administration Section (Bottom) - Only for hr_admin and system_admin -->
	{#if canAccessAdministration}
		<div class="px-3 pb-3">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger class="w-full focus:outline-none">
					<div
						class="flex w-full items-center {sidebarState.isCollapsed ? 'justify-center' : 'justify-between'} rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground hover:opacity-80"
						class:bg-primary={$page.url.pathname.includes('/admin') ||
							$page.url.pathname === '/dashboard/tasks'}
						class:text-primary-foreground={$page.url.pathname.includes('/admin') ||
							$page.url.pathname === '/dashboard/tasks'}
						data-testid="nav-admin"
						title={sidebarState.isCollapsed ? 'Administration' : ''}
					>
						<div class="flex items-center gap-3">
							<Shield class="h-4 w-4" />
							{#if !sidebarState.isCollapsed}
								Administration
							{/if}
						</div>
						{#if !sidebarState.isCollapsed}
							<ChevronRight class="h-3 w-3 text-sidebar-foreground/50" />
						{/if}
					</div>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content side="right" align="end" class="w-56 ml-2">
					{#each filteredAdminItems as item}
						{@const ItemIcon = item.icon}
						<DropdownMenu.Item>
							<a href={item.url} data-sveltekit-reload class="flex items-center w-full">
								<ItemIcon class="mr-2 h-4 w-4" />
								<span class="flex-1">{item.title}</span>
								<!-- Badge indicating access level -->
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
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	{/if}

	<!-- Debug Info (system_admin only) -->
	{#if showDebugInfo}
		<div class="px-3 pb-3">
			<DebugInfo />
		</div>
	{/if}

	<!-- User Profile & Settings Footer -->
	{#if auth.user}
		<div class="{sidebarState.isCollapsed ? 'px-2' : 'px-3'} py-3">
			<div class="flex items-center {sidebarState.isCollapsed ? 'justify-center' : 'justify-between'}">
				<!-- Profile Link (left side) -->
				<a
					href="/dashboard/profile"
					class="flex items-center gap-2 rounded-md {sidebarState.isCollapsed ? 'p-2' : 'pr-2'} transition-colors hover:bg-sidebar-accent/50 flex-1 min-w-0 {sidebarState.isCollapsed ? 'justify-center' : ''}"
					title={sidebarState.isCollapsed ? 'My Profile' : ''}
					data-testid="nav-profile"
				>
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
						<User class="h-4 w-4" />
					</div>
					{#if !sidebarState.isCollapsed}
						<div class="min-w-0 flex-1">
							<p class="truncate text-xs font-medium">
								{auth.user.firstName || auth.user.displayName || 'User'}
							</p>
							<p class="truncate text-xs text-sidebar-foreground/60">
								{auth.user.email?.split('@')[0] || 'user'}
							</p>
						</div>
					{/if}
				</a>

				<!-- Theme Toggle and Settings (right side) -->
				{#if !sidebarState.isCollapsed}
					<div class="flex items-center space-x-0.5 flex-none">
						<!-- Logout Button -->
						<button
							onclick={handleLogout}
							class="flex items-center justify-center rounded-md p-1 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
							title="Logout"
						>
							<LogOut class="h-4 w-4" />
						</button>

						<!-- Dark Mode Toggle -->
						<button
							onclick={toggleMode}
							class="flex items-center justify-center rounded-md p-1 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
							title="Toggle theme"
						>
							{#if mode?.current === 'dark'}
								<Sun class="h-4 w-4" />
							{:else}
								<Moon class="h-4 w-4" />
							{/if}
						</button>

						<!-- Settings Icon -->
						<a
							href="/dashboard/profile/settings"
							class="flex items-center justify-center rounded-md p-1 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
							title="Settings"
							data-testid="nav-settings"
						>
							<Settings class="h-4 w-4" />
						</a>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
