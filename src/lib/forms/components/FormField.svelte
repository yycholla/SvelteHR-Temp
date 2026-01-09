<script lang="ts">
	/**
	 * Base Form Field Component
	 *
	 * Simple wrapper for form fields with label and error display
	 */
	import { Label } from '$lib/components/ui/label';
	import type { Snippet } from 'svelte';

	interface Props {
		name: string;
		label?: string;
		required?: boolean;
		errors?: string[];
		children: Snippet;
	}

	let { name, label, required = false, errors = [], children }: Props = $props();
</script>

<div class="space-y-2">
	{#if label}
		<Label for={name} class="text-sm font-medium">
			{label}
			{#if required}
				<span class="text-red-500">*</span>
			{/if}
		</Label>
	{/if}

	{@render children()}

	{#if errors && errors.length > 0}
		<div class="text-sm text-destructive">
			{#each errors as error}
				<p>{error}</p>
			{/each}
		</div>
	{/if}
</div>
