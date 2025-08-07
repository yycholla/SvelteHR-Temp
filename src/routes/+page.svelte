<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	// Redirect to /home immediately if in browser
	if (browser) {
		goto('/home', { replaceState: true });
	}

	// Fallback for SSR
	onMount(() => {
		goto('/home', { replaceState: true });
	});
</script>

<svelte:head>
	<title>SvelteHR - Redirecting...</title>
</svelte:head>

<!-- Simple loading state while redirecting -->
<div class="flex items-center justify-center min-h-screen">
	<div class="text-center space-y-4">
		<div class="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
			<span class="text-primary-foreground font-bold text-sm">HR</span>
		</div>
		<h1 class="font-bold text-3xl bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
			SvelteHR
		</h1>
		<div class="flex items-center justify-center space-x-2 text-muted-foreground">
			<div class="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
			<span class="text-sm">Loading...</span>
		</div>
	</div>
</div>