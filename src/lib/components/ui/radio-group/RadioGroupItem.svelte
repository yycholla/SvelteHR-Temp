<script lang="ts">
	/**
	 * RadioGroupItem Component
	 * Individual radio button item
	 */
	import { getContext } from 'svelte';

	interface Props {
		value: string;
		id?: string;
		disabled?: boolean;
		class?: string;
	}

	const { value, id, disabled = false, class: className = '' }: Props = $props();

	// Get context from parent RadioGroup
	const radioGroup = getContext<{
		getValue: () => string;
		setValue: (value: string) => void;
	}>('radiogroup');

	const checked = $derived(radioGroup?.getValue() === value);

	function handleClick() {
		if (!disabled && radioGroup) {
			radioGroup.setValue(value);
		}
	}
</script>

<button
	type="button"
	role="radio"
	aria-checked={checked}
	{disabled}
	{id}
	class="aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {className}"
	class:bg-primary={checked}
	onclick={handleClick}
>
	{#if checked}
		<span class="flex items-center justify-center">
			<svg class="h-2.5 w-2.5 fill-current text-primary-foreground" viewBox="0 0 8 8">
				<circle cx="4" cy="4" r="3" />
			</svg>
		</span>
	{/if}
</button>
