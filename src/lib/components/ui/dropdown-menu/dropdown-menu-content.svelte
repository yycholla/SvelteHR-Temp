<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';
	import { flyAndScale } from '$lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 4,
		children,
		...restProps
	}: DropdownMenuPrimitive.ContentProps = $props();
</script>

<DropdownMenuPrimitive.Content
	bind:ref
	{sideOffset}
	transition={flyAndScale}
	transitionConfig={{ y: 8, start: 0.95, duration: 150 }}
	class={cn(
		'z-[9999] min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
		className
	)}
	{...restProps}
>
	{@render children()}
</DropdownMenuPrimitive.Content>
