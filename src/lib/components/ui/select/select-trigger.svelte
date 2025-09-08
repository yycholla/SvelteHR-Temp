<script lang="ts" module>
	import { Select as SelectPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import { type VariantProps, tv } from 'tailwind-variants';

	export const selectTriggerVariants = tv({
		base: 'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
		variants: {
			size: {
				sm: 'h-8 px-2 text-xs',
				default: 'h-9 px-3',
				lg: 'h-10 px-4'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	});

	export type SelectTriggerSize = VariantProps<typeof selectTriggerVariants>['size'];

	export type SelectTriggerProps = SelectPrimitive.TriggerProps & {
		size?: SelectTriggerSize;
	};
</script>

<script lang="ts">
	import { ChevronDown } from '@lucide/svelte';

	let {
		class: className,
		size = 'default',
		ref = $bindable(null),
		children,
		...restProps
	}: SelectTriggerProps = $props();
</script>

<SelectPrimitive.Trigger
	bind:ref
	data-slot="select-trigger"
	class={cn(selectTriggerVariants({ size }), className)}
	{...restProps}
>
	{@render children?.()}
	<ChevronDown class="size-4 opacity-50" />
</SelectPrimitive.Trigger>
