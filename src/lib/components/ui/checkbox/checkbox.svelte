<script lang="ts" module>
	import { Checkbox as CheckboxPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import { type VariantProps, tv } from 'tailwind-variants';

	export const checkboxVariants = tv({
		base: 'peer size-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
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

	export type CheckboxSize = VariantProps<typeof checkboxVariants>['size'];

	export type CheckboxProps = CheckboxPrimitive.RootProps & {
		size?: CheckboxSize;
	};
</script>

<script lang="ts">
	import { Check, Minus } from '@lucide/svelte';

	let {
		class: className,
		size = 'default',
		checked = $bindable(),
		ref = $bindable(null),
		...restProps
	}: CheckboxProps = $props();
</script>

<CheckboxPrimitive.Root
	bind:ref
	bind:checked
	data-slot="checkbox"
	class={cn(checkboxVariants({ size }), className)}
	{...restProps}
>
	{#if checked === true}
		<Check class="size-3" />
	{/if}
</CheckboxPrimitive.Root>
