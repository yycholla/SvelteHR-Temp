<script lang="ts" module>
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';
	import { type VariantProps, tv } from 'tailwind-variants';

	export const skeletonVariants = tv({
		base: 'animate-pulse rounded-md bg-muted',
		variants: {
			variant: {
				default: '',
				text: 'h-4 w-full',
				avatar: 'size-10 rounded-full',
				button: 'h-9 px-4',
				card: 'h-32 w-full'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	});

	export type SkeletonVariant = VariantProps<typeof skeletonVariants>['variant'];

	export type SkeletonProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: SkeletonVariant;
	};
</script>

<script lang="ts">
	let {
		class: className,
		variant = 'default',
		ref = $bindable(null),
		...restProps
	}: SkeletonProps = $props();
</script>

<div
	bind:this={ref}
	data-slot="skeleton"
	class={cn(skeletonVariants({ variant }), className)}
	{...restProps}
></div>
