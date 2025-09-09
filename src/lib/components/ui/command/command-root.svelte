<script lang="ts">
	import { Command as CommandPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	let { class: className, children, ...restProps } = $props();
</script>

<CommandPrimitive.Root
	class={cn('flex h-full w-full flex-col overflow-hidden rounded-md bg-transparent', className)}
	{...restProps}
>
	{@render children()}
</CommandPrimitive.Root>

<style>
	:global([data-bits-command-root]) {
		background: transparent !important;
		background-color: transparent !important;
		border: none !important;
		box-shadow: none !important;
	}
</style>
