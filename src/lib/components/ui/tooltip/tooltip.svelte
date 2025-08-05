<script lang="ts">
	import { Tooltip as TooltipPrimitive } from "bits-ui";

	let {
		open = $bindable(),
		children,
		...restProps
	}: TooltipPrimitive.RootProps = $props();
</script>

<TooltipPrimitive.Root bind:open {...restProps}>
	{@render children?.()}
</TooltipPrimitive.Root>