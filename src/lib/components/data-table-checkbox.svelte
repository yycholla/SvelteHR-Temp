<script lang="ts">
	import HtmlCheckbox from '$lib/components/ui/checkbox/html-checkbox.svelte';
	import type { ComponentProps } from 'svelte';

	let { checked = $bindable(false), ...restProps }: ComponentProps<typeof HtmlCheckbox> = $props();
</script>

<HtmlCheckbox bind:checked {...restProps} />
