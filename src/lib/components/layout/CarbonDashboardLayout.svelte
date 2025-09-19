<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { isAuthenticated, isLoading, authStore } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import {
		Header,
		HeaderNav,
		HeaderNavItem,
		HeaderUtilities,
		HeaderGlobalAction,
		HeaderPanelLinks,
		HeaderPanelLink,
		HeaderPanelDivider,
		SideNav,
		SideNavItems,
		SideNavLink,
		SideNavMenu,
		SideNavMenuItem,
		Content,
		SkipToContent
	} from 'carbon-components-svelte';
	import {
		Home,
		User,
		UserMultiple,
		Building,
		Checkmark,
		Calendar,
		UserFilled,
		Document,
		Settings,
		Help,
		Search,
		Notification,
		UserAvatar,
		Logout,
		Menu
	} from 'carbon-icons-svelte';

	// Main layout state
	let isSideNavOpen = false;
	let isUserMenuOpen = false;
	let isNotificationPanelOpen = false;

	let user = $state({
		name: '',
		email: '',
		role: '',
		permissions: [] as string[],
		avatar: null as string | null
	});

	// Navigation items based on Carbon expectations
	const primaryNavigation = [
		{
			id: 'dashboard',
			label: 'Dashboard',
			href: '/dashboard',
			icon: Home,
			active: false
		},
		{
			id: 'employees',
			label: 'Employees',
			href: '/employees',
			icon: User,
			active: false,
			children: [
				{ id: 'employees-list', label: 'All Employees', href: '/employees', active: false },
				{ id: 'employees-add', label: 'Add Employee', href: '/employees/new', active: false },
				{
					id: 'employees-directory',
					label: 'Directory',
					href: '/employees/directory',
					active: false
				}
			]
		},
		{
			id: 'departments',
			label: 'Departments',
			href: '/departments',
			icon: Building,
			active: false,
			children: [
				{ id: 'departments-list', label: 'All Departments', href: '/departments', active: false },
				{
					id: 'departments-add',
					label: 'Create Department',
					href: '/departments/new',
					active: false
				}
			]
		},
		{
			id: 'tasks',
			label: 'Tasks',
			href: '/tasks',
			icon: Checkmark,
			active: false,
			children: [
				{ id: 'tasks-my', label: 'My Tasks', href: '/tasks/my', active: false },
				{ id: 'tasks-all', label: 'All Tasks', href: '/tasks', active: false },
				{ id: 'tasks-add', label: 'Create Task', href: '/tasks/new', active: false }
			]
		},
		{
			id: 'attendance',
			label: 'Leave & Attendance',
			href: '/leave',
			icon: Calendar,
			active: false,
			children: [
				{ id: 'leave-my', label: 'My Attendance', href: '/attendance/my', active: false },
				{ id: 'leave-requests', label: 'Leave Requests', href: '/leave/requests', active: false },
				{ id: 'leave-new', label: 'Submit Leave', href: '/leave/new', active: false }
			]
		},
		{
			id: 'onboarding',
			label: 'Onboarding',
			href: '/onboarding',
			icon: UserFilled,
			active: false,
			children: [
				{ id: 'onboarding-all', label: 'All Onboarding', href: '/onboarding', active: false },
				{ id: 'onboarding-new', label: 'Start Onboarding', href: '/onboarding/new', active: false }
			]
		}
	];

	// Admin navigation
	const adminNavigation = [
		{
			id: 'admin',
			label: 'Administration',
			href: '/admin',
			icon: Settings,
			active: false
		}
	];

	// Sample notifications
	const notifications = [
		{
			id: '1',
			message: 'Your leave request has been approved',
			timestamp: new Date().toISOString(),
			read: false
		},
		{
			id: '2',
			message: 'New employee onboarding assigned',
			timestamp: new Date(Date.now() - 3600000).toISOString(),
			read: true
		}
	];

	// Add admin navigation if user has admin role
	let visibleNavigation = $derived(() => {
		const nav = [...primaryNavigation];
		if (user.role === 'admin' || user.role === 'hr_admin') {
			nav.push(...adminNavigation);
		}
		return nav;
	});

	// Calculate unread notifications
	let unreadNotifications = $derived(() => notifications.filter((n) => !n.read).length);

	// User actions
	const userActions = [
		{
			id: 'profile',
			label: 'View Profile',
			href: '/profile',
			icon: UserAvatar
		},
		{
			id: 'settings',
			label: 'Settings',
			href: '/settings',
			icon: Settings
		},
		{
			id: 'help',
			label: 'Help & Support',
			href: '/help',
			icon: Help
		},
		{
			id: 'logout',
			label: 'Sign out',
			icon: Logout,
			action: async () => {
				await authStore.logout();
				goto('/login');
			}
		}
	];

	// Breadcrumbs
	let breadcrumbs = $state([]);

	// Update navigation based on current path
	function updateNavigation() {
		const currentPath = $page.url.pathname;

		// Update active states for nav items
		primaryNavigation.forEach((item) => {
			item.active = currentPath === item.href || currentPath.startsWith(item.href + '/');
			if (item.children) {
				item.children.forEach((child) => {
					child.active = currentPath === child.href;
				});
			}
		});

		// adminNavigation.forEach(item => {
		//   item.active = currentPath === item.href || currentPath.startsWith(item.href + '/');
		// });

		// Generate breadcrumbs
		breadcrumbs = generateBreadcrumbs(currentPath);
	}

	function generateBreadcrumbs(path: string) {
		const parts = path.split('/').filter((part) => part);
		const breadcrumbs = [];

		let currentPath = '';
		parts.forEach((part, index) => {
			currentPath += `/${part}`;

			// Map path parts to labels
			const labelMap: Record<string, string> = {
				dashboard: 'Dashboard',
				employees: 'Employees',
				departments: 'Departments',
				tasks: 'Tasks',
				attendance: 'Attendance',
				leave: 'Leave',
				onboarding: 'Onboarding',
				admin: 'Administration',
				new: 'New',
				edit: 'Edit',
				directory: 'Directory'
			};

			breadcrumbs.push({
				label: labelMap[part] || part.charAt(0).toUpperCase() + part.slice(1),
				href: currentPath,
				current: index === parts.length - 1
			});
		});

		return breadcrumbs;
	}

	// Handle navigation
	function handleNavigate(item: any) {
		console.log('Navigating to:', item);
		// Navigation is handled by SvelteKit
	}

	// Handle user actions
	function handleUserAction(action: any) {
		if (action.action) {
			action.action();
		}
	}

	// Handle search
	function handleSearch(query: string) {
		console.log('Searching for:', query);
	}

	// Update user data from auth store
	$effect(() => {
		if ($authStore?.user) {
			user = {
				name: $authStore.user.name || 'User',
				email: $authStore.user.email || '',
				role: $authStore.user.role || 'Employee',
				permissions: $authStore.user.permissions || [],
				avatar: $authStore.user.avatar
			};
		}
	});

	// Update navigation on page changes
	$effect(() => {
		updateNavigation();
	});

	onMount(() => {
		updateNavigation();
	});

	let { children } = $props();
</script>

<!-- Only show Carbon UI Shell if authenticated -->
{#if $isAuthenticated && user.name}
	<Header company="SvelteHR" platformName="HR Management" bind:isSideNavOpen>
		<div slot="skip-to-content">
			<SkipToContent href="#main-content" />
		</div>

		<HeaderNav>
			{#each visibleNavigation as item}
				{#if item.children && item.children.length > 0}
					<HeaderNavMenu text={item.label}>
						{#each item.children as child}
							<HeaderNavItem href={child.href} text={child.label} />
						{/each}
					</HeaderNavMenu>
				{:else}
					<HeaderNavItem href={item.href} text={item.label} />
				{/if}
			{/each}
		</HeaderNav>

		<HeaderUtilities>
			<HeaderGlobalAction aria-label="Search" tooltipText="Search">
				<Search />
			</HeaderGlobalAction>

			{#if notifications.length > 0}
				<HeaderGlobalAction
					aria-label="Notifications"
					tooltipText="Notifications"
					bind:isOpen={isNotificationPanelOpen}
				>
					<Notification />
					{#if unreadNotifications > 0}
						<span class="notification-dot">{unreadNotifications}</span>
					{/if}

					<HeaderPanelLinks slot="panel">
						<div class="notification-panel">
							<h4>Notifications</h4>
							<HeaderPanelDivider />
							{#each notifications as notification}
								<HeaderPanelLink>
									<div class="notification-item">
										<p>{notification.message}</p>
										<small>{new Date(notification.timestamp).toLocaleDateString()}</small>
									</div>
								</HeaderPanelLink>
							{/each}
						</div>
					</HeaderPanelLinks>
				</HeaderGlobalAction>
			{/if}

			<HeaderGlobalAction
				aria-label="User Avatar"
				tooltipText={`${user.name} (${user.role})`}
				bind:isOpen={isUserMenuOpen}
			>
				<UserAvatar />

				<HeaderPanelLinks slot="panel">
					<div class="user-panel">
						<div class="user-info">
							<h4>{user.name}</h4>
							<p>{user.email}</p>
							<small>{user.role}</small>
						</div>
						<HeaderPanelDivider />
						{#each userActions as action}
							<HeaderPanelLink on:click={() => handleUserAction(action)}>
								{action.label}
							</HeaderPanelLink>
						{/each}
					</div>
				</HeaderPanelLinks>
			</HeaderGlobalAction>
		</HeaderUtilities>
	</Header>

	<SideNav bind:isOpen={isSideNavOpen}>
		<SideNavItems>
			{#each visibleNavigation as item}
				{#if item.children && item.children.length > 0}
					<SideNavMenu text={item.label} icon={item.icon}>
						{#each item.children as child}
							<SideNavMenuItem href={child.href} text={child.label} isSelected={child.active} />
						{/each}
					</SideNavMenu>
				{:else}
					<SideNavLink
						href={item.href}
						text={item.label}
						icon={item.icon}
						isSelected={item.active}
					/>
				{/if}
			{/each}
		</SideNavItems>
	</SideNav>

	<Content id="main-content">
		{@render children?.()}
	</Content>
{:else}
	<!-- Loading state while authentication is being determined -->
	<div class="carbon-loading-state">
		<div class="loading-spinner"></div>
		<p>Loading application...</p>
	</div>
{/if}

<style>
	/* Carbon UI Shell styling improvements */

	/* Notification panel styling */
	.notification-panel {
		padding: var(--cds-spacing-05);
		min-width: 320px;
	}

	.notification-panel h4 {
		font-size: var(--cds-productive-heading-02-font-size);
		font-weight: var(--cds-productive-heading-02-font-weight);
		color: var(--cds-text-primary);
		margin: 0 0 var(--cds-spacing-04) 0;
	}

	.notification-item {
		padding: var(--cds-spacing-04) 0;
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.notification-item:last-child {
		border-bottom: none;
	}

	.notification-item p {
		font-size: var(--cds-body-short-01-font-size);
		color: var(--cds-text-primary);
		margin: 0 0 var(--cds-spacing-02) 0;
	}

	.notification-item small {
		font-size: var(--cds-helper-text-01-font-size);
		color: var(--cds-text-secondary);
	}

	/* Notification dot badge */
	.notification-dot {
		position: absolute;
		top: 8px;
		right: 8px;
		background: var(--cds-support-error);
		color: var(--cds-text-on-color);
		border-radius: 50%;
		min-width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		font-weight: 600;
		line-height: 1;
	}

	/* User panel styling */
	.user-panel {
		padding: var(--cds-spacing-05);
		min-width: 280px;
	}

	.user-info {
		padding-bottom: var(--cds-spacing-04);
	}

	.user-info h4 {
		font-size: var(--cds-productive-heading-02-font-size);
		font-weight: var(--cds-productive-heading-02-font-weight);
		color: var(--cds-text-primary);
		margin: 0 0 var(--cds-spacing-02) 0;
	}

	.user-info p {
		font-size: var(--cds-body-short-01-font-size);
		color: var(--cds-text-secondary);
		margin: 0 0 var(--cds-spacing-02) 0;
	}

	.user-info small {
		font-size: var(--cds-helper-text-01-font-size);
		color: var(--cds-text-tertiary);
		text-transform: capitalize;
	}

	/* Loading state for auth determination */
	.carbon-loading-state {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background-color: var(--cds-background);
		color: var(--cds-text-secondary);
		padding: var(--cds-spacing-06);
		gap: var(--cds-spacing-06);
	}

	.loading-spinner {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--cds-body-short-01-font-size);
	}

	/* Content area improvements */
	:global(.bx--content) {
		background: var(--cds-background);
		min-height: calc(100vh - 48px); /* Account for header height */
	}

	/* Responsive adjustments */
	@media (max-width: 671px) {
		.carbon-loading-state {
			padding: var(--cds-spacing-05);
		}

		.notification-panel,
		.user-panel {
			min-width: 260px;
		}
	}
</style>
