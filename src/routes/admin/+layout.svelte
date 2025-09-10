<script lang="ts">
	import { page } from '$app/stores';
	import {
		Settings,
		Users,
		Shield,
		Database,
		BarChart3,
		Key,
		Globe,
		Monitor,
		ChevronLeft,
		ChevronRight,
		Server,
		Lock
	} from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { RoleGuard } from '$lib/components/auth';
	import { isAdmin, currentUser } from '$lib/stores/auth.svelte';
	import { roleChecks } from '$lib/auth/guards';

	let { children } = $props();

	let sidebarCollapsed = $state(false);

	// Admin navigation items
	const adminNavItems = [
		{
			href: '/admin',
			label: 'Admin Dashboard',
			icon: BarChart3,
			description: 'System overview and metrics'
		},
		{
			href: '/admin/users',
			label: 'User Management',
			icon: Users,
			description: 'Manage system users and roles'
		},
		{
			href: '/admin/roles',
			label: 'Roles & Permissions',
			icon: Shield,
			description: 'Configure access control'
		},
		{
			href: '/admin/system',
			label: 'System Settings',
			icon: Settings,
			description: 'Application configuration'
		},
		{
			href: '/admin/database',
			label: 'Database Management',
			icon: Database,
			description: 'Database operations and backups'
		},
		{
			href: '/admin/security',
			label: 'Security',
			icon: Lock,
			description: 'Security settings and logs'
		},
		{
			href: '/admin/integrations',
			label: 'Integrations',
			icon: Globe,
			description: 'Third-party integrations'
		},
		{
			href: '/admin/monitoring',
			label: 'System Monitoring',
			icon: Monitor,
			description: 'Performance and health monitoring'
		},
		{
			href: '/admin/reports',
			label: 'System Reports',
			icon: BarChart3,
			description: 'Administrative reports'
		}
	];

	// Check if current route is active
	function isActive(href: string): boolean {
		const currentPath = $page.url.pathname;
		if (href === '/admin') {
			return currentPath === '/admin' || currentPath === '/admin/';
		}
		return currentPath.startsWith(href);
	}

	// Get page title from current route
	const currentItem = $derived(
		adminNavItems.find((item) => isActive(item.href)) || adminNavItems[0]
	);

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
	}
</script>

<RoleGuard roles={['admin', 'super_admin', 'system_admin']} fallback>
	<div
		class="flex h-screen bg-gradient-to-br from-yellow-100/50 via-blue-100/40 to-blue-200/60 dark:from-yellow-900/20 dark:via-blue-900/25 dark:to-blue-800/30"
	>
		<!-- Sidebar -->
		<aside
			class="relative transition-all duration-300 {sidebarCollapsed
				? 'w-16'
				: 'w-64'} flex-shrink-0"
		>
			<!-- Sidebar Content -->
			<div
				class="flex h-full flex-col border-r border-border/40 bg-background/80 shadow-xl backdrop-blur-md"
			>
				<!-- Sidebar Header -->
				<div class="border-b border-border/40 p-4">
					<div class="flex items-center justify-between">
						{#if !sidebarCollapsed}
							<div class="flex items-center space-x-2">
								<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
									<Settings class="h-5 w-5 text-primary-foreground" />
								</div>
								<div class="transition-opacity duration-200">
									<h2 class="text-lg font-semibold">Admin Portal</h2>
									<p class="text-xs text-muted-foreground">System Administration</p>
								</div>
							</div>
						{:else}
							<div class="flex justify-center">
								<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
									<Settings class="h-5 w-5 text-primary-foreground" />
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Navigation -->
				<nav class="flex-1 space-y-1 overflow-y-auto p-4">
					{#each adminNavItems as item}
						{@const IconComponent = item.icon}
						<a
							href={item.href}
							class="group relative flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-accent/50 {isActive(
								item.href
							)
								? 'border-r-2 border-primary bg-primary/10 text-primary'
								: 'text-muted-foreground hover:text-foreground'}"
							title={sidebarCollapsed ? item.label : ''}
						>
							<IconComponent class="h-5 w-5 flex-shrink-0" />
							{#if !sidebarCollapsed}
								<div class="ml-3 flex-1 transition-opacity duration-200">
									<div class="flex items-center justify-between">
										<span class="truncate">{item.label}</span>
										{#if item.badge}
											<Badge variant="secondary" class="ml-2 h-5 px-1.5 text-xs">
												{item.badge}
											</Badge>
										{/if}
									</div>
									<p class="mt-0.5 truncate text-xs text-muted-foreground">
										{item.description}
									</p>
								</div>
							{:else if item.badge}
								<Badge variant="secondary" class="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs">
									{item.badge}
								</Badge>
							{/if}
						</a>
					{/each}
				</nav>

				<!-- Sidebar Footer -->
				<div class="border-t border-border/40 p-4">
					{#if !sidebarCollapsed}
						<div class="flex items-center space-x-3">
							<div class="flex-1">
								<p class="text-sm font-medium">System Administration</p>
								<p class="text-xs text-muted-foreground">MountainCare Healthcare</p>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Sidebar Toggle Button -->
			<Button
				variant="outline"
				size="icon"
				class="absolute top-6 -right-3 z-10 h-6 w-6 rounded-full border bg-background shadow-md transition-all duration-200 hover:shadow-lg"
				onclick={toggleSidebar}
			>
				{#if sidebarCollapsed}
					<ChevronRight class="h-3 w-3" />
				{:else}
					<ChevronLeft class="h-3 w-3" />
				{/if}
			</Button>
		</aside>

		<!-- Main Content -->
		<div class="flex min-w-0 flex-1 flex-col">
			<!-- Header -->
			<header class="border-b border-border/40 bg-background/80 px-6 py-4 backdrop-blur-md">
				<div class="flex items-center justify-between">
					<div class="min-w-0">
						<h1 class="truncate text-2xl font-bold text-foreground">
							{currentItem?.label || 'Admin Portal'}
						</h1>
						{#if currentItem?.description}
							<p class="mt-1 text-sm text-muted-foreground">
								{currentItem.description}
							</p>
						{/if}
					</div>

					<!-- Header Actions -->
					<div class="flex items-center space-x-2">
						<Button variant="outline" size="sm">
							<Server class="mr-2 h-4 w-4" />
							System Status
						</Button>
					</div>
				</div>
			</header>

			<!-- Page Content -->
			<main class="flex-1 overflow-y-auto p-6">
				{@render children?.()}
			</main>
		</div>
	</div>

	<svelte:fragment slot="fallback">
		<div
			class="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900"
		>
			<div
				class="mx-auto max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-lg dark:border-red-700 dark:bg-gray-800"
			>
				<Shield class="mx-auto mb-4 h-16 w-16 text-red-500" />
				<h1 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
				<p class="mb-4 text-gray-600 dark:text-gray-300">
					Administrator access is required to view this section.
				</p>
				<div class="text-sm text-gray-500 dark:text-gray-400">
					Current user: <strong>{$currentUser?.full_name || 'Unknown'}</strong>
					<br />
					Roles: {$currentUser?.roles?.map((r) => r.name).join(', ') || 'None'}
				</div>
				<Button variant="outline" href="/home" class="mt-4">Return to Dashboard</Button>
			</div>
		</div>
	</svelte:fragment>
</RoleGuard>
