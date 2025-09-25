<script lang="ts">
	import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { cn } from '$lib/utils/styles';

	interface Props {
		error: Error | null;
		title?: string;
		description?: string;
		showReload?: boolean;
		showHome?: boolean;
		showDetails?: boolean;
		variant?: 'default' | 'minimal' | 'detailed';
		class?: string;
		onRetry?: () => void;
		onHome?: () => void;
	}

	let {
		error,
		title = 'Something went wrong',
		description = 'We encountered an unexpected error. Please try again or contact support if the problem persists.',
		showReload = true,
		showHome = true,
		showDetails = false,
		variant = 'default',
		class: className,
		onRetry,
		onHome
	}: Props = $props();

	let showErrorDetails = $state(false);

	function handleReload() {
		if (onRetry) {
			onRetry();
		} else {
			window.location.reload();
		}
	}

	function handleHome() {
		if (onHome) {
			onHome();
		} else {
			window.location.href = '/dashboard';
		}
	}

	function toggleDetails() {
		showErrorDetails = !showErrorDetails;
	}

	// Extract error details
	const errorMessage = error?.message || 'Unknown error occurred';
	const errorStack = error?.stack || '';
	const errorName = error?.name || 'Error';
</script>

{#if error}
	<div class={cn('flex items-center justify-center p-4', className)}>
		{#if variant === 'minimal'}
			<div class="text-center space-y-4">
				<AlertTriangle class="h-8 w-8 text-destructive mx-auto" />
				<div class="space-y-1">
					<h3 class="text-sm font-medium text-foreground">{title}</h3>
					<p class="text-xs text-muted-foreground">{errorMessage}</p>
				</div>
				{#if showReload}
					<Button size="sm" variant="outline" onclick={handleReload}>
						<RefreshCw class="h-3 w-3 mr-1" />
						Retry
					</Button>
				{/if}
			</div>
		{:else if variant === 'detailed'}
			<Card class="w-full max-w-2xl">
				<CardHeader class="text-center">
					<div class="mx-auto mb-4 rounded-full bg-destructive/10 p-4 w-fit">
						<AlertTriangle class="h-8 w-8 text-destructive" />
					</div>
					<CardTitle class="text-xl">{title}</CardTitle>
					<CardDescription class="text-base">{description}</CardDescription>
				</CardHeader>

				<CardContent class="space-y-4">
					<div class="rounded-lg bg-muted p-4">
						<div class="flex items-start gap-3">
							<Bug class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
							<div class="space-y-1 min-w-0 flex-1">
								<p class="text-sm font-medium text-foreground">{errorName}</p>
								<p class="text-sm text-muted-foreground break-words">{errorMessage}</p>
							</div>
						</div>
					</div>

					{#if showDetails}
						<div class="space-y-2">
							<Button
								variant="ghost"
								size="sm"
								onclick={toggleDetails}
								class="text-xs text-muted-foreground hover:text-foreground"
							>
								{showErrorDetails ? 'Hide' : 'Show'} technical details
							</Button>

							{#if showErrorDetails && errorStack}
								<div class="rounded-lg bg-muted p-3">
									<pre class="text-xs text-muted-foreground whitespace-pre-wrap font-mono overflow-auto max-h-32">{errorStack}</pre>
								</div>
							{/if}
						</div>
					{/if}
				</CardContent>

				<CardFooter class="flex gap-3 justify-center">
					{#if showReload}
						<Button onclick={handleReload} class="flex-1 max-w-32">
							<RefreshCw class="h-4 w-4 mr-2" />
							Try Again
						</Button>
					{/if}

					{#if showHome}
						<Button variant="outline" onclick={handleHome} class="flex-1 max-w-32">
							<Home class="h-4 w-4 mr-2" />
							Go Home
						</Button>
					{/if}
				</CardFooter>
			</Card>
		{:else}
			<!-- Default variant -->
			<Card class="w-full max-w-md">
				<CardHeader class="text-center">
					<AlertTriangle class="h-12 w-12 text-destructive mx-auto mb-4" />
					<CardTitle>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>

				<CardContent>
					<div class="rounded-md bg-destructive/10 p-3 border border-destructive/20">
						<p class="text-sm text-destructive font-mono break-words">{errorMessage}</p>
					</div>
				</CardContent>

				<CardFooter class="flex gap-2 justify-center">
					{#if showReload}
						<Button onclick={handleReload} size="sm">
							<RefreshCw class="h-4 w-4 mr-2" />
							Try Again
						</Button>
					{/if}

					{#if showHome}
						<Button variant="outline" onclick={handleHome} size="sm">
							<Home class="h-4 w-4 mr-2" />
							Home
						</Button>
					{/if}
				</CardFooter>
			</Card>
		{/if}
	</div>
{/if}