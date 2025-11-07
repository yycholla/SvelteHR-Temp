<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { children }: { children: any } = $props();

	// Track if component has mounted on client side
	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});
</script>

<!--
	ClientOnly Wrapper Component

	This component ensures that its children are only rendered on the client side,
	preventing SSR hydration mismatches. It uses onMount to defer rendering until
	after the component is mounted in the browser.

	Usage:
	<ClientOnly>
		<YourComponent />
	</ClientOnly>
-->
{#if browser && mounted}
	{@render children()}
{/if}
