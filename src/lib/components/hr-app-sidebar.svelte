<script lang="ts">
	import { logger } from '$lib/utils/logger';
	import {
		Activity,
		Award,
		BarChart3,
		Bell,
		BookOpen,
		Building2,
		Calendar,
		Clock,
		FileText,
		FolderOpen,
		GraduationCap,
		Home,
		LayoutDashboard,
		ListTodo,
		ScrollText,
		Settings,
		Shield,
		Target,
		User,
		UserCheck,
		Users
	} from '@lucide/svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { page } from '$app/stores';
	import { mode, toggleMode } from 'mode-watcher';
	import { notificationStore } from '$lib/stores/notifications.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { debugSettings } from '$lib/stores/debug-settings.svelte';
	import { sidebarState } from '$lib/stores/sidebar.svelte';
	import DebugInfo from '$lib/components/DebugInfo.svelte';

	// Import decomposed components
	import SidebarHeader from '$lib/components/sidebar/SidebarHeader.svelte';
	import SidebarNav from '$lib/components/sidebar/SidebarNav.svelte';
	import SidebarSection from '$lib/components/sidebar/SidebarSection.svelte';
	import SidebarFooter from '$lib/components/sidebar/SidebarFooter.svelte';

	interface Props {
		permissions: string[];
		systemName?: string;
	}

	const { permissions, systemName = 'MountainHR' }: Props = $props();

	// Notifications
	const notifications = $derived(notificationStore.notifications);

	// Permissions logic
	const userPermissions = $derived(permissions || $page.data.permissions || []);
	const permissionStrings = $derived(
		userPermissions.map((p: any) => {
			if (typeof p === 'string') return p;
			return `${p.resource}:${p.action}`;
		})
	);

	const hasPermission = (permission: string): boolean => {
		const hasWildcard = permissionStrings.includes('*') || permissionStrings.includes('*:*');
		if (hasWildcard) return true;
		if (permissionStrings.includes(permission)) return true;
		if (!permission.includes(':read:')) {
			const parts = permission.split(':');
			if (parts.length === 2 && parts[1] === 'read') {
				const resource = parts[0];
				return (
					permissionStrings.includes(`${resource}:read:self`) ||
					permissionStrings.includes(`${resource}:read:team`) ||
					permissionStrings.includes(`${resource}:read:all`)
				);
			}
		}
		return false;
	};

	const hasAnyPermission = (...permissions: string[]): boolean => {
		if (permissionStrings.includes('*') || permissionStrings.includes('*:*')) return true;
		return permissions.some((p) => hasPermission(p));
	};

	const isSuperAdmin = auth.hasRole('super_admin');
	const isSystemAdmin = auth.hasRole('system_admin');

	onMount(async () => {
		if (isSystemAdmin) {
			debugSettings.load();
		}
	});

	const showDebugInfo = $derived(isSystemAdmin && debugSettings.show_debug_info);

	// Handle logout
	async function handleLogout() {
		try {
			await auth.logout($page.url.pathname);
			goto('/login');
		} catch (error) {
			logger.error('Catch failed', error as Error);
			goto('/login');
		}
	}

	// Main navigation items
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
			permissionAny: ['leave:read', 'attendance:read'],
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
			permissionAny: ['performance:read', 'reviews:read'],
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

	const filteredNavMain = $derived(
		navMain.filter((item) => {
			if ((item as any).permission) return hasPermission((item as any).permission);
			if ((item as any).permissionAny) return hasAnyPermission(...(item as any).permissionAny);
			return true;
		})
	);

	const filteredManagementItems = $derived(
		managementItems.filter((item) => {
			if ((item as any).permission) return hasPermission((item as any).permission);
			if ((item as any).permissionAny) return hasAnyPermission(...(item as any).permissionAny);
			return true;
		})
	);

	const filteredAdminItems = $derived(
		adminItems.filter((item) => {
			if ((item as any).superAdminOnly && !isSuperAdmin) return false;
			if ((item as any).permission) return hasPermission((item as any).permission);
			if ((item as any).permissionAny) return hasAnyPermission(...(item as any).permissionAny);
			return true;
		})
	);

	const canAccessManagement = $derived(filteredManagementItems.length > 0);
	const canAccessAdministration = $derived(filteredAdminItems.length > 0);
</script>

<div class="flex h-full flex-col bg-sidebar text-sidebar-foreground">
	<SidebarHeader
		{systemName}
		isCollapsed={sidebarState.isCollapsed}
		{notifications}
		onToggle={() => sidebarState.toggle()}
	/>

	<SidebarNav
		items={filteredNavMain}
		isCollapsed={sidebarState.isCollapsed}
	/>

	{#if canAccessManagement}
		<SidebarSection
			title="Management"
			icon={UserCheck}
			items={filteredManagementItems}
			isCollapsed={sidebarState.isCollapsed}
			pathMatch="/management"
		/>
	{/if}

	{#if canAccessAdministration}
		<SidebarSection
			title="Administration"
			icon={Shield}
			items={filteredAdminItems}
			isCollapsed={sidebarState.isCollapsed}
			pathMatch="/admin"
			testId="nav-admin"
		/>
	{/if}

	{#if showDebugInfo}
		<div class="px-3 pb-3">
			<DebugInfo />
		</div>
	{/if}

	{#if auth.user}
		<SidebarFooter
			user={auth.user}
			isCollapsed={sidebarState.isCollapsed}
			currentMode={mode.current}
			onLogout={handleLogout}
			onToggleMode={toggleMode}
		/>
	{/if}
</div>