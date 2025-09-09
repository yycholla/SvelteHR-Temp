<script lang="ts">
	// This page is now handled server-side via +page.server.ts
	// The server handles the token exchange and redirects automatically
	// This component only shows if there's an error during server processing

	import { page } from '$app/stores';

	$: error = $page.url.searchParams.get('error');
</script>

<svelte:head>
	<title>Completing Sign In - SvelteHR</title>
</svelte:head>

<div
	class="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-100/50 via-blue-100/40 to-blue-200/60 p-4 dark:from-yellow-900/20 dark:via-blue-900/25 dark:to-blue-800/30"
>
	<div class="w-full max-w-md text-center">
		{#if error}
			<div
				class="rounded-2xl border border-border/40 bg-background/20 p-8 shadow-xl backdrop-blur-md"
			>
				<div class="mb-4 text-4xl text-destructive">⚠️</div>
				<h1 class="mb-2 text-2xl font-bold text-foreground">Authentication Failed</h1>
				<p class="mb-4 text-muted-foreground">Error: {error}</p>
				<a
					href="/login"
					class="inline-block rounded-xl bg-primary px-6 py-3 text-primary-foreground transition-colors hover:bg-primary/90"
				>
					Try Again
				</a>
			</div>
		{:else}
			<div
				class="rounded-2xl border border-border/40 bg-background/20 p-8 shadow-xl backdrop-blur-md"
			>
				<div
					class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"
				></div>
				<h1 class="mb-2 text-2xl font-bold text-foreground">Completing Sign In</h1>
				<p class="text-muted-foreground">Redirecting you to the dashboard...</p>
			</div>
		{/if}
	</div>
</div>
