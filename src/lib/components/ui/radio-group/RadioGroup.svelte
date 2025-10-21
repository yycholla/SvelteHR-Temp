<script lang="ts">
	/**
	 * RadioGroup Component
	 * Wrapper for radio button groups with Svelte 5 runes
	 */
	import { setContext } from 'svelte';

	interface Props {
		value?: string;
		onValueChange?: (value: string) => void;
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { value = $bindable(), onValueChange, class: className = '', children }: Props = $props();

	// Provide context for child RadioGroupItem components
	setContext('radiogroup', {
		getValue: () => value,
		setValue: (newValue: string) => {
			value = newValue;
			onValueChange?.(newValue);
		}
	});
</script>

<div class="grid gap-2 {className}" role="radiogroup">
	{@render children?.()}
</div>
