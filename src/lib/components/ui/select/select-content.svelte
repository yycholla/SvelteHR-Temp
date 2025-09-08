<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import { flyAndScale } from '$lib/utils.js';

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: SelectPrimitive.ContentProps = $props();
</script>

<SelectPrimitive.Content
	bind:ref
	data-slot="select-content"
	class={cn(
		'pointer-events-auto absolute z-[9999] max-h-96 min-w-32 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg',
		className
	)}
	{...restProps}
>
	<SelectPrimitive.Viewport class="p-1">
		{@render children?.()}
	</SelectPrimitive.Viewport>
</SelectPrimitive.Content>
