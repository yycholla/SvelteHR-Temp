<script lang="ts">
	import { Avatar as AvatarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: AvatarPrimitive.FallbackProps = $props();
</script>

<AvatarPrimitive.Fallback
	bind:ref
	data-slot="avatar-fallback"
	class={cn(
		'flex size-full items-center justify-center rounded-full bg-muted text-sm font-medium',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</AvatarPrimitive.Fallback>
