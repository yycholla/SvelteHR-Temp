<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>>;

	let { class: className, ref = $bindable(null), children, ...restProps }: Props = $props();
</script>

<div
	bind:this={ref}
	data-slot="alert-description"
	class={cn('text-sm [&_p]:leading-relaxed', className)}
	{...restProps}
>
	{@render children?.()}
</div>
