<script lang="ts">
	import { cn } from '$lib/utils';

	// Props
	let {
		class: className = '',
		children,
		...restProps
	}: {
		class?: string;
		children?: any;
		[key: string]: any;
	} = $props();
</script>

<div
	class={cn('relative overflow-auto', className)}
	{...restProps}
>
	{@render children?.()}
</div>

<style>
	/* Custom scrollbar styling for better UX */
	div {
		scrollbar-width: thin;
		scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
	}

	div::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}

	div::-webkit-scrollbar-track {
		background: transparent;
	}

	div::-webkit-scrollbar-thumb {
		background-color: hsl(var(--muted-foreground) / 0.3);
		border-radius: 4px;
	}

	div::-webkit-scrollbar-thumb:hover {
		background-color: hsl(var(--muted-foreground) / 0.5);
	}
</style>
