<script lang="ts">
	import { getContext } from 'svelte';

	interface Props {
		placeholder?: string;
		class?: string;
	}

	let { placeholder = 'Select...', class: className = '' }: Props = $props();

	// Get the select value from context (set by Select.Root)
	const value = getContext<any>('select-value');
	const label = getContext<any>('select-label');
</script>

<span data-slot="select-value" class="pointer-events-none {className}">
	{#if label || value}
		{label || value}
	{:else}
		<span data-placeholder class="text-muted-foreground">{placeholder}</span>
	{/if}
</span>
