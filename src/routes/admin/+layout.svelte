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
		adminNavItems.find(item => isActive(item.href)) || adminNavItems[0]
	);

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
	}
</script>

<div class="flex h-screen bg-gradient-to-br from-yellow-100/50 via-blue-100/40 to-blue-200/60 dark:from-yellow-900/20 dark:via-blue-900/25 dark:to-blue-800/30">
	<!-- Sidebar -->
	<aside class="relative transition-all duration-300 {sidebarCollapsed ? 'w-16' : 'w-64'} flex-shrink-0">
		<!-- Sidebar Content -->
		<div class="h-full flex flex-col bg-background/80 backdrop-blur-md border-r border-border/40 shadow-xl">
			<!-- Sidebar Header -->
			<div class="p-4 border-b border-border/40">
				<div class="flex items-center justify-between">
					{#if !sidebarCollapsed}
						<div class="flex items-center space-x-2">
							<div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
								<Settings class="h-5 w-5 text-primary-foreground" />
							</div>
							<div class="transition-opacity duration-200">
								<h2 class="font-semibold text-lg">Admin Portal</h2>
								<p class="text-xs text-muted-foreground">System Administration</p>
							</div>
						</div>
					{:else}
						<div class="flex justify-center">
							<div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
								<Settings class="h-5 w-5 text-primary-foreground" />
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Navigation -->
			<nav class="flex-1 p-4 space-y-1 overflow-y-auto">
				{#each adminNavItems as item}
					{@const IconComponent = item.icon}
					<a
						href={item.href}
						class="group relative flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-accent/50 {
							isActive(item.href) 
								? 'bg-primary/10 text-primary border-r-2 border-primary' 
								: 'text-muted-foreground hover:text-foreground'
						}"
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
								<p class="text-xs text-muted-foreground truncate mt-0.5">
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
			<div class="p-4 border-t border-border/40">
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
			class="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full bg-background border shadow-md hover:shadow-lg transition-all duration-200"
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
	<div class="flex-1 flex flex-col min-w-0">
		<!-- Header -->
		<header class="bg-background/80 backdrop-blur-md border-b border-border/40 px-6 py-4">
			<div class="flex items-center justify-between">
				<div class="min-w-0">
					<h1 class="text-2xl font-bold text-foreground truncate">
						{currentItem?.label || 'Admin Portal'}
					</h1>
					{#if currentItem?.description}
						<p class="text-sm text-muted-foreground mt-1">
							{currentItem.description}
						</p>
					{/if}
				</div>
				
				<!-- Header Actions -->
				<div class="flex items-center space-x-2">
					<Button variant="outline" size="sm">
						<Server class="h-4 w-4 mr-2" />
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