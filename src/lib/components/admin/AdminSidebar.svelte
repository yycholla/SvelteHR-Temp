<script lang="ts">
	import { page } from '$app/stores';
	import {
		BarChart3,
		BookOpen,
		FileText,
		FolderOpen,
		GraduationCap,
		Settings,
		Shield,
		Activity,
		Clock,
		ArrowLeft,
		Users,
		PanelLeftClose,
		PanelLeftOpen,
		Database
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Separator } from '$lib/components/ui/separator';
	import { auth } from '$lib/stores/auth.svelte';
	import { sidebarState } from '$lib/stores/sidebar.svelte';

	// Permission logic
	const permissions = $derived($page.data.permissions || []);
	const permissionStrings = $derived(
		permissions.map((p: any) => {
			if (typeof p === 'string') return p;
			return `${p.resource}:${p.action}`;
		})
	);

	const hasPermission = (permission: string): boolean => {
		const hasWildcard = permissionStrings.includes('*') || permissionStrings.includes('*:*');
		if (hasWildcard) return true;
		if (permissionStrings.includes(permission)) return true;
		return false;
	};

	const hasAnyPermission = (...permissions: string[]): boolean => {
		if (permissionStrings.includes('*') || permissionStrings.includes('*:*')) return true;
		return permissions.some((p) => hasPermission(p));
	};

	const isSuperAdmin = auth.hasRole('super_admin');

	const adminGroups = [
		{
			id: 'overview',
			label: 'Overview',
			items: [
				{
					title: 'Analytics',
					url: '/admin/analytics',
					icon: BarChart3,
					permissionAny: ['reports:read:all', 'reports:analytics']
				},
				{
					title: 'Audit Logs',
					url: '/admin/audit',
					icon: FileText,
					permission: 'activities:read:all'
				}
			]
		},
		{
			id: 'users',
			label: 'User Management',
			items: [
				{
					title: 'Users',
					url: '/admin/users',
					icon: Users,
					permission: 'users:read:all'
				},
				{
					title: 'Roles & Permissions',
					url: '/admin/permissions',
					icon: Shield,
					permissionAny: ['roles:read:all', 'permissions:read:all']
				}
			]
		},
		{
			id: 'content',
			label: 'Content',
			items: [
				{
					title: 'Onboarding',
					url: '/admin/onboarding',
					icon: BookOpen,
					permissionAny: ['onboarding:write', 'onboarding:assign']
				},
				{
					title: 'Training',
					url: '/admin/trainings',
					icon: GraduationCap,
					permissionAny: ['training:write', 'training:assign']
				},
				{
					title: 'Documents',
					url: '/admin/documents',
					icon: FolderOpen,
					permission: 'documents:read:all'
				}
			]
		},
		{
			id: 'system',
			label: 'System',
			items: [
				{
					title: 'Settings',
					url: '/admin/settings',
					icon: Settings,
					permission: 'admin:read:all'
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
			]
		}
	];

	function isVisible(item: any) {
		if (item.superAdminOnly && !isSuperAdmin) return false;
		if (item.permission) return hasPermission(item.permission);
		if (item.permissionAny) return hasAnyPermission(...item.permissionAny);
		return true;
	}
</script>

<div
	class="bg-white dark:bg-black border-r border-neutral-200 dark:border-neutral-800 flex flex-col shrink-0 z-20 h-full transition-all duration-300 relative group"
	class:w-16={sidebarState.isCollapsed}
	class:w-64={!sidebarState.isCollapsed}
>
	<!-- Header / Back -->
	<div class="p-3 flex items-center gap-2 h-14 border-b border-neutral-200 dark:border-neutral-800">
		<Button
			variant="ghost"
			size="icon"
			href="/dashboard"
			class="h-8 w-8 shrink-0 text-neutral-500 hover:text-black hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white"
			title="Back to Dashboard"
		>
			<ArrowLeft class="h-4 w-4" />
		</Button>

		{#if !sidebarState.isCollapsed}
			<div class="font-semibold text-sm truncate text-black dark:text-white">Admin Console</div>
		{/if}
	</div>

	<!-- Navigation -->
	<div class="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 flex flex-col gap-6">
		{#each adminGroups as group}
			{@const visibleItems = group.items.filter(isVisible)}
			{#if visibleItems.length > 0}
				<div class="flex flex-col gap-1">
					{#if !sidebarState.isCollapsed}
						<div
							class="px-2 text-xs font-semibold text-neutral-500 dark:text-neutral-500 uppercase tracking-wider mb-1"
						>
							{group.label}
						</div>
					{/if}

					{#each visibleItems as item}
						{@const Icon = item.icon}
						{@const isActive = $page.url.pathname.startsWith(item.url)}

						{#if sidebarState.isCollapsed}
							<Tooltip.Root>
								<Tooltip.Trigger class="w-full focus:outline-none">
									<a
										href={item.url}
										class="h-9 w-9 rounded-md flex items-center justify-center transition-colors mx-auto
										{isActive
											? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
											: 'text-neutral-500 hover:text-black hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white'}"
									>
										<Icon class="h-4 w-4" />
									</a>
								</Tooltip.Trigger>
								<Tooltip.Content
									side="right"
									class="bg-black text-white dark:bg-white dark:text-black border-neutral-200 dark:border-neutral-800"
								>
									<p>{item.title}</p>
								</Tooltip.Content>
							</Tooltip.Root>
						{:else}
							<a
								href={item.url}
								class="flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium transition-colors
								{isActive
									? 'bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white'
									: 'text-neutral-500 hover:text-black hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900/50 dark:hover:text-white'}"
							>
								<Icon class="h-4 w-4 shrink-0" />
								<span class="truncate">{item.title}</span>
							</a>
						{/if}
					{/each}
				</div>
				{#if !sidebarState.isCollapsed && group !== adminGroups[adminGroups.length - 1]}
					<Separator class="my-1 bg-neutral-200 dark:bg-neutral-800" />
				{/if}
			{/if}
		{/each}
	</div>

	<!-- Footer / Toggle -->
	<div class="p-3 border-t border-neutral-200 dark:border-neutral-800 mt-auto">
		<Button
			variant="ghost"
			size="sm"
			class="w-full flex justify-center text-neutral-500 hover:text-black hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white {sidebarState.isCollapsed
				? ''
				: 'justify-start gap-2'}"
			onclick={() => sidebarState.toggle()}
		>
			{#if sidebarState.isCollapsed}
				<PanelLeftOpen class="h-4 w-4" />
			{:else}
				<PanelLeftClose class="h-4 w-4" />
				<span class="text-xs">Collapse</span>
			{/if}
		</Button>
	</div>
</div>
