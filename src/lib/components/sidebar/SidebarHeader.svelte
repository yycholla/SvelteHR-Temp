<script lang="ts">
	import { Building2, PanelLeftClose, PanelLeftOpen, Search } from '@lucide/svelte';
	import NotificationDropdown from '$lib/components/notifications/NotificationDropdown.svelte';
	import CommandPaletteTrigger from '$lib/components/CommandPaletteTrigger.svelte';

	interface Props {
		systemName: string;
		isCollapsed: boolean;
		notifications: any[];
		onToggle: () => void;
	}

	const { systemName, isCollapsed, notifications, onToggle }: Props = $props();
</script>

<div
	class="flex items-center {isCollapsed
		? 'justify-center flex-col gap-4'
		: 'justify-between'} px-4 py-4 transition-all"
>
	{#if !isCollapsed}
		<a href="/dashboard" class="flex items-center gap-2 font-semibold">
			<Building2 class="h-5 w-5 text-primary" />
			<span class="text-base">{systemName}</span>
		</a>
		<div class="flex items-center gap-1">
			<CommandPaletteTrigger />
			<NotificationDropdown {notifications} />
			<button
				onclick={onToggle}
				class="ml-1 rounded-md p-1 hover:bg-sidebar-accent"
				title="Collapse sidebar"
			>
				<PanelLeftClose class="h-4 w-4" />
			</button>
		</div>
	{:else}
		<a href="/dashboard" title={systemName}>
			<Building2 class="h-5 w-5 text-primary" />
		</a>
		<CommandPaletteTrigger />
		<button
			onclick={onToggle}
			class="rounded-md p-1 hover:bg-sidebar-accent"
			title="Expand sidebar"
		>
			<PanelLeftOpen class="h-4 w-4" />
		</button>
	{/if}
</div>
