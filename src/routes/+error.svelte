<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import ErrorBoundary from '$lib/components/ui/error-boundary.svelte';

	// Safe getter functions that never throw
	function safeGet<T>(fn: () => T, fallback: T): T {
		try {
			const result = fn();
			return result ?? fallback;
		} catch (e) {
			console.warn('Safe getter caught error:', e);
			return fallback;
		}
	}

	// Get initial page data non-reactively to avoid circular dependencies
	let initialPageData = untrack(() => {
		try {
			return $page;
		} catch {
			return { error: null, status: 500, data: {}, url: { pathname: 'unknown' } };
		}
	});

	// SvelteKit provides error details in the page store
	// Access page store values reactively with safe fallbacks
	let pageData = $derived.by(() => {
		try {
			return $page;
		} catch {
			return initialPageData;
		}
	});

	let error = $derived.by(() => safeGet(() => pageData?.error, null));
	let status = $derived.by(() => safeGet(() => pageData?.status, 500));
	let userData = $derived.by(() => safeGet(() => pageData?.data?.user, null));

	// Create a proper Error object from SvelteKit error
	let errorObject = $derived.by(() => {
		try {
			if (!error) return null;
			if (error instanceof Error) return error;
			const msg = typeof error === 'string' ? error : (error?.message ?? `HTTP ${status}`);
			return new Error(msg);
		} catch {
			return new Error('An error occurred');
		}
	});

	// Customize title and description based on error status
	let title = $derived.by(() => {
		try {
			return status === 404 ? 'Page Not Found' :
				status === 403 ? 'Access Forbidden' :
				status === 401 ? 'Unauthorized' :
				status === 500 ? 'Internal Server Error' :
				'Something Went Wrong';
		} catch {
			return 'Error';
		}
	});

	let description = $derived.by(() => {
		try {
			return status === 404 ? "The page you're looking for doesn't exist or has been moved." :
				status === 403 ? "You don't have permission to access this resource." :
				status === 401 ? 'Please log in to access this page.' :
				status === 500 ? 'We encountered a server error. Our team has been notified.' :
				'An unexpected error occurred. Please try again or contact support if the problem persists.';
		} catch {
			return 'An error occurred.';
		}
	});

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
		try {
			if (typeof window !== 'undefined' && import.meta.env.DEV) {
				const errorToLog = safeGet(() => error, null);
				if (errorToLog) {
					console.error('SvelteKit Error Page:', {
						status: safeGet(() => status, 500),
						error: errorToLog,
						url: safeGet(() => pageData?.url?.pathname, 'unknown')
					});
				}
			}
		} catch (e) {
			// Silently ignore logging errors to prevent cascading failures
			try {
				console.error('Error logging failed:', e);
			} catch {
				// Really can't log, give up
			}
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
{#if status === 404 && pageData?.url?.pathname}
	<div class="fixed bottom-4 right-4 text-xs text-muted-foreground">
		URL: {pageData.url.pathname}
	</div>
{/if}
