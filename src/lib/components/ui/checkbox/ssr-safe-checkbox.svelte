<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { browser } from '$app/environment';
	import { onMount, tick } from 'svelte';

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
	let hydrated = $state(false);
	let error = $state(false);

	onMount(async () => {
		try {
			mounted = true;
			// Wait for next tick to ensure DOM is fully ready
			await tick();
			// Add small delay to ensure all parent components are hydrated
			await new Promise(resolve => setTimeout(resolve, 10));
			hydrated = true;
		} catch (err) {
			console.error('SSR-safe checkbox hydration error:', err);
			error = true;
		}
	});

	// Render native checkbox during SSR and early hydration, upgrade to bits-ui only after full hydration
	// If there's an error during hydration, fall back to native checkbox
	const showNative = $derived(!browser || !mounted || !hydrated || error);
</script>

{#if showNative}
	<!-- Native HTML checkbox for SSR and early hydration -->
	<input
		type="checkbox"
		bind:checked
		{disabled}
		class="peer h-4 w-4 shrink-0 rounded border border-input shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
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
