<script lang="ts" module>
	import { Switch as SwitchPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";
	import { type VariantProps, tv } from "tailwind-variants";

	export const switchVariants = tv({
		base: "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
		variants: {
			size: {
				sm: "h-4 w-7",
				default: "h-5 w-9",
				lg: "h-6 w-11",
			},
		},
		defaultVariants: {
			size: "default",
		},
	});

	export const switchThumbVariants = tv({
		base: "pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
		variants: {
			size: {
				sm: "size-3 data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0",
				default: "size-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
				lg: "size-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
			},
		},
		defaultVariants: {
			size: "default",
		},
	});

	export type SwitchSize = VariantProps<typeof switchVariants>["size"];

	export type SwitchProps = SwitchPrimitive.RootProps & {
		size?: SwitchSize;
	};
</script>

<script lang="ts">
	let {
		class: className,
		size = "default",
		checked = $bindable(),
		ref = $bindable(null),
		...restProps
	}: SwitchProps = $props();
</script>

<SwitchPrimitive.Root
	bind:ref
	bind:checked
	data-slot="switch"
	class={cn(switchVariants({ size }), className)}
	{...restProps}
>
	<SwitchPrimitive.Thumb class={cn(switchThumbVariants({ size }))} />
</SwitchPrimitive.Root>