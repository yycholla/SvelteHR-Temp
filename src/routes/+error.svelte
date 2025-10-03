<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ErrorBoundary from '$lib/components/ui/error-boundary.svelte';

	// SvelteKit provides error details in the page store
	// Access page store values reactively
	let pageData = $derived($page);
	let error = $derived(pageData.error);
	let status = $derived(pageData.status);
	let userData = $derived(pageData.data?.user);

	// Create a proper Error object from SvelteKit error
	let errorObject = $derived(
		!error ? null :
		error instanceof Error ? error :
		new Error(typeof error === 'string' ? error : (error?.message || `HTTP ${status}`))
	);

	// Customize title and description based on error status
	let title = $derived(
		status === 404 ? 'Page Not Found' :
		status === 403 ? 'Access Forbidden' :
		status === 401 ? 'Unauthorized' :
		status === 500 ? 'Internal Server Error' :
		'Something Went Wrong'
	);

	let description = $derived(
		status === 404 ? "The page you're looking for doesn't exist or has been moved." :
		status === 403 ? "You don't have permission to access this resource." :
		status === 401 ? 'Please log in to access this page.' :
		status === 500 ? 'We encountered a server error. Our team has been notified.' :
		'An unexpected error occurred. Please try again or contact support if the problem persists.'
	);

	function handleRetry() {
		// Reload the current page
		window.location.reload();
	}

	function handleHome() {
		// Navigate to dashboard or home
		goto('/dashboard');
	}

	// Log error details for debugging (in development)
	$effect(() => {
		if (typeof window !== 'undefined' && import.meta.env.DEV && error) {
			console.error('SvelteKit Error Page:', {
				status,
				error,
				url: $page.url.pathname
			});
		}
	});
</script>

<svelte:head>
	<title>{title} - SvelteHR</title>
	<meta name="description" content={description} />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- Full-screen error page -->
<div class="flex min-h-screen items-center justify-center bg-background p-4">
	<div class="w-full max-w-2xl space-y-4">
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
			class="w-full"
		/>

		<!-- Show user role on access denied errors -->
		{#if status === 403 && userData}
			<div class="rounded-lg border border-warning bg-warning/5 p-4 text-sm">
				<p class="font-medium text-warning-foreground">Current User Information:</p>
				<div class="mt-2 space-y-1 text-muted-foreground">
					<p>
						<span class="font-medium">Email:</span>
						{userData.email}
					</p>
					<p>
						<span class="font-medium">Role:</span>
						{userData.role || 'Not assigned'}
					</p>
					{#if userData.display_name}
						<p>
							<span class="font-medium">Display Name:</span>
							{userData.display_name}
						</p>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Additional context for specific error types -->
{#if status === 404}
	<div class="fixed bottom-4 right-4 text-xs text-muted-foreground">
		URL: {$page.url.pathname}
	</div>
{/if}
