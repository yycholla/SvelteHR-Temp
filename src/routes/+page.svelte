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
<div class="flex min-h-screen items-center justify-center">
	<div class="space-y-4 text-center">
		<div
			class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg"
		>
			<span class="text-sm font-bold text-primary-foreground">HR</span>
		</div>
		<h1
			class="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-3xl font-bold text-transparent"
		>
			SvelteHR
		</h1>
		<div class="flex items-center justify-center space-x-2 text-muted-foreground">
			<div class="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
			<span class="text-sm">Loading...</span>
		</div>
	</div>
</div>
