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

<div class="min-h-screen bg-gradient-to-br from-yellow-100/50 via-blue-100/40 to-blue-200/60 dark:from-yellow-900/20 dark:via-blue-900/25 dark:to-blue-800/30 flex items-center justify-center p-4">
	<div class="w-full max-w-md text-center">
		{#if error}
			<div class="bg-background/20 backdrop-blur-md border border-border/40 shadow-xl rounded-2xl p-8">
				<div class="text-destructive text-4xl mb-4">⚠️</div>
				<h1 class="text-2xl font-bold text-foreground mb-2">Authentication Failed</h1>
				<p class="text-muted-foreground mb-4">Error: {error}</p>
				<a 
					href="/login"
					class="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
				>
					Try Again
				</a>
			</div>
		{:else}
			<div class="bg-background/20 backdrop-blur-md border border-border/40 shadow-xl rounded-2xl p-8">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
				<h1 class="text-2xl font-bold text-foreground mb-2">Completing Sign In</h1>
				<p class="text-muted-foreground">Redirecting you to the dashboard...</p>
			</div>
		{/if}
	</div>
</div>