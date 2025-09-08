<!--
	Error Boundary Component
	
	Catches JavaScript errors in component tree and displays fallback UI
	Provides error reporting and recovery mechanisms
	
	Usage:
	<ErrorBoundary fallback={CustomErrorComponent} onError={handleError}>
		<MyComponent />
	</ErrorBoundary>
-->

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import Button from './ui/Button.svelte';

	// Component props
	interface ErrorBoundaryProps {
		fallback?: any;
		onError?: (error: Error, errorInfo?: any) => void;
		showDetails?: boolean;
		retryable?: boolean;
		children?: any;
	}

	let {
		fallback,
		onError,
		showDetails = false,
		retryable = true,
		children
	}: ErrorBoundaryProps = $props();

	// Component state
	let hasError = $state(false);
	let error: Error | null = $state(null);
	let errorInfo: any = $state(null);
	let retryCount = $state(0);
	let showDetailsExpanded = $state(false);

	const dispatch = createEventDispatcher();

	// Error boundary implementation
	let errorHandler: (event: ErrorEvent) => void;
	let unhandledRejectionHandler: (event: PromiseRejectionEvent) => void;

	onMount(() => {
		// Global error handler for JavaScript errors
		errorHandler = (event: ErrorEvent) => {
			handleError(new Error(event.message), {
				filename: event.filename,
				lineno: event.lineno,
				colno: event.colno,
				stack: event.error?.stack
			});
		};

		// Handler for unhandled promise rejections
		unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
			handleError(
				event.reason instanceof Error 
					? event.reason 
					: new Error(String(event.reason)),
				{ type: 'unhandled-promise-rejection' }
			);
		};

		window.addEventListener('error', errorHandler);
		window.addEventListener('unhandledrejection', unhandledRejectionHandler);
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('error', errorHandler);
			window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
		}
	});

	// Handle error
	function handleError(err: Error, info?: any) {
		hasError = true;
		error = err;
		errorInfo = info;

		// Log error to console
		console.error('Error Boundary caught an error:', err);
		if (info) {
			console.error('Error info:', info);
		}

		// Call custom error handler
		onError?.(err, info);

		// Dispatch error event
		dispatch('error', { error: err, errorInfo: info });

		// Report to error tracking service
		reportError(err, info);
	}

	// Report error to external service
	function reportError(err: Error, info?: any) {
		// This would typically send to an error tracking service like Sentry
		const errorReport = {
			message: err.message,
			stack: err.stack,
			url: window.location.href,
			userAgent: navigator.userAgent,
			timestamp: new Date().toISOString(),
			retryCount,
			...info
		};

		// Example: send to monitoring service
		// fetch('/api/errors', {
		//   method: 'POST',
		//   headers: { 'Content-Type': 'application/json' },
		//   body: JSON.stringify(errorReport)
		// });

		console.log('Error report:', errorReport);
	}

	// Retry functionality
	function handleRetry() {
		retryCount += 1;
		hasError = false;
		error = null;
		errorInfo = null;
		showDetailsExpanded = false;
	}

	// Reload page
	function handleReload() {
		window.location.reload();
	}

	// Toggle error details
	function toggleDetails() {
		showDetailsExpanded = !showDetailsExpanded;
	}

	// Get user-friendly error message
	function getUserFriendlyMessage(err: Error): string {
		if (err.message.includes('fetch')) {
			return 'Network connection error. Please check your internet connection and try again.';
		}
		
		if (err.message.includes('JSON')) {
			return 'Data format error. The server response was invalid.';
		}
		
		if (err.message.includes('permission') || err.message.includes('unauthorized')) {
			return 'Permission denied. Please log in again or contact your administrator.';
		}
		
		if (err.message.includes('timeout')) {
			return 'Request timeout. The operation took too long to complete.';
		}

		return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
	}

	// Get error severity
	function getErrorSeverity(err: Error): 'low' | 'medium' | 'high' | 'critical' {
		if (err.message.includes('Network') || err.message.includes('fetch')) {
			return 'medium';
		}
		
		if (err.message.includes('permission') || err.message.includes('unauthorized')) {
			return 'high';
		}
		
		if (err.message.includes('Cannot read') || err.message.includes('undefined')) {
			return 'critical';
		}

		return 'medium';
	}

	// Default fallback component
	const DefaultErrorFallback = () => {
		const severity = error ? getErrorSeverity(error) : 'medium';
		const userMessage = error ? getUserFriendlyMessage(error) : 'An error occurred';

		return `
			<div class="error-boundary min-h-[400px] flex items-center justify-center p-8">
				<div class="max-w-md w-full bg-background border border-destructive/20 rounded-lg p-6 shadow-lg">
					<div class="text-center mb-6">
						<div class="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
							<svg class="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
							</svg>
						</div>
						
						<h2 class="text-xl font-semibold text-foreground mb-2">
							Something went wrong
						</h2>
						
						<p class="text-muted-foreground text-sm mb-4">
							${userMessage}
						</p>
						
						<div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
							severity === 'critical' ? 'bg-destructive/10 text-destructive' :
							severity === 'high' ? 'bg-orange-100 text-orange-800' :
							severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
							'bg-blue-100 text-blue-800'
						}">
							${severity.charAt(0).toUpperCase() + severity.slice(1)} Priority
						</div>
					</div>
					
					<div class="space-y-3">
						${retryable ? `
							<button onclick="handleRetry()" class="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
								Try Again ${retryCount > 0 ? `(${retryCount})` : ''}
							</button>
						` : ''}
						
						<button onclick="handleReload()" class="w-full bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80 transition-colors">
							Reload Page
						</button>
						
						${showDetails || error ? `
							<button onclick="toggleDetails()" class="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
								${showDetailsExpanded ? 'Hide' : 'Show'} Technical Details
							</button>
						` : ''}
					</div>
					
					${showDetailsExpanded && error ? `
						<div class="mt-4 p-3 bg-muted rounded-md">
							<details class="text-xs">
								<summary class="cursor-pointer font-medium mb-2">Error Details</summary>
								<div class="space-y-2 text-muted-foreground">
									<div><strong>Error:</strong> ${error.message}</div>
									<div><strong>Type:</strong> ${error.name}</div>
									<div><strong>Time:</strong> ${new Date().toLocaleString()}</div>
									<div><strong>URL:</strong> ${window.location.href}</div>
									${error.stack ? `<div><strong>Stack:</strong><pre class="mt-1 text-xs whitespace-pre-wrap">${error.stack}</pre></div>` : ''}
								</div>
							</details>
						</div>
					` : ''}
					
					<div class="mt-6 text-center">
						<p class="text-xs text-muted-foreground">
							Error ID: ${Date.now().toString(36)}
							<br />
							Need help? <a href="mailto:support@mountainhr.com" class="text-primary hover:underline">Contact Support</a>
						</p>
					</div>
				</div>
			</div>
		`;
	};

	// Expose methods for parent components
	export function reset() {
		hasError = false;
		error = null;
		errorInfo = null;
		retryCount = 0;
		showDetailsExpanded = false;
	}

	export function getCurrentError() {
		return { error, errorInfo, retryCount };
	}
</script>

{#if hasError}
	{#if fallback}
		<svelte:component 
			this={fallback} 
			{error} 
			{errorInfo} 
			{retryCount}
			onRetry={handleRetry}
			onReload={handleReload}
			onToggleDetails={toggleDetails}
			showDetails={showDetailsExpanded}
		/>
	{:else}
		<div class="error-boundary min-h-[400px] flex items-center justify-center p-8">
			<div class="max-w-md w-full bg-background border border-destructive/20 rounded-lg p-6 shadow-lg">
				<div class="text-center mb-6">
					<div class="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
						<svg class="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
						</svg>
					</div>
					
					<h2 class="text-xl font-semibold text-foreground mb-2">
						Something went wrong
					</h2>
					
					<p class="text-muted-foreground text-sm mb-4">
						{error ? getUserFriendlyMessage(error) : 'An unexpected error occurred'}
					</p>
					
					{#if error}
						<div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {
							getErrorSeverity(error) === 'critical' ? 'bg-destructive/10 text-destructive' :
							getErrorSeverity(error) === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
							getErrorSeverity(error) === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
							'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
						}">
							{getErrorSeverity(error).charAt(0).toUpperCase() + getErrorSeverity(error).slice(1)} Priority
						</div>
					{/if}
				</div>
				
				<div class="space-y-3">
					{#if retryable}
						<Button variant="primary" class="w-full" onclick={handleRetry}>
							Try Again {retryCount > 0 ? `(${retryCount})` : ''}
						</Button>
					{/if}
					
					<Button variant="secondary" class="w-full" onclick={handleReload}>
						Reload Page
					</Button>
					
					{#if showDetails || error}
						<Button variant="ghost" size="sm" class="w-full" onclick={toggleDetails}>
							{showDetailsExpanded ? 'Hide' : 'Show'} Technical Details
						</Button>
					{/if}
				</div>
				
				{#if showDetailsExpanded && error}
					<div class="mt-4 p-3 bg-muted rounded-md">
						<details class="text-xs">
							<summary class="cursor-pointer font-medium mb-2">Error Details</summary>
							<div class="space-y-2 text-muted-foreground">
								<div><strong>Error:</strong> {error.message}</div>
								<div><strong>Type:</strong> {error.name}</div>
								<div><strong>Time:</strong> {new Date().toLocaleString()}</div>
								<div><strong>URL:</strong> {window.location.href}</div>
								{#if error.stack}
									<div><strong>Stack:</strong></div>
									<pre class="mt-1 text-xs whitespace-pre-wrap bg-background p-2 rounded border overflow-x-auto">{error.stack}</pre>
								{/if}
							</div>
						</details>
					</div>
				{/if}
				
				<div class="mt-6 text-center">
					<p class="text-xs text-muted-foreground">
						Error ID: {Date.now().toString(36)}
						<br />
						Need help? <a href="mailto:support@mountainhr.com" class="text-primary hover:underline">Contact Support</a>
					</p>
				</div>
			</div>
		</div>
	{/if}
{:else}
	{@render children?.()}
{/if}

<style>
	.error-boundary {
		isolation: isolate;
	}
</style>