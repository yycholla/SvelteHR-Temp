<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ErrorBoundary from '$lib/components/ui/error-boundary.svelte';

	// SvelteKit provides error details in the page store
	$: error = $page.error;
	$: status = $page.status;

	// Create a proper Error object from SvelteKit error
	$: errorObject = error ? new Error(error.message || `HTTP ${status}`) : null;

	// Customize title and description based on error status
	$: title = (() => {
		switch (status) {
			case 404:
				return 'Page Not Found';
			case 403:
				return 'Access Forbidden';
			case 401:
				return 'Unauthorized';
			case 500:
				return 'Internal Server Error';
			default:
				return 'Something Went Wrong';
		}
	})();

	$: description = (() => {
		switch (status) {
			case 404:
				return "The page you're looking for doesn't exist or has been moved.";
			case 403:
				return "You don't have permission to access this resource.";
			case 401:
				return 'Please log in to access this page.';
			case 500:
				return 'We encountered a server error. Our team has been notified.';
			default:
				return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
		}
	})();

	function handleRetry() {
		// Reload the current page
		window.location.reload();
	}

	function handleHome() {
		// Navigate to dashboard or home
		goto('/dashboard');
	}

	// Log error details for debugging (in development)
	if (typeof window !== 'undefined' && import.meta.env.DEV && error) {
		console.error('SvelteKit Error Page:', {
			status,
			error,
			url: $page.url.pathname
		});
	}
</script>

<svelte:head>
	<title>{title} - SvelteHR</title>
	<meta name="description" content={description} />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- Full-screen error page -->
<div class="flex min-h-screen items-center justify-center bg-background p-4">
	<ErrorBoundary
		error={errorObject}
		{title}
		{description}
		variant="detailed"
		showReload={status !== 404}
		showHome={true}
		showDetails={import.meta.env.DEV && status >= 500}
		onRetry={handleRetry}
		onHome={handleHome}
		class="w-full max-w-2xl"
	/>
</div>

<!-- Additional context for specific error types -->
{#if status === 404}
	<div class="fixed bottom-4 right-4 text-xs text-muted-foreground">
		URL: {$page.url.pathname}
	</div>
{/if}
