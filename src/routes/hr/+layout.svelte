<script lang="ts">
	import { page } from '$app/stores';
	import { 
		Users, 
		CheckSquare, 
		Shield, 
		FileText, 
		Calendar, 
		BarChart3,
		UserCheck,
		Bell,
		Settings,
		ChevronLeft,
		ChevronRight
	} from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';

	let { children } = $props();
	
	let sidebarCollapsed = $state(false);

	// HR navigation items
	const hrNavItems = [
		{
			href: '/hr',
			label: 'HR Dashboard',
			icon: BarChart3,
			description: 'Overview and metrics'
		},
		{
			href: '/hr/employees',
			label: 'Employee Management',
			icon: Users,
			description: 'Manage all employees',
			badge: '1' // Total employees from API
		},
		{
			href: '/hr/onboarding',
			label: 'Onboarding',
			icon: UserCheck,
			description: 'New hire onboarding'
		},
		{
			href: '/hr/tasks',
			label: 'Task Management',
			icon: CheckSquare,
			description: 'HR tasks and workflows'
		},
		{
			href: '/hr/compliance',
			label: 'Compliance',
			icon: Shield,
			description: 'Compliance tracking',
			badge: '0' // From compliance stats
		},
		{
			href: '/hr/documents',
			label: 'Documents',
			icon: FileText,
			description: 'HR documents and files'
		},
		{
			href: '/hr/leave',
			label: 'Leave Management',
			icon: Calendar,
			description: 'Leave requests and balances'
		},
		{
			href: '/hr/performance',
			label: 'Performance Reviews',
			icon: BarChart3,
			description: 'Performance management'
		},
		{
			href: '/hr/notifications',
			label: 'Notifications',
			icon: Bell,
			description: 'HR notifications'
		}
	];

	// Check if current route is active
	function isActive(href: string): boolean {
		const currentPath = $page.url.pathname;
		if (href === '/hr') {
			return currentPath === '/hr' || currentPath === '/hr/';
		}
		return currentPath.startsWith(href);
	}

	// Get page title from current route
	const currentItem = $derived(
		hrNavItems.find(item => isActive(item.href)) || hrNavItems[0]
	);

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
	}
</script>

<div class="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-900"></div>
<div class="relative min-h-screen">
	<div class="flex min-h-screen">
		<!-- Fixed Sidebar -->
		<aside class="fixed left-0 top-0 z-30 h-screen transition-all duration-300 {sidebarCollapsed ? 'w-16' : 'w-72'} p-4">
			<!-- Sidebar Card -->
			<div class="h-full flex flex-col bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/30">
				<!-- Sidebar Header -->
				<div class="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
					<div class="flex items-center justify-between">
						{#if !sidebarCollapsed}
							<div class="flex items-center space-x-3">
								<div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
									<Shield class="h-5 w-5 text-white" />
								</div>
								<div class="transition-opacity duration-200">
									<h2 class="font-bold text-xl text-slate-800 dark:text-slate-100">HR Portal</h2>
									<p class="text-sm text-slate-500 dark:text-slate-400">Human Resources</p>
								</div>
							</div>
						{:else}
							<div class="flex justify-center">
								<div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
									<Shield class="h-5 w-5 text-white" />
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Navigation -->
				<nav class="flex-1 p-4 space-y-2 overflow-y-auto">
					{#each hrNavItems as item}
						{@const IconComponent = item.icon}
						<a
							href={item.href}
							class="group relative flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:bg-slate-100/70 dark:hover:bg-slate-700/50 hover:scale-[1.02] {
								isActive(item.href) 
									? 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-500/20 shadow-sm' 
									: 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
							}"
							title={sidebarCollapsed ? item.label : ''}
						>
							<div class="flex items-center justify-center w-8 h-8 rounded-lg {
								isActive(item.href)
									? 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20'
									: 'group-hover:bg-slate-200/50 dark:group-hover:bg-slate-600/50'
							}">
								<IconComponent class="h-5 w-5 flex-shrink-0" />
							</div>
							{#if !sidebarCollapsed}
								<div class="ml-3 flex-1 transition-opacity duration-200">
									<div class="flex items-center justify-between">
										<span class="truncate font-medium">{item.label}</span>
										{#if item.badge}
											<Badge variant="secondary" class="ml-2 h-5 px-2 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
												{item.badge}
											</Badge>
										{/if}
									</div>
									<p class="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
										{item.description}
									</p>
								</div>
							{:else if item.badge}
								<Badge variant="secondary" class="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
									{item.badge}
								</Badge>
							{/if}
						</a>
					{/each}
				</nav>

				<!-- Sidebar Footer -->
				<div class="p-6 border-t border-slate-200/50 dark:border-slate-700/50">
					{#if !sidebarCollapsed}
						<div class="flex items-center space-x-3">
							<div class="flex-1">
								<p class="text-sm font-semibold text-slate-800 dark:text-slate-200">HR Management</p>
								<p class="text-xs text-slate-500 dark:text-slate-400">MountainCare Healthcare</p>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Sidebar Toggle Button -->
			<Button
				variant="outline"
				size="icon"
				class="absolute -right-3 top-8 z-10 h-8 w-8 rounded-full bg-white dark:bg-slate-800 border-2 border-white/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-200 backdrop-blur-sm"
				onclick={toggleSidebar}
			>
				{#if sidebarCollapsed}
					<ChevronRight class="h-4 w-4" />
				{:else}
					<ChevronLeft class="h-4 w-4" />
				{/if}
			</Button>
		</aside>

		<!-- Main Content Area -->
		<div class="flex-1 flex flex-col min-w-0 transition-all duration-300" style="margin-left: {sidebarCollapsed ? '64px' : '288px'}; padding: 1rem;">
			<!-- Page Content - No wrapping card, let individual pages handle their own cards -->
			<main class="flex-1">
				{@render children?.()}
			</main>
		</div>
	</div>
</div>