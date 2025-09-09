<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';

	let { value = $bindable(), children, ...restProps }: TabsPrimitive.RootProps = $props();
</script>

<TabsPrimitive.Root bind:value data-slot="tabs" {...restProps}>
	{@render children?.()}
</TabsPrimitive.Root>
