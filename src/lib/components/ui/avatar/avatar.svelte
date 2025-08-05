<script lang="ts" module>
	import { Avatar as AvatarPrimitive } from "bits-ui";
	import { cn, type WithElementRef } from "$lib/utils.js";
	import { type VariantProps, tv } from "tailwind-variants";

	export const avatarVariants = tv({
		base: "relative flex shrink-0 overflow-hidden rounded-full",
		variants: {
			size: {
				sm: "size-8",
				default: "size-10",
				lg: "size-12",
				xl: "size-16",
			},
		},
		defaultVariants: {
			size: "default",
		},
	});

	export type AvatarSize = VariantProps<typeof avatarVariants>["size"];

	export type AvatarProps = WithElementRef<AvatarPrimitive.RootProps> & {
		size?: AvatarSize;
	};
</script>

<script lang="ts">
	let {
		class: className,
		size = "default",
		ref = $bindable(null),
		children,
		...restProps
	}: AvatarProps = $props();
</script>

<AvatarPrimitive.Root
	bind:ref
	data-slot="avatar"
	class={cn(avatarVariants({ size }), className)}
	{...restProps}
>
	{@render children?.()}
</AvatarPrimitive.Root>