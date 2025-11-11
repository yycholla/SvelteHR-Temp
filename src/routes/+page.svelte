<script lang="ts">
	import { Loader2 } from '@lucide/svelte';

	/**
	 * Root page component - Server-side redirect only
	 *
	 * All authentication and redirect logic is handled in +page.server.ts
	 * This component only shows a loading state during the server-side redirect
	 */
</script>

<svelte:head>
	<title>MountainHR - HR Management System</title>
	<meta name="description" content="Comprehensive HR management system for modern organizations" />
</svelte:head>

<!-- Loading state while redirecting -->
<div class="redirect-loading">
	<div class="loading-spinner">
		<Loader2 size={48} strokeWidth={2} class="animate-spin text-primary" />
	</div>
	<p class="loading-text">Loading MountainHR...</p>
</div>

<style>
	.redirect-loading {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background-color: hsl(var(--background));
		color: hsl(var(--muted-foreground));
		padding: 2rem;
		gap: 1.5rem;
	}

	.loading-spinner {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.loading-text {
		font-size: 1rem;
		font-weight: 400;
		line-height: 1.5;
		color: hsl(var(--muted-foreground));
		text-align: center;
	}

	/* Responsive adjustments */
	@media (max-width: 671px) {
		.redirect-loading {
			padding: 1.5rem;
		}
	}
</style>
