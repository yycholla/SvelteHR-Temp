<!-- Standardized Error Boundary Component for client-side error handling -->
<!-- T055: Error Handling Standardization - CRITICAL -->

<script lang="ts">
	import { createErrorBoundary, type StandardErrorResponse } from '$lib/utils/error-handling.js';
	import { onMount } from 'svelte';
	import { AlertCircle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';

	// Component props
	interface Props {
		// Fallback UI to show when error occurs
		fallback?: import('svelte').Snippet;
		// Whether to show detailed error information (development only)
		showDetails?: boolean;
		// Custom error handler
		onError?: (error: StandardErrorResponse) => void;
		// Whether to show retry button
		showRetry?: boolean;
		// Custom retry handler
		onRetry?: () => void;
		// Children to wrap in error boundary
		children: import('svelte').Snippet;
	}

	let {
		fallback,
		showDetails = false,
		onError,
		showRetry = true,
		onRetry,
		children
	}: Props = $props();

	// Error boundary state management
	const errorBoundary = createErrorBoundary();

	// Show/hide error details
	let showErrorDetails = $state(false);

	// Handle component errors
	onMount(() => {
		// Global error handler for unhandled promise rejections
		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			errorBoundary.handleError(event.reason, { operation: 'Unhandled Promise Rejection' });
			if (onError) {
				onError(errorBoundary.error!);
			}
		};

		// Global error handler for JavaScript errors
		const handleError = (event: ErrorEvent) => {
			errorBoundary.handleError(event.error, { operation: 'JavaScript Error' });
			if (onError) {
				onError(errorBoundary.error!);
			}
		};

		window.addEventListener('unhandledrejection', handleUnhandledRejection);
		window.addEventListener('error', handleError);

		return () => {
			window.removeEventListener('unhandledrejection', handleUnhandledRejection);
			window.removeEventListener('error', handleError);
		};
	});

	// Retry handler
	const handleRetry = () => {
		errorBoundary.clearError();
		if (onRetry) {
			onRetry();
		} else {
			// Default retry: reload the page
			window.location.reload();
		}
	};

	// Navigate home
	const goHome = () => {
		window.location.href = '/dashboard';
	};

	// Error type styling
	const getErrorTypeColor = (type: StandardErrorResponse['type']) => {
		switch (type) {
			case 'validation':
				return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			case 'authentication':
			case 'authorization':
				return 'text-red-600 bg-red-50 border-red-200';
			case 'not_found':
				return 'text-blue-600 bg-blue-50 border-blue-200';
			case 'network_error':
				return 'text-orange-600 bg-orange-50 border-orange-200';
			case 'graphql_error':
				return 'text-purple-600 bg-purple-50 border-purple-200';
			default:
				return 'text-red-600 bg-red-50 border-red-200';
		}
	};

	// Error type display name
	const getErrorTypeDisplayName = (type: StandardErrorResponse['type']) => {
		switch (type) {
			case 'validation':
				return 'Validation Error';
			case 'authentication':
				return 'Authentication Error';
			case 'authorization':
				return 'Permission Error';
			case 'not_found':
				return 'Not Found';
			case 'network_error':
				return 'Network Error';
			case 'graphql_error':
				return 'Data Loading Error';
			case 'server_error':
				return 'Server Error';
			default:
				return 'Application Error';
		}
	};
</script>

{#if errorBoundary.hasError}
	<!-- Error State -->
	{#if fallback}
		{@render fallback()}
	{:else}
		<div class="flex min-h-[400px] items-center justify-center p-6">
			<Card class="mx-auto w-full max-w-lg {getErrorTypeColor(errorBoundary.error!.type)}">
				<CardHeader class="text-center">
					<div class="mb-4 flex justify-center">
						<AlertCircle class="h-12 w-12 text-current" />
					</div>
					<CardTitle class="text-xl font-semibold">
						{getErrorTypeDisplayName(errorBoundary.error!.type)}
					</CardTitle>
					<CardDescription class="text-current/80">
						{errorBoundary.error!.userMessage}
					</CardDescription>
				</CardHeader>

				<CardContent class="space-y-4">
					<!-- Action Buttons -->
					<div class="flex flex-col justify-center gap-2 sm:flex-row">
						{#if showRetry}
							<Button on:click={handleRetry} variant="default" class="flex items-center gap-2">
								<RefreshCw class="h-4 w-4" />
								Try Again
							</Button>
						{/if}

						<Button on:click={goHome} variant="outline" class="flex items-center gap-2">
							<Home class="h-4 w-4" />
							Go Home
						</Button>
					</div>

					<!-- Error Details Toggle (Development) -->
					{#if showDetails && errorBoundary.error!.details}
						<div class="mt-4 border-t pt-4">
							<Button
								on:click={() => (showErrorDetails = !showErrorDetails)}
								variant="ghost"
								size="sm"
								class="flex items-center gap-2 text-xs"
							>
								{#if showErrorDetails}
									<ChevronUp class="h-3 w-3" />
									Hide Details
								{:else}
									<ChevronDown class="h-3 w-3" />
									Show Details
								{/if}
							</Button>

							{#if showErrorDetails}
								<div
									class="mt-2 max-h-40 overflow-auto rounded-md bg-gray-50 p-3 font-mono text-xs"
								>
									<div class="space-y-2">
										<div>
											<strong>Request ID:</strong>
											{errorBoundary.error!.requestId}
										</div>
										<div>
											<strong>Timestamp:</strong>
											{new Date(errorBoundary.error!.timestamp).toLocaleString()}
										</div>
										<div>
											<strong>Error Type:</strong>
											{errorBoundary.error!.type}
										</div>
										{#if errorBoundary.error!.details.originalMessage}
											<div>
												<strong>Original Message:</strong>
												{errorBoundary.error!.details.originalMessage}
											</div>
										{/if}
										{#if errorBoundary.error!.details.stack}
											<div>
												<strong>Stack Trace:</strong>
												<pre class="mt-1 whitespace-pre-wrap text-xs">{errorBoundary.error!.details
														.stack}</pre>
											</div>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Help Text -->
					<div class="mt-4 text-center text-xs text-gray-500">
						{#if errorBoundary.error!.type === 'network_error'}
							Check your internet connection and try again.
						{:else if errorBoundary.error!.type === 'authentication'}
							You may need to log in again.
						{:else if errorBoundary.error!.type === 'authorization'}
							Contact your administrator if you need access to this resource.
						{:else}
							If this problem persists, please contact support.
						{/if}
					</div>
				</CardContent>
			</Card>
		</div>
	{/if}
{:else}
	<!-- Success State - Render children -->
	{@render children()}
{/if}
