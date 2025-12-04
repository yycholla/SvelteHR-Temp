<script lang="ts">
	/**
	 * AccordionTrigger Component
	 * Clickable trigger to expand/collapse accordion item
	 */
	import { getContext } from 'svelte';
	import { ChevronDown } from '@lucide/svelte';

	interface Props {
		class?: string;
		children?: import('svelte').Snippet;
	}

	const { class: className = '', children }: Props = $props();

	const item = getContext<{
		isOpen: () => boolean;
		toggle: () => void;
	}>('accordion-item');

	const isOpen = $derived(item.isOpen());
</script>

<button
	type="button"
	class="flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline {className}"
	onclick={() => item.toggle()}
	aria-expanded={isOpen}
>
	{@render children?.()}
	<ChevronDown
		class="h-4 w-4 shrink-0 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
	/>
</button>
