<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = WithElementRef<HTMLAttributes<HTMLSpanElement>> & {
		placeholder?: string;
	};

	let {
		class: className,
		placeholder,
		children,
		ref = $bindable(null),
		...restProps
	}: Props = $props();
</script>

<span bind:this={ref} data-slot="select-value" class={cn('text-sm', className)} {...restProps}>
	{#if children}
		{@render children?.()}
	{:else if placeholder}
		<span class="text-muted-foreground">{placeholder}</span>
	{/if}
</span>
