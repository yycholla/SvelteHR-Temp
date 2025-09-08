<!--
	Loading States Component
	
	Centralized loading state management with different loading indicators
	Provides consistent loading UX across the application
	
	Usage:
	<LoadingStates
		loading={isLoading}
		error={errorMessage}
		empty={isEmpty}
		loadingComponent={CustomSkeleton}
		emptyMessage="No employees found"
	>
		<YourContent />
	</LoadingStates>
-->

<script lang="ts">
	import LoadingSpinner from './LoadingSpinner.svelte';
	import Button from './Button.svelte';
	import { createEventDispatcher } from 'svelte';

	// Component props
	interface LoadingStatesProps {
		loading?: boolean;
		error?: string | null;
		empty?: boolean;
		data?: any[];
		loadingComponent?: any;
		errorComponent?: any;
		emptyComponent?: any;
		loadingText?: string;
		emptyTitle?: string;
		emptyMessage?: string;
		emptyActionText?: string;
		onEmptyAction?: () => void;
		onRetry?: () => void;
		showRetry?: boolean;
		minHeight?: string;
		class?: string;
		children?: any;
	}

	let {
		loading = false,
		error = null,
		empty = false,
		data = [],
		loadingComponent,
		errorComponent,
		emptyComponent,
		loadingText = 'Loading...',
		emptyTitle = 'No data found',
		emptyMessage = 'There is no data to display at the moment.',
		emptyActionText = 'Refresh',
		onEmptyAction,
		onRetry,
		showRetry = true,
		minHeight = '200px',
		class: className = '',
		children
	}: LoadingStatesProps = $props();

	const dispatch = createEventDispatcher();

	// Auto-detect empty state from data
	$: isEmptyState = empty || (data && Array.isArray(data) && data.length === 0);

	// Handle retry action
	function handleRetry() {
		if (onRetry) {
			onRetry();
		} else {
			dispatch('retry');
		}
	}

	// Handle empty action
	function handleEmptyAction() {
		if (onEmptyAction) {
			onEmptyAction();
		} else {
			dispatch('empty-action');
		}
	}

	// Default error component
	const DefaultErrorComponent = () => (
		`<div class="flex flex-col items-center justify-center p-8 text-center space-y-4" style="min-height: ${minHeight}">
			<div class="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
				<svg class="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			</div>
			<div class="space-y-2">
				<h3 class="text-lg font-semibold text-foreground">Something went wrong</h3>
				<p class="text-muted-foreground max-w-md">${error}</p>
			</div>
			${showRetry ? `<button onclick="handleRetry()" class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">Try Again</button>` : ''}
		</div>`
	);

	// Default empty component
	const DefaultEmptyComponent = () => (
		`<div class="flex flex-col items-center justify-center p-8 text-center space-y-4" style="min-height: ${minHeight}">
			<div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
				<svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
				</svg>
			</div>
			<div class="space-y-2">
				<h3 class="text-lg font-semibold text-foreground">${emptyTitle}</h3>
				<p class="text-muted-foreground max-w-md">${emptyMessage}</p>
			</div>
			${emptyActionText && (onEmptyAction || onRetry) ? `<button onclick="${onEmptyAction ? 'handleEmptyAction' : 'handleRetry'}()" class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">${emptyActionText}</button>` : ''}
		</div>`
	);

	// Default loading component
	const DefaultLoadingComponent = () => (
		`<div class="flex items-center justify-center p-8" style="min-height: ${minHeight}">
			<div class="flex flex-col items-center space-y-4">
				<div class="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
				<p class="text-muted-foreground">${loadingText}</p>
			</div>
		</div>`
	);
</script>

<div class={`loading-states-wrapper ${className}`}>
	{#if loading}
		{#if loadingComponent}
			<svelte:component this={loadingComponent} text={loadingText} />
		{:else}
			<div class="flex items-center justify-center p-8" style="min-height: {minHeight}">
				<div class="flex flex-col items-center space-y-4">
					<LoadingSpinner size="lg" />
					<p class="text-muted-foreground font-medium">{loadingText}</p>
				</div>
			</div>
		{/if}
	{:else if error}
		{#if errorComponent}
			<svelte:component this={errorComponent} {error} onRetry={handleRetry} />
		{:else}
			<div class="flex flex-col items-center justify-center p-8 text-center space-y-4" style="min-height: {minHeight}">
				<div class="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
					<svg class="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<div class="space-y-2">
					<h3 class="text-lg font-semibold text-foreground">Something went wrong</h3>
					<p class="text-muted-foreground max-w-md">{error}</p>
				</div>
				{#if showRetry}
					<Button onclick={handleRetry}>Try Again</Button>
				{/if}
			</div>
		{/if}
	{:else if isEmptyState}
		{#if emptyComponent}
			<svelte:component this={emptyComponent} {emptyTitle} {emptyMessage} onAction={handleEmptyAction} />
		{:else}
			<div class="flex flex-col items-center justify-center p-8 text-center space-y-4" style="min-height: {minHeight}">
				<div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
					<svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
					</svg>
				</div>
				<div class="space-y-2">
					<h3 class="text-lg font-semibold text-foreground">{emptyTitle}</h3>
					<p class="text-muted-foreground max-w-md">{emptyMessage}</p>
				</div>
				{#if emptyActionText && (onEmptyAction || onRetry)}
					<Button onclick={onEmptyAction ? handleEmptyAction : handleRetry}>
						{emptyActionText}
					</Button>
				{/if}
			</div>
		{/if}
	{:else}
		{@render children?.()}
	{/if}
</div>

<style>
	.loading-states-wrapper {
		position: relative;
		isolation: isolate;
	}
</style>