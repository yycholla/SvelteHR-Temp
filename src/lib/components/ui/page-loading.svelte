<script lang="ts">
	import LoadingSpinner from './loading-spinner.svelte';
	import { cn } from '$lib/utils/styles';

	interface Props {
		title?: string;
		description?: string;
		fullScreen?: boolean;
		variant?: 'default' | 'minimal' | 'detailed';
		class?: string;
	}

	let {
		title = 'Loading',
		description = 'Please wait while we load your data...',
		fullScreen = false,
		variant = 'default',
		class: className
	}: Props = $props();

	const containerClasses = fullScreen
		? 'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm'
		: 'flex items-center justify-center p-8';
</script>

<div
	class={cn(containerClasses, className)}
	role="status"
	aria-live="polite"
	aria-label={`${title} - ${description}`}
>
	{#if variant === 'minimal'}
		<LoadingSpinner size="lg" variant="primary" label={title} />
	{:else if variant === 'detailed'}
		<div class="flex flex-col items-center space-y-6 text-center">
			<div class="rounded-full bg-primary/10 p-4">
				<LoadingSpinner size="xl" variant="primary" label={title} />
			</div>
			<div class="space-y-2">
				<h2 class="text-lg font-semibold text-foreground">{title}</h2>
				<p class="text-sm text-muted-foreground max-w-sm">{description}</p>
			</div>
			<div class="flex items-center space-x-2 text-xs text-muted-foreground">
				<div class="h-1 w-1 rounded-full bg-muted-foreground animate-pulse"></div>
				<div class="h-1 w-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:0.2s]"></div>
				<div class="h-1 w-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:0.4s]"></div>
			</div>
		</div>
	{:else}
		<!-- Default variant -->
		<div class="flex flex-col items-center space-y-4 text-center">
			<LoadingSpinner size="lg" variant="primary" label={title} />
			<div class="space-y-1">
				<h3 class="text-base font-medium text-foreground">{title}</h3>
				<p class="text-sm text-muted-foreground">{description}</p>
			</div>
		</div>
	{/if}
</div>