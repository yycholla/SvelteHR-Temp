<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let { children, target = 'body' } = $props();

	let mounted = $state(false);
	let portal: HTMLElement;

	onMount(() => {
		const targetElement = typeof target === 'string' ? document.querySelector(target) : target;

		if (targetElement) {
			portal = document.createElement('div');
			targetElement.appendChild(portal);
			mounted = true;
		}
	});

	onDestroy(() => {
		if (portal && portal.parentNode) {
			portal.parentNode.removeChild(portal);
		}
	});
</script>

{#if mounted && portal}
	{@render children()}
{/if}
