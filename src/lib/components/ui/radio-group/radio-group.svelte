<script lang="ts" module>
	import { RadioGroup as RadioGroupPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import { type VariantProps, tv } from 'tailwind-variants';

	export const radioGroupVariants = tv({
		base: 'grid gap-2',
		variants: {
			orientation: {
				vertical: 'grid-cols-1',
				horizontal: 'grid-flow-col auto-cols-max'
			}
		},
		defaultVariants: {
			orientation: 'vertical'
		}
	});

	export type RadioGroupOrientation = VariantProps<typeof radioGroupVariants>['orientation'];

	export type RadioGroupProps = RadioGroupPrimitive.RootProps & {
		orientation?: RadioGroupOrientation;
	};
</script>

<script lang="ts">
	let {
		class: className,
		orientation = 'vertical',
		value = $bindable(),
		ref = $bindable(null),
		children,
		...restProps
	}: RadioGroupProps = $props();
</script>

<RadioGroupPrimitive.Root
	bind:ref
	bind:value
	data-slot="radio-group"
	class={cn(radioGroupVariants({ orientation }), className)}
	{...restProps}
>
	{@render children?.()}
</RadioGroupPrimitive.Root>
