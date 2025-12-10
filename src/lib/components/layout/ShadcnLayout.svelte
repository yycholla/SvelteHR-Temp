<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Bell,
		Building2,
		Calendar,
		Home,
		Menu,
		Search,
		Settings,
		User,
		Users
	} from '@lucide/svelte';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth.svelte';
	import type { ComponentType } from 'svelte';

	interface NavigationItem {
		id: string;
		label: string;
		href: string;
		icon: ComponentType;
		active: boolean;
		children?: Array<{
			id: string;
			label: string;
			href: string;
			active?: boolean;
		}>;
	}

	interface Breadcrumb {
		label: string;
		href: string;
		current: boolean;
	}

	const { children } = $props();

	// Navigation items based on user role and permissions
	const navigationItems: NavigationItem[] = [
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
			icon: Users,
			active: false,
			children: [
				{ id: 'employees-list', label: 'All Employees', href: '/employees' },
				{ id: 'employees-add', label: 'Add Employee', href: '/employees/new' },
				{ id: 'employees-directory', label: 'Directory', href: '/employees/directory' }
			]
		},
		{
			id: 'departments',
			label: 'Departments',
			href: '/departments',
			icon: Building2,
			active: false,
			children: [
				{ id: 'departments-list', label: 'All Departments', href: '/departments' },
				{ id: 'departments-add', label: 'Create Department', href: '/departments/new' }
			]
		},
		{
			id: 'leave',
			label: 'Leave & Attendance',
			href: '/leave',
			icon: Calendar,
			active: false,
			children: [
				{ id: 'leave-my', label: 'My Attendance', href: '/attendance/my' },
				{ id: 'leave-requests', label: 'Leave Requests', href: '/leave/requests' },
				{ id: 'leave-new', label: 'Submit Leave', href: '/leave/new' }
			]
		}
	];

	// Admin navigation
	const adminNavigation: NavigationItem[] = [
		{
			id: 'admin',
			label: 'Administration',
			href: '/dashboard/admin',
			icon: Settings,
			active: false
		}
	];

	// Sample notifications for the notification indicator
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

	// Calculate unread notifications
	const unreadNotifications = $derived(() => notifications.filter((n) => !n.read).length);

	// Add admin navigation if user has admin role
	const visibleNavigation = $derived(() => {
		const nav: NavigationItem[] = [...navigationItems];
		if (auth.user?.role === 'admin' || auth.user?.role === 'hr_admin') {
			nav.push(...adminNavigation);
		}
		return nav;
	});

	// Update navigation active states based on current path
	const currentPath = $derived($page.url.pathname);

	// Update active states
	$effect(() => {
		navigationItems.forEach((item) => {
			item.active = currentPath === item.href || currentPath.startsWith(item.href + '/');
			if (item.children) {
				item.children.forEach((child) => {
					child.active = currentPath === child.href;
				});
			}
		});
	});

	// Generate breadcrumbs based on current path
	const breadcrumbs: Breadcrumb[] = $derived.by(() => {
		const parts = currentPath.split('/').filter((part) => part);
		const breadcrumbs: Breadcrumb[] = [];

		const labelMap: Record<string, string> = {
			dashboard: 'Dashboard',
			employees: 'Employees',
			departments: 'Departments',
			leave: 'Leave',
			attendance: 'Attendance',
			admin: 'Administration',
			new: 'New',
			edit: 'Edit',
			directory: 'Directory'
		};

		let currentPath = '';
		parts.forEach((part, index) => {
			currentPath += `/${part}`;
			breadcrumbs.push({
				label: labelMap[part] || part.charAt(0).toUpperCase() + part.slice(1),
				href: currentPath,
				current: index === parts.length - 1
			});
		});

		return breadcrumbs;
	});
</script>

<!-- Only show layout if authenticated -->
{#if auth.isAuthenticated && auth.user}
	<Sidebar.Provider>
		<div class="flex h-screen bg-background">
			<!-- Sidebar -->
			<Sidebar.Root class="border-r">
				<Sidebar.Header>
					<div class="flex items-center gap-2 px-4 py-3">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
						>
							<Building2 class="h-4 w-4" />
						</div>
						<div class="flex flex-col">
							<span class="text-sm font-semibold">MountainHR</span>
							<span class="text-xs text-muted-foreground">HR Management</span>
						</div>
					</div>
				</Sidebar.Header>

				<Sidebar.Content>
					<Sidebar.Group>
						<Sidebar.GroupLabel>Navigation</Sidebar.GroupLabel>
						<Sidebar.Menu>
							{#each visibleNavigation as item}
								{@const typedItem = item as NavigationItem}
								{@const ItemIcon = typedItem.icon}
								<Sidebar.MenuItem>
									{#if typedItem.children && typedItem.children.length > 0}
										<Sidebar.MenuButton asChild>
											<a
												href={typedItem.href}
												class="flex items-center gap-2"
												data-active={typedItem.active}
											>
												<ItemIcon class="h-4 w-4" />
												<span>{typedItem.label}</span>
											</a>
										</Sidebar.MenuButton>
										<Sidebar.MenuSub>
											{#each typedItem.children as child}
												<Sidebar.MenuSubItem>
													<Sidebar.MenuSubButton asChild>
														<a href={child.href} data-active={child.active}>
															{child.label}
														</a>
													</Sidebar.MenuSubButton>
												</Sidebar.MenuSubItem>
											{/each}
										</Sidebar.MenuSub>
									{:else}
										<Sidebar.MenuButton asChild>
											<a
												href={typedItem.href}
												class="flex items-center gap-2"
												data-active={typedItem.active}
											>
												<ItemIcon class="h-4 w-4" />
												<span>{typedItem.label}</span>
											</a>
										</Sidebar.MenuButton>
									{/if}
								</Sidebar.MenuItem>
							{/each}
						</Sidebar.Menu>
					</Sidebar.Group>
				</Sidebar.Content>

				<Sidebar.Footer>
					<div class="flex items-center gap-2 px-4 py-3">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
							<User class="h-4 w-4" />
						</div>
						<div class="flex flex-col">
							<span class="text-sm font-medium">{auth.user.name || 'User'}</span>
							<span class="text-xs text-muted-foreground">{auth.user.role || 'Employee'}</span>
						</div>
					</div>
				</Sidebar.Footer>
			</Sidebar.Root>

			<!-- Main Content Area -->
			<div class="flex flex-1 flex-col">
				<!-- Header/Topbar -->
				<header class="border-b bg-background px-6 py-4">
					<div class="flex items-center justify-between">
						<!-- Left side: Sidebar trigger and breadcrumbs -->
						<div class="flex items-center gap-4">
							<Sidebar.Trigger />

							<!-- Breadcrumbs -->
							{#if breadcrumbs.length > 0}
								<nav class="flex items-center space-x-1 text-sm text-muted-foreground">
									{#each breadcrumbs as crumb: Breadcrumb, index}
										{#if index > 0}
											<span>/</span>
										{/if}
										{#if crumb.current}
											<span class="font-medium text-foreground">{crumb.label}</span>
										{:else}
											<a href={crumb.href} class="transition-colors hover:text-foreground">
												{crumb.label}
											</a>
										{/if}
									{/each}
								</nav>
							{/if}
						</div>

						<!-- Right side: Actions and user menu -->
						<div class="flex items-center gap-4">
							<!-- Search -->
							<Button variant="ghost" size="sm" class="h-8 w-8 p-0">
								<Search class="h-4 w-4" />
								<span class="sr-only">Search</span>
							</Button>

							<!-- Notifications -->
							<div class="relative">
								<Button variant="ghost" size="sm" class="h-8 w-8 p-0">
									<Bell class="h-4 w-4" />
									<span class="sr-only">Notifications</span>
								</Button>
								{#if unreadNotifications > 0}
									<Badge variant="destructive" class="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
										{unreadNotifications}
									</Badge>
								{/if}
							</div>

							<Separator orientation="vertical" class="h-6" />

							<!-- User menu -->
							<div class="flex items-center gap-2">
								<div class="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
									<User class="h-4 w-4" />
								</div>
								<div class="flex flex-col">
									<span class="text-sm font-medium">{auth.user.name || 'User'}</span>
									<span class="text-xs text-muted-foreground">{auth.user.email || ''}</span>
								</div>
							</div>
						</div>
					</div>
				</header>

				<!-- Page Content -->
				<main class="flex-1 overflow-auto p-6">
					{@render children()}
				</main>
			</div>
		</div>
	</Sidebar.Provider>
{:else}
	<!-- Loading state while authentication is being determined -->
	<div class="flex min-h-screen items-center justify-center bg-background">
		<div class="flex flex-col items-center gap-4">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
			<p class="text-sm text-muted-foreground">Loading application...</p>
		</div>
	</div>
{/if}
