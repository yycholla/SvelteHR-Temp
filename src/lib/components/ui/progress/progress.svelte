<script lang="ts" module>
	import { Progress as ProgressPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";
	import { type VariantProps, tv } from "tailwind-variants";

	export const progressVariants = tv({
		base: "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
		variants: {
			size: {
				sm: "h-1",
				default: "h-2",
				lg: "h-3",
			},
		},
		defaultVariants: {
			size: "default",
		},
	});

	export const progressIndicatorVariants = tv({
		base: "h-full w-full flex-1 bg-primary transition-all",
		variants: {
			variant: {
				default: "bg-primary",
				success: "bg-green-500",
				warning: "bg-yellow-500",
				destructive: "bg-destructive",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	});

	export type ProgressSize = VariantProps<typeof progressVariants>["size"];
	export type ProgressVariant = VariantProps<typeof progressIndicatorVariants>["variant"];

	export type ProgressProps = ProgressPrimitive.RootProps & {
		size?: ProgressSize;
		variant?: ProgressVariant;
	};
</script>

<script lang="ts">
	let {
		class: className,
		size = "default",
		variant = "default",
		value,
		max = 100,
		ref = $bindable(null),
		...restProps
	}: ProgressProps = $props();
</script>

<ProgressPrimitive.Root
	bind:ref
	data-slot="progress"
	class={cn(progressVariants({ size }), className)}
	{value}
	{max}
	{...restProps}
>
	<div
		class={cn(progressIndicatorVariants({ variant }))}
		style="transform: translateX(-{100 - (value ? (value / max) * 100 : 0)}%)"
	></div>
</ProgressPrimitive.Root>