<script lang="ts">
	import type { Snippet } from 'svelte';
	import { InboxIcon } from '@lucide/svelte';

	interface Props {
		title?: string;
		description?: string;
		icon?: any;
		class?: string;
		showIcon?: boolean;
		actions?: Snippet;
	}

	let {
		title = 'No data available',
		description = 'There are no items to display at this time.',
		icon = InboxIcon,
		class: className = '',
		showIcon = true,
		actions
	}: Props = $props();
</script>

<div
	class="flex flex-col items-center justify-center p-8 text-center {className}"
	data-testid="empty-state"
>
	{#if showIcon}
		{@const Icon = icon}
		<div class="mb-4 rounded-full bg-muted p-4">
			<Icon class="h-8 w-8 text-muted-foreground" />
		</div>
	{/if}

	<h3 class="mb-2 text-lg font-semibold text-foreground" data-testid="empty-state-title">
		{title}
	</h3>

	<p class="max-w-sm text-sm text-muted-foreground" data-testid="empty-state-description">
		{description}
	</p>

	{@render actions?.()}
</div>
