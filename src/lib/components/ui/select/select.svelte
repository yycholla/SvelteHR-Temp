<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';

	let { children, ...restProps }: SelectPrimitive.RootProps = $props();
</script>

<SelectPrimitive.Root {...restProps}>
	{@render children?.()}
</SelectPrimitive.Root>
