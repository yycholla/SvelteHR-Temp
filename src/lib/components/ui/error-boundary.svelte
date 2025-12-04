<script lang="ts">
	import { AlertTriangle, RefreshCw, Home, Bug } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
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

	// Extract error details reactively with safe access
	let errorMessage = $derived(
		!error
			? 'Unknown error occurred'
			: typeof error === 'string'
				? error
				: (error?.message ?? 'Unknown error occurred')
	);
	let errorStack = $derived(error ? (error?.stack ?? '') : '');
	let errorName = $derived(error ? (error?.name ?? 'Error') : 'Error');
</script>

{#if error}
	<div class={cn('flex items-center justify-center p-4', className)}>
		{#if variant === 'minimal'}
			<div class="space-y-4 text-center">
				<AlertTriangle class="mx-auto h-8 w-8 text-destructive" />
				<div class="space-y-1">
					<h3 class="text-sm font-medium text-foreground">{title}</h3>
					<p class="text-xs text-muted-foreground">{errorMessage}</p>
				</div>
				{#if showReload}
					<Button size="sm" variant="outline" onclick={handleReload}>
						<RefreshCw class="mr-1 h-3 w-3" />
						Retry
					</Button>
				{/if}
			</div>
		{:else if variant === 'detailed'}
			<Card class="w-full max-w-2xl">
				<CardHeader class="text-center">
					<div class="mx-auto mb-4 w-fit rounded-full bg-destructive/10 p-4">
						<AlertTriangle class="h-8 w-8 text-destructive" />
					</div>
					<CardTitle class="text-xl">{title}</CardTitle>
					<CardDescription class="text-base">{description}</CardDescription>
				</CardHeader>

				<CardContent class="space-y-4">
					<div class="rounded-lg bg-muted p-4">
						<div class="flex items-start gap-3">
							<Bug class="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
							<div class="min-w-0 flex-1 space-y-1">
								<p class="text-sm font-medium text-foreground">{errorName}</p>
								<p class="break-words text-sm text-muted-foreground">{errorMessage}</p>
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
									<pre
										class="max-h-32 overflow-auto whitespace-pre-wrap font-mono text-xs text-muted-foreground">{errorStack}</pre>
								</div>
							{/if}
						</div>
					{/if}
				</CardContent>

				<CardFooter class="flex justify-center gap-3">
					{#if showReload}
						<Button onclick={handleReload} class="max-w-32 flex-1">
							<RefreshCw class="mr-2 h-4 w-4" />
							Try Again
						</Button>
					{/if}

					{#if showHome}
						<Button variant="outline" onclick={handleHome} class="max-w-32 flex-1">
							<Home class="mr-2 h-4 w-4" />
							Go Home
						</Button>
					{/if}
				</CardFooter>
			</Card>
		{:else}
			<!-- Default variant -->
			<Card class="w-full max-w-md">
				<CardHeader class="text-center">
					<AlertTriangle class="mx-auto mb-4 h-12 w-12 text-destructive" />
					<CardTitle>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>

				<CardContent>
					<div class="rounded-md border border-destructive/20 bg-destructive/10 p-3">
						<p class="break-words font-mono text-sm text-destructive">{errorMessage}</p>
					</div>
				</CardContent>

				<CardFooter class="flex justify-center gap-2">
					{#if showReload}
						<Button onclick={handleReload} size="sm">
							<RefreshCw class="mr-2 h-4 w-4" />
							Try Again
						</Button>
					{/if}

					{#if showHome}
						<Button variant="outline" onclick={handleHome} size="sm">
							<Home class="mr-2 h-4 w-4" />
							Home
						</Button>
					{/if}
				</CardFooter>
			</Card>
		{/if}
	</div>
{/if}
