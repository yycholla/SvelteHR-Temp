<script lang="ts">
	/**
	 * AccordionContent Component
	 * Collapsible content section of accordion item
	 */
	import { getContext } from 'svelte';

	interface Props {
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { class: className = '', children }: Props = $props();

	const item = getContext<{
		isOpen: () => boolean;
	}>('accordion-item');

	const isOpen = $derived(item.isOpen());
</script>

{#if isOpen}
	<div class="pb-4 pt-0 {className}">
		{@render children?.()}
	</div>
{/if}
