<script lang="ts">
	import { Loading } from 'carbon-components-svelte';

	/**
	 * Root page component - Server-side redirect only
	 *
	 * All authentication and redirect logic is handled in +page.server.ts
	 * This component only shows a loading state during the server-side redirect
	 */
</script>

<svelte:head>
	<title>SvelteHR - HR Management System</title>
	<meta name="description" content="Comprehensive HR management system for modern organizations" />
</svelte:head>

<!-- Loading state while redirecting -->
<div class="redirect-loading carbon-loading-state">
	<div class="loading-spinner">
		<Loading withOverlay={false} />
	</div>
	<p class="loading-text">Loading SvelteHR...</p>
</div>

<style>
	.carbon-loading-state {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background-color: var(--cds-background);
		color: var(--cds-text-secondary);
		padding: var(--cds-spacing-06);
		gap: var(--cds-spacing-06);
	}

	.loading-spinner {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.loading-text {
		font-size: var(--cds-body-short-01-font-size);
		font-weight: var(--cds-body-short-01-font-weight);
		line-height: var(--cds-body-short-01-line-height);
		color: var(--cds-text-secondary);
		text-align: center;
	}

	/* Ensure Carbon loading component is properly styled */
	:global(.carbon-loading-state .bx--loading) {
		position: static;
		transform: none;
	}

	/* Responsive adjustments */
	@media (max-width: 671px) {
		.carbon-loading-state {
			padding: var(--cds-spacing-05);
		}
	}
</style>
