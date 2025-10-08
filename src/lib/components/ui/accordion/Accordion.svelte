<script lang="ts">
	/**
	 * Accordion Component
	 * Container for expandable accordion items
	 */
	import { setContext } from 'svelte';

	interface Props {
		type?: 'single' | 'multiple';
		collapsible?: boolean;
		value?: string | string[];
		onValueChange?: (value: string | string[]) => void;
		class?: string;
		children?: import('svelte').Snippet;
	}

	let {
		type = 'single',
		collapsible = false,
		value = $bindable(type === 'single' ? '' : []),
		onValueChange,
		class: className = '',
		children
	}: Props = $props();

	// Provide context for child AccordionItem components
	setContext('accordion', {
		type,
		collapsible,
		getValue: () => value,
		toggle: (itemValue: string) => {
			if (type === 'single') {
				const newValue = value === itemValue ? (collapsible ? '' : value) : itemValue;
				value = newValue as any;
				onValueChange?.(newValue);
			} else {
				const currentValues = Array.isArray(value) ? value : [];
				const newValues = currentValues.includes(itemValue)
					? currentValues.filter((v) => v !== itemValue)
					: [...currentValues, itemValue];
				value = newValues as any;
				onValueChange?.(newValues);
			}
		}
	});
</script>

<div class="space-y-2 {className}">
	{@render children?.()}
</div>
