<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import type { ComponentProps } from 'svelte';

	let {
		checked = $bindable(false),
		...restProps
	}: ComponentProps<typeof Checkbox> = $props();
</script>

<div class="flex items-center justify-center">
	<Checkbox bind:checked {...restProps} />
</div>
