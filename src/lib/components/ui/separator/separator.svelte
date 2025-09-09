<script lang="ts" module>
	import { Separator as SeparatorPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import { type VariantProps, tv } from 'tailwind-variants';

	export const separatorVariants = tv({
		base: 'shrink-0 bg-border',
		variants: {
			orientation: {
				horizontal: 'h-px w-full',
				vertical: 'h-full w-px'
			}
		},
		defaultVariants: {
			orientation: 'horizontal'
		}
	});

	export type SeparatorOrientation = VariantProps<typeof separatorVariants>['orientation'];

	export type SeparatorProps = SeparatorPrimitive.RootProps & {
		orientation?: SeparatorOrientation;
	};
</script>

<script lang="ts">
	let {
		class: className,
		orientation = 'horizontal',
		decorative = true,
		...restProps
	}: SeparatorProps = $props();
</script>

<SeparatorPrimitive.Root
	data-slot="separator"
	class={cn(separatorVariants({ orientation }), className)}
	{orientation}
	{decorative}
	{...restProps}
/>
