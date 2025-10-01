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
		LayoutDashboard
	} from 'lucide-svelte';
	import { currentUser, hasRole, authActions } from '$lib/stores/auth';
	import { page } from '$app/stores';
	import { themeStore } from '$lib/stores/theme';
	import { goto } from '$app/navigation';

	// Check user roles
	const isAdmin = hasRole('admin');
	const isHR = hasRole('hr_admin') || isAdmin;
	const isManager = hasRole('manager') || isHR;

	// Track which sections are expanded
	let expandedSections = $state({
		leave: false,
		performance: false,
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
		if (
			currentPath.includes('/management') ||
			currentPath.includes('/employees/new') ||
			currentPath.includes('/departments/new') ||
			currentPath.includes('/performance/team') ||
			(currentPath.includes('/tasks') && !currentPath.includes('/users/'))
		) {
			expandedSections.management = true;
		}
		if (currentPath.includes('/admin')) expandedSections.administration = true;
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
			title: 'Leave & Attendance',
			url: `/dashboard/users/${$currentUser?.id}/attendance`,
			icon: Calendar,
			section: 'leave',
			items: [
				{ title: 'My Attendance', url: `/dashboard/users/${$currentUser?.id}/attendance` },
				{ title: 'Leave Requests', url: `/dashboard/users/${$currentUser?.id}/leave/requests` }
			]
		},
		{
			title: 'Performance',
			url: `/dashboard/users/${$currentUser?.id}/performance`,
			icon: Target,
			section: 'performance',
			items: [
				{ title: 'My Goals', url: `/dashboard/users/${$currentUser?.id}/performance` },
				{ title: 'Reviews', url: `/dashboard/users/${$currentUser?.id}/performance/reviews` }
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
	const adminItems = [
		{ title: 'User Management', url: '/dashboard/admin/users', icon: Users },
		{ title: 'System Settings', url: '/dashboard/admin/settings', icon: Settings },
		{ title: 'Audit Logs', url: '/dashboard/admin/audit', icon: FileText },
		{ title: 'Analytics Dashboard', url: '/dashboard/admin/analytics', icon: BarChart3 },
		{ title: 'Compliance Reports', url: '/dashboard/admin/compliance', icon: Shield }
	];
</script>

<div class="flex h-full flex-col bg-sidebar text-sidebar-foreground">
	<!-- Header - Compact -->
	<div class="px-4 py-4">
		<a href="/dashboard" class="flex items-center gap-2 font-semibold">
			<Building2 class="h-5 w-5 text-primary" />
			<span class="text-base">SvelteHR</span>
		</a>
	</div>

	<!-- Main Navigation - Collapsible -->
	<div class="flex-1 overflow-auto px-3 py-3">
		<nav class="space-y-1">
			{#each navMain as item}
				{#if item.standalone}
					<!-- Simple link without submenu -->
					<a
						href={item.url}
						class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground hover:opacity-80"
						class:bg-primary={$page.url.pathname === item.url}
						class:text-primary-foreground={$page.url.pathname === item.url}
					>
						<svelte:component this={item.icon} class="h-4 w-4" />
						{item.title}
					</a>
				{:else}
					<!-- Collapsible section -->
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
								return false;
							})()}
						>
							<div class="flex items-center gap-3">
								<svelte:component this={item.icon} class="h-4 w-4" />
								{item.title}
							</div>
							{#if item.items && item.section}
								<svelte:component
									this={expandedSections[item.section] ? ChevronDown : ChevronRight}
									class="h-3 w-3 text-sidebar-foreground/50"
								/>
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
				<svelte:component
					this={expandedSections.management ? ChevronDown : ChevronRight}
					class="h-3 w-3 text-sidebar-foreground/50"
				/>
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

	<!-- Administration Section (Bottom) - Only for admins -->
	{#if isAdmin}
		<div class="px-3 pb-3">
			<button
				onclick={() => toggleSection('administration')}
				class="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground hover:opacity-80"
				class:bg-primary={$page.url.pathname.includes('/admin')}
				class:text-primary-foreground={$page.url.pathname.includes('/admin')}
			>
				<div class="flex items-center gap-3">
					<Shield class="h-4 w-4" />
					Administration
				</div>
				<svelte:component
					this={expandedSections.administration ? ChevronDown : ChevronRight}
					class="h-3 w-3 text-sidebar-foreground/50"
				/>
			</button>

			{#if expandedSections.administration}
				<div class="ml-4 mt-1 space-y-0.5 pl-3">
					{#each adminItems as item}
						<a
							href={item.url}
							class="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-primary hover:text-primary-foreground hover:opacity-70"
							class:bg-primary={$page.url.pathname === item.url}
							class:text-primary-foreground={$page.url.pathname === item.url}
							class:font-medium={$page.url.pathname === item.url}
						>
							<svelte:component this={item.icon} class="h-3.5 w-3.5" />
							<span class="flex-1">{item.title}</span>
							<!-- T024: "All" badge for admin items -->
							<span class="rounded-sm bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:bg-green-500/20 dark:text-green-400">
								All
							</span>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- User Profile & Settings Footer -->
	{#if $currentUser}
		<div class="px-4 py-3">
			<div class="flex items-center justify-between">
				<!-- Profile Link (left side) -->
				<a
					href="/profile"
					class="flex items-center gap-2 rounded-md pr-2 transition-colors hover:bg-sidebar-accent/50"
					title="My Profile"
				>
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
						<User class="h-4 w-4" />
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-xs font-medium">
							{$currentUser.display_name || 'User'}
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
						onclick={themeStore.toggle}
						class="flex items-center justify-center rounded-md p-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
						title="Toggle theme"
					>
						{#if $themeStore.resolved === 'dark'}
							<Sun class="h-4 w-4" />
						{:else}
							<Moon class="h-4 w-4" />
						{/if}
					</button>

					<!-- Settings Icon -->
					<a
						href="/dashboard/users/{$currentUser?.id}/settings"
						class="flex items-center justify-center rounded-md p-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
						title="Settings"
					>
						<Settings class="h-4 w-4" />
					</a>
				</div>
			</div>
		</div>
	{/if}
</div>
