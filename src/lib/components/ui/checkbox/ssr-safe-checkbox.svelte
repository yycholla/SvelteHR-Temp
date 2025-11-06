<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { browser } from '$app/environment';

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
</script>

{#if browser}
	<!-- Client-side only: bits-ui Checkbox -->
	<Checkbox
		bind:checked
		bind:indeterminate
		{disabled}
		{onCheckedChange}
		{...restProps}
	/>
{:else}
	<!-- SSR: Native HTML checkbox -->
	<input
		type="checkbox"
		checked={checked}
		{disabled}
		class="peer h-4 w-4 shrink-0 rounded border border-input shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
		{...restProps}
	/>
{/if}
