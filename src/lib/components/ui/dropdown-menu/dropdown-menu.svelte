<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";

	let {
		children,
		...restProps
	} = $props();
</script>

<DropdownMenuPrimitive.Root {...restProps}>
	{@render children()}
</DropdownMenuPrimitive.Root>