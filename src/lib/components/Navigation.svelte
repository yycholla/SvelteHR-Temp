<!--
	Navigation Component
	
	Main navigation with RBAC (Role-Based Access Control) visibility
	Responsive design with mobile menu and permission-based menu items
	
	Usage:
	<Navigation user={data.user} permissions={data.permissions} />
-->

<script lang="ts">
	import { cn } from '$lib/utils';
	import { page } from '$app/stores';
	import Button from './ui/Button.svelte';

	// Navigation item interface
	interface NavigationItem {
		label: string;
		href: string;
		icon?: string;
		badge?: string | number;
		permissions?: string[]; // Required permissions to view this item
		roles?: string[]; // Required roles to view this item
		children?: NavigationItem[];
		divider?: boolean;
	}

	// User interface
	interface User {
		id: string;
		email: string;
		full_name?: string;
		avatar_url?: string;
		roles: Array<{ id: string; name: string; level: number }>;
	}

	// Component props
	interface NavigationProps {
		user?: User;
		permissions?: string[];
		class?: string;
		variant?: 'sidebar' | 'header' | 'mobile';
		collapsed?: boolean;
		showUserMenu?: boolean;
		onLogout?: () => void;
	}

	let {
		user,
		permissions = [],
		class: className = '',
		variant = 'sidebar',
		collapsed = $bindable(false),
		showUserMenu = true,
		onLogout
	}: NavigationProps = $props();

	// Internal state
	let mobileMenuOpen = $state(false);
	let userMenuOpen = $state(false);

	// Navigation items configuration
	const navigationItems: NavigationItem[] = [
		{
			label: 'Dashboard',
			href: '/',
			icon: '🏠'
		},
		{
			label: 'Employees',
			href: '/employees',
			icon: '👥',
			permissions: ['employees:read'],
			children: [
				{
					label: 'All Employees',
					href: '/employees',
					permissions: ['employees:read']
				},
				{
					label: 'Add Employee',
					href: '/employees/new',
					permissions: ['employees:write']
				},
				{
					label: 'Employee Reports',
					href: '/employees/reports',
					permissions: ['employees:read', 'reports:hr']
				}
			]
		},
		{
			label: 'HR Management',
			href: '/hr',
			icon: '📋',
			roles: ['HR_Manager', 'Admin'],
			children: [
				{
					label: 'Department Management',
					href: '/hr/departments',
					permissions: ['departments:read']
				},
				{
					label: 'Role Management',
					href: '/hr/roles',
					permissions: ['roles:read']
				},
				{
					label: 'Compliance',
					href: '/hr/compliance',
					permissions: ['compliance:read']
				},
				{
					label: 'Performance Reviews',
					href: '/hr/performance',
					permissions: ['performance:read']
				}
			]
		},
		{
			label: 'Communications',
			href: '/communications',
			icon: '💬',
			badge: '3', // This would be dynamic based on unread count
			permissions: ['communications:read']
		},
		{
			label: 'Calendar',
			href: '/calendar',
			icon: '📅',
			permissions: ['calendar:read']
		},
		{
			label: 'Reports',
			href: '/reports',
			icon: '📊',
			permissions: ['reports:read'],
			children: [
				{
					label: 'Team Reports',
					href: '/reports/team',
					permissions: ['reports:team']
				},
				{
					label: 'HR Reports',
					href: '/reports/hr',
					permissions: ['reports:hr']
				},
				{
					label: 'Financial Reports',
					href: '/reports/financial',
					roles: ['Admin'],
					permissions: ['reports:financial']
				}
			]
		},
		{
			label: 'Settings',
			href: '/settings',
			icon: '⚙️',
			divider: true,
			children: [
				{
					label: 'Profile Settings',
					href: '/settings/profile'
				},
				{
					label: 'System Settings',
					href: '/settings/system',
					roles: ['Admin']
				},
				{
					label: 'User Management',
					href: '/settings/users',
					permissions: ['users:read'],
					roles: ['Admin', 'HR_Manager']
				}
			]
		}
	];

	// Check if user has required permissions
	function hasPermission(requiredPermissions?: string[]): boolean {
		if (!requiredPermissions || requiredPermissions.length === 0) return true;
		if (permissions.includes('*')) return true; // Admin wildcard
		return requiredPermissions.some(permission => permissions.includes(permission));
	}

	// Check if user has required role
	function hasRole(requiredRoles?: string[]): boolean {
		if (!requiredRoles || requiredRoles.length === 0) return true;
		if (!user?.roles) return false;
		return requiredRoles.some(role => user.roles.some(userRole => userRole.name === role));
	}

	// Check if navigation item should be visible
	function isItemVisible(item: NavigationItem): boolean {
		return hasPermission(item.permissions) && hasRole(item.roles);
	}

	// Filter visible navigation items
	$: visibleItems = navigationItems
		.filter(isItemVisible)
		.map(item => ({
			...item,
			children: item.children?.filter(isItemVisible)
		}));

	// Check if current page matches navigation item
	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}

	// Navigation container classes
	$: containerClasses = cn(
		'flex flex-col h-full bg-background border-r',
		variant === 'sidebar' && 'w-64',
		variant === 'sidebar' && collapsed && 'w-16',
		variant === 'header' && 'w-full h-16 flex-row border-r-0 border-b',
		variant === 'mobile' && 'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform',
		variant === 'mobile' && !mobileMenuOpen && '-translate-x-full',
		className
	);

	// Navigation list classes
	$: listClasses = cn(
		'flex flex-1 flex-col gap-1 p-4',
		variant === 'header' && 'flex-row items-center gap-6 px-6'
	);

	// Navigation item classes
	$: getItemClasses = (href: string, hasChildren = false) => cn(
		'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
		'text-muted-foreground transition-colors hover:text-foreground hover:bg-accent',
		'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
		isActive(href) && 'bg-accent text-foreground',
		collapsed && variant === 'sidebar' && 'justify-center px-2'
	);

	// Handle mobile menu toggle
	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	// Handle user menu toggle
	function toggleUserMenu() {
		userMenuOpen = !userMenuOpen;
	}

	// Handle logout
	function handleLogout() {
		userMenuOpen = false;
		onLogout?.();
	}

	// Close mobile menu when clicking outside
	function handleBackdropClick() {
		mobileMenuOpen = false;
	}
</script>

<!-- Mobile menu backdrop -->
{#if variant === 'mobile' && mobileMenuOpen}
	<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
		onclick={handleBackdropClick}
	></div>
{/if}

<nav class={containerClasses} aria-label="Main navigation">
	<!-- Header section for sidebar variant -->
	{#if variant === 'sidebar'}
		<div class="flex items-center gap-3 p-4 border-b">
			{#if !collapsed}
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
						<span class="text-primary-foreground font-bold text-sm">HR</span>
					</div>
					<span class="font-semibold text-foreground">MountainHR</span>
				</div>
			{:else}
				<div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto">
					<span class="text-primary-foreground font-bold text-sm">HR</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Mobile menu toggle for header variant -->
	{#if variant === 'header'}
		<Button
			variant="ghost"
			size="sm"
			class="md:hidden"
			onclick={toggleMobileMenu}
			aria-label="Toggle mobile menu"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
			</svg>
		</Button>
	{/if}

	<!-- Navigation items -->
	<div class={listClasses}>
		{#each visibleItems as item}
			{#if item.divider}
				<hr class="my-2 border-border" />
			{/if}

			<div>
				<!-- Main navigation item -->
				<a
					href={item.href}
					class={getItemClasses(item.href, Boolean(item.children))}
					aria-current={isActive(item.href) ? 'page' : undefined}
				>
					{#if item.icon}
						<span class="text-lg" aria-hidden="true">{item.icon}</span>
					{/if}
					{#if !collapsed || variant !== 'sidebar'}
						<span class="truncate">{item.label}</span>
						{#if item.badge}
							<span class="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
								{item.badge}
							</span>
						{/if}
					{/if}
				</a>

				<!-- Sub-navigation items -->
				{#if item.children && !collapsed && variant === 'sidebar'}
					<div class="ml-6 mt-1 space-y-1">
						{#each item.children as child}
							<a
								href={child.href}
								class={cn(
									'block rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground',
									'hover:text-foreground hover:bg-accent transition-colors',
									isActive(child.href) && 'text-foreground bg-accent'
								)}
								aria-current={isActive(child.href) ? 'page' : undefined}
							>
								{child.label}
							</a>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- User menu section -->
	{#if showUserMenu && user && variant === 'sidebar'}
		<div class="border-t p-4">
			<div class="relative">
				<button
					type="button"
					class={cn(
						'flex w-full items-center gap-3 rounded-md p-2 text-sm',
						'hover:bg-accent transition-colors',
						'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
						collapsed && 'justify-center'
					)}
					onclick={toggleUserMenu}
					aria-expanded={userMenuOpen}
					aria-haspopup="true"
				>
					<div class="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
						{#if user.avatar_url}
							<img
								src={user.avatar_url}
								alt={user.full_name || user.email}
								class="w-8 h-8 rounded-full"
							/>
						{:else}
							<span class="text-sm font-medium">
								{(user.full_name || user.email).charAt(0).toUpperCase()}
							</span>
						{/if}
					</div>
					
					{#if !collapsed}
						<div class="flex-1 text-left">
							<p class="font-medium text-foreground truncate">
								{user.full_name || user.email}
							</p>
							<p class="text-xs text-muted-foreground truncate">
								{user.roles[0]?.name || 'Employee'}
							</p>
						</div>
						
						<svg
							class="w-4 h-4 text-muted-foreground transition-transform"
							class:rotate-180={userMenuOpen}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
						</svg>
					{/if}
				</button>

				<!-- User dropdown menu -->
				{#if userMenuOpen && !collapsed}
					<div class="absolute bottom-full left-0 right-0 mb-2 bg-background border rounded-md shadow-lg py-1">
						<a
							href="/profile"
							class="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
						>
							<span>👤</span>
							Profile
						</a>
						<a
							href="/settings"
							class="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
						>
							<span>⚙️</span>
							Settings
						</a>
						<hr class="my-1 border-border">
						<button
							type="button"
							class="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
							onclick={handleLogout}
						>
							<span>🚪</span>
							Logout
						</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Sidebar collapse toggle -->
	{#if variant === 'sidebar'}
		<div class="border-t p-2">
			<Button
				variant="ghost"
				size="sm"
				class="w-full"
				onclick={() => collapsed = !collapsed}
				aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
			>
				<svg
					class="w-4 h-4 transition-transform"
					class:rotate-180={collapsed}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
				</svg>
			</Button>
		</div>
	{/if}
</nav>

<style>
	/* Ensure proper focus visibility */
	a:focus-visible,
	button:focus-visible {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
	}

	/* Smooth transitions for mobile menu */
	nav.transform {
		transition: transform 0.3s ease-in-out;
	}

	/* Badge animation */
	.bg-destructive {
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.8;
		}
	}
</style>