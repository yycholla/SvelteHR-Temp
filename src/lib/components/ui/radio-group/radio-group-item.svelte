<script lang="ts" module>
	import { RadioGroup as RadioGroupPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import { type VariantProps, tv } from 'tailwind-variants';

	export const radioGroupItemVariants = tv({
		base: 'aspect-square size-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
		variants: {
			size: {
				sm: 'size-3',
				default: 'size-4',
				lg: 'size-5'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	});

	export type RadioGroupItemSize = VariantProps<typeof radioGroupItemVariants>['size'];

	export type RadioGroupItemProps = RadioGroupPrimitive.ItemProps & {
		size?: RadioGroupItemSize;
	};
</script>

<script lang="ts">
	import { Circle } from '@lucide/svelte';

	let {
		class: className,
		size = 'default',
		ref = $bindable(null),
		...restProps
	}: RadioGroupItemProps = $props();
</script>

<RadioGroupPrimitive.Item
	bind:ref
	data-slot="radio-group-item"
	class={cn(radioGroupItemVariants({ size }), className)}
	{...restProps}
>
	<div
		class="flex items-center justify-center data-[state=checked]:block data-[state=unchecked]:hidden"
	>
		<Circle class="size-1.5 fill-current" />
	</div>
</RadioGroupPrimitive.Item>
