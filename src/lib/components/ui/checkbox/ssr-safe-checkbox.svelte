<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox';
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

	onMount(async () => {
		// Wait for the next microtask to ensure hydration completes
		// before switching from native checkbox to bits-ui Checkbox
		await tick();
		mounted = true;
	});

	function handleChange(e: Event) {
		const target = e.target as HTMLInputElement;
		checked = target.checked;
		if (onCheckedChange) {
			onCheckedChange(target.checked);
		}
	}
</script>

{#if mounted}
	<!-- Client-side only: bits-ui Checkbox (after mount) -->
	<Checkbox bind:checked bind:indeterminate {disabled} {onCheckedChange} {...restProps} />
{:else}
	<!-- SSR and initial render: Native HTML checkbox -->
	<input
		type="checkbox"
		{checked}
		{disabled}
		onchange={handleChange}
		class="peer h-4 w-4 shrink-0 rounded border border-input shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
		{...restProps}
	/>
{/if}
