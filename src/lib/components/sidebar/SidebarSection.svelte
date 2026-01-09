<script lang="ts">
	import { page } from '$app/stores';
	import { ChevronRight } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

	interface SectionItem {
		title: string;
		url: string;
		icon: any;
		superAdminOnly?: boolean;
	}

	interface Props {
		title: string;
		icon: any;
		items: SectionItem[];
		isCollapsed: boolean;
		pathMatch: string; // e.g. '/management' or '/admin'
		testId?: string;
	}

	const { title, icon: Icon, items, isCollapsed, pathMatch, testId }: Props = $props();

	// Check if any item matches current path or if path contains match string
	const isActive = $derived(
		$page.url.pathname.includes(pathMatch) ||
			(pathMatch === '/admin' && $page.url.pathname === '/dashboard/tasks') // Special case for tasks admin
	);
</script>

<div class="px-3 pb-3">
	<DropdownMenu.Root>
		<DropdownMenu.Trigger class="w-full focus:outline-none">
			<div
				class="flex w-full items-center {isCollapsed
					? 'justify-center'
					: 'justify-between'} rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground hover:opacity-80"
				class:bg-primary={isActive}
				class:text-primary-foreground={isActive}
				data-testid={testId}
				title={isCollapsed ? title : ''}
			>
				<div class="flex items-center gap-3">
					<Icon class="h-4 w-4" />
					{#if !isCollapsed}
						{title}
					{/if}
				</div>
				{#if !isCollapsed}
					<ChevronRight class="h-3 w-3 text-sidebar-foreground/50" />
				{/if}
			</div>
		</DropdownMenu.Trigger>

		<DropdownMenu.Content side="right" align="start" class="w-56 ml-2">
			{#each items as item}
				{@const ItemIcon = item.icon}
				<DropdownMenu.Item>
					<a href={item.url} data-sveltekit-reload class="flex items-center w-full">
						<ItemIcon class="mr-2 h-4 w-4" />
						<span class="flex-1">{item.title}</span>
						{#if item.superAdminOnly}
							<span
								class="rounded-sm bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-500/20 dark:text-red-400"
							>
								Super
							</span>
						{:else if pathMatch === '/management'}
							<span
								class="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300"
							>
								Team
							</span>
						{:else}
							<span
								class="rounded-sm bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:bg-green-500/20 dark:text-green-400"
							>
								All
							</span>
						{/if}
					</a>
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
