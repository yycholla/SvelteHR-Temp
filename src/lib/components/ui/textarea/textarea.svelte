<script lang="ts" module>
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { type VariantProps, tv } from 'tailwind-variants';

	export const textareaVariants = tv({
		base: 'flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
		variants: {
			size: {
				sm: 'min-h-16 px-2 py-1 text-sm',
				default: 'min-h-20 px-3 py-2',
				lg: 'min-h-24 px-4 py-3'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	});

	export type TextareaSize = VariantProps<typeof textareaVariants>['size'];

	export type TextareaProps = WithElementRef<HTMLTextareaAttributes> & {
		size?: TextareaSize;
	};
</script>

<script lang="ts">
	let {
		class: className,
		size = 'default',
		value = $bindable(),
		ref = $bindable(null),
		...restProps
	}: TextareaProps = $props();
</script>

<textarea
	bind:this={ref}
	bind:value
	data-slot="textarea"
	class={cn(textareaVariants({ size }), className)}
	{...restProps}
></textarea>
