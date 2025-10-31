<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let {
		checked = $bindable(false),
		indeterminate = $bindable(false),
		disabled = false,
		onCheckedChange,
		...restProps
	}: {
		checked?: boolean;
		indeterminate?: boolean;
		disabled?: boolean;
		onCheckedChange?: (value: boolean | 'indeterminate') => void;
		[key: string]: any;
	} = $props();

	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});

	// Render native checkbox during SSR, upgrade to bits-ui after mount
	const showNative = $derived(!browser || !mounted);
</script>

{#if showNative}
	<!-- Native HTML checkbox for SSR -->
	<input
		type="checkbox"
		{checked}
		{disabled}
		class="h-4 w-4 rounded border-input"
		onchange={(e) => {
			if (onCheckedChange) {
				onCheckedChange(e.currentTarget.checked);
			}
		}}
		{...restProps}
	/>
{:else}
	<!-- bits-ui Checkbox after hydration -->
	<Checkbox
		bind:checked
		bind:indeterminate
		{disabled}
		{onCheckedChange}
		{...restProps}
	/>
{/if}
