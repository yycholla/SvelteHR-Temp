<script lang="ts">
	import { page } from '$app/stores';
	import { ChevronRight } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

	interface NavItem {
		title: string;
		url: string;
		icon: any;
		standalone?: boolean;
		section?: string;
		items?: Array<{ title: string; url: string }>;
	}

	interface Props {
		items: NavItem[];
		isCollapsed: boolean;
	}

	const { items, isCollapsed }: Props = $props();

	function isActive(item: NavItem): boolean {
		const currentPath = $page.url.pathname;
		if (item.standalone) {
			return currentPath === item.url;
		}
		if (item.section === 'leave') {
			return currentPath.includes('/attendance') || currentPath.includes('/leave');
		}
		if (item.section === 'performance') {
			return currentPath.includes('/performance');
		}
		if (item.section === 'tasks') {
			return currentPath.includes('/tasks') && !currentPath.includes('/tasks/department');
		}
		return false;
	}
</script>

<div class="flex-1 overflow-auto px-3 py-3">
	<nav class="space-y-1">
		{#each items as item}
			{#if item.standalone}
				<!-- Simple link without submenu -->
				{@const Icon = item.icon}
				<a
					href={item.url}
					data-sveltekit-reload
					class="flex items-center {isCollapsed
						? 'justify-center'
						: 'gap-3'} rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground hover:opacity-80"
					class:bg-primary={$page.url.pathname === item.url}
					class:text-primary-foreground={$page.url.pathname === item.url}
					title={isCollapsed ? item.title : ''}
					data-testid={item.title === 'Dashboard'
						? 'nav-dashboard'
						: item.title === 'Employees'
							? 'nav-employees'
							: item.title === 'Events'
								? 'nav-events'
								: null}
				>
					<Icon class="h-4 w-4" />
					{#if !isCollapsed}
						{item.title}
					{/if}
				</a>
			{:else}
				<!-- Dropdown Menu section -->
				{@const Icon = item.icon}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger class="w-full focus:outline-none">
						<div
							class="flex w-full items-center {isCollapsed
								? 'justify-center'
								: 'justify-between'} rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground hover:opacity-80"
							class:bg-primary={isActive(item)}
							class:text-primary-foreground={isActive(item)}
							title={isCollapsed ? item.title : ''}
							data-testid={item.title === 'Tasks' ? 'nav-tasks' : null}
						>
							<div class="flex items-center gap-3">
								<Icon class="h-4 w-4" />
								{#if !isCollapsed}
									{item.title}
								{/if}
							</div>
							{#if !isCollapsed}
								<ChevronRight class="h-3 w-3 text-sidebar-foreground/50" />
							{/if}
						</div>
					</DropdownMenu.Trigger>

					<DropdownMenu.Content side="right" align="start" class="w-48 ml-2">
						{#if item.items}
							{#each item.items as subItem}
								<DropdownMenu.Item>
									<a href={subItem.url} data-sveltekit-reload class="flex w-full items-center">
										{subItem.title}
									</a>
								</DropdownMenu.Item>
							{/each}
						{/if}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}
		{/each}
	</nav>
</div>
