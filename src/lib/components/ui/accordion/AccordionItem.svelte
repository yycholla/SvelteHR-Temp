<script lang="ts">
	/**
	 * AccordionItem Component
	 * Individual accordion item with expandable content
	 */
	import { getContext, setContext } from 'svelte';

	interface Props {
		value: string;
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { value, class: className = '', children }: Props = $props();

	const accordion = getContext<{
		type: 'single' | 'multiple';
		getValue: () => string | string[];
		toggle: (value: string) => void;
	}>('accordion');

	const isOpen = $derived(() => {
		const currentValue = accordion.getValue();
		return Array.isArray(currentValue)
			? currentValue.includes(value)
			: currentValue === value;
	});

	// Provide context for trigger and content
	setContext('accordion-item', {
		value,
		isOpen,
		toggle: () => accordion.toggle(value)
	});
</script>

<div class="border-b {className}">
	{@render children?.()}
</div>
