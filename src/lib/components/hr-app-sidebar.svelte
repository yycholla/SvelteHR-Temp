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
		Target
	} from 'lucide-svelte';
	import NavMain from './nav-main.svelte';
	import NavDocuments from './nav-documents.svelte';
	import NavSecondary from './nav-secondary.svelte';
	import NavUser from './nav-user.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { currentUser, hasRole } from '$lib/stores/auth';
	import type { ComponentProps } from 'svelte';

	// HR-specific navigation data
	const hrData = $derived(() => {
		const user = $currentUser;
		const isAdmin = hasRole('admin');
		const isHR = hasRole('hr_admin') || isAdmin;
		const isManager = hasRole('manager') || isHR;

		// Debug logging
		console.log('hrData update:', { user, isAdmin, isHR, isManager });

		return {
			user: user
				? {
						name: user.display_name || 'User',
						email: user.email || 'user@example.com',
						avatar: user.profileImage || ''
					}
				: {
						name: 'User',
						email: 'user@example.com',
						avatar: ''
					},
			navMain: [
				{
					title: 'Dashboard',
					url: '/dashboard',
					icon: Home
				},
				{
					title: 'Employees',
					url: '/dashboard/employees',
					icon: Users,
					items: [
						{ title: 'All Employees', url: '/dashboard/employees' },
						{ title: 'Add Employee', url: '/dashboard/employees/new' },
						{ title: 'Directory', url: '/dashboard/employees/directory' }
					]
				},
				{
					title: 'Departments',
					url: '/dashboard/departments',
					icon: Building2,
					items: [
						{ title: 'All Departments', url: '/dashboard/departments' },
						{ title: 'Create Department', url: '/dashboard/departments/new' }
					]
				},
				{
					title: 'Leave & Attendance',
					url: '/dashboard/leave',
					icon: Calendar,
					items: [
						{ title: 'My Attendance', url: '/dashboard/attendance/my' },
						{ title: 'Leave Requests', url: '/dashboard/leave/requests' },
						{ title: 'Submit Leave', url: '/dashboard/leave/new' }
					]
				},
				{
					title: 'Performance',
					url: '/dashboard/performance',
					icon: Target,
					items: [
						{ title: 'Overview', url: '/dashboard/performance' },
						{ title: 'My Goals', url: '/dashboard/performance' },
						{ title: 'Set Goal', url: '/dashboard/performance/goals/new' },
						{ title: 'Reviews', url: '/dashboard/performance/reviews' },
						...(isManager
							? [
									{ title: 'Team Performance', url: '/dashboard/performance' }
								]
							: [])
					]
				}
			],
			navDocuments: [
				{
					name: 'Employee Reports',
					url: '/reports/employees',
					icon: FileText
				},
				{
					name: 'Performance Analytics',
					url: '/dashboard/performance',
					icon: TrendingUp
				},
				{
					name: 'Compliance Center',
					url: '/compliance',
					icon: UserCheck
				}
			],
			navSecondary: [
				...(isAdmin
					? [
							{
								title: 'Administration',
								url: '/dashboard/admin',
								icon: Shield
							}
						]
					: []),
				{
					title: 'Settings',
					url: '/settings',
					icon: Settings
				},
				{
					title: 'Profile',
					url: '/profile',
					icon: User
				}
			]
		};
	});

	let { ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();
</script>

<div class="flex h-full flex-col bg-sidebar text-sidebar-foreground">
	<!-- Header -->
	<div class="p-4">
		<a href="/dashboard" class="flex items-center gap-2 font-semibold">
			<Building2 class="h-5 w-5" />
			<span class="text-base">SvelteHR</span>
		</a>
	</div>

	<!-- Navigation -->
	<div class="flex-1 overflow-auto p-4">
		<nav class="space-y-6">
			<!-- Main Navigation -->
			<div>
				<h3 class="mb-3 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/70">
					Main
				</h3>
				<ul class="space-y-1">
					{#each hrData.navMain as item}
						<li>
							<a
								href={item.url}
								class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
							>
								<svelte:component this={item.icon} class="h-4 w-4" />
								{item.title}
							</a>
							{#if item.items && item.items.length > 0}
								<ul class="ml-7 mt-1 space-y-1">
									{#each item.items as subItem}
										<li>
											<a
												href={subItem.url}
												class="block px-3 py-1 text-xs text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground"
											>
												{subItem.title}
											</a>
										</li>
									{/each}
								</ul>
							{/if}
						</li>
					{/each}
				</ul>
			</div>

			<!-- Documents -->
			<div>
				<h3 class="mb-3 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/70">
					Reports
				</h3>
				<ul class="space-y-1">
					{#each hrData.navDocuments as item}
						<li>
							<a
								href={item.url}
								class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
							>
								<svelte:component this={item.icon} class="h-4 w-4" />
								{item.name}
							</a>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Secondary -->
			<div>
				<h3 class="mb-3 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/70">
					System
				</h3>
				<ul class="space-y-1">
					{#each hrData.navSecondary as item}
						<li>
							<a
								href={item.url}
								class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
							>
								<svelte:component this={item.icon} class="h-4 w-4" />
								{item.title}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		</nav>
	</div>

	<!-- Footer -->
	{#if $currentUser && hrData.user}
		<div class="border-t border-border p-4">
			<div class="flex items-center gap-3">
				<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
					<User class="h-4 w-4" />
				</div>
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium">{hrData.user.name}</p>
					<p class="truncate text-xs text-sidebar-foreground/70">{hrData.user.email}</p>
				</div>
			</div>
		</div>
	{/if}
</div>
