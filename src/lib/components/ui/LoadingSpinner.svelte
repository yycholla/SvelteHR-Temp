<!--
	Loading Spinner Component
	
	Animated loading spinner with various sizes and styles
	Used for loading states and async operations
	
	Usage:
	<LoadingSpinner size="md" />
	<LoadingSpinner size="lg" text="Loading employees..." />
-->

<script lang="ts">
	import { cn } from '$lib/utils';

	// Component props
	interface LoadingSpinnerProps {
		size?: 'sm' | 'md' | 'lg' | 'xl';
		variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
		text?: string;
		centered?: boolean;
		overlay?: boolean;
		class?: string;
	}

	let {
		size = 'md',
		variant = 'spinner',
		text = '',
		centered = false,
		overlay = false,
		class: className = ''
	}: LoadingSpinnerProps = $props();

	// Size configurations
	const sizeStyles = {
		sm: 'w-4 h-4',
		md: 'w-6 h-6',
		lg: 'w-8 h-8',
		xl: 'w-12 h-12'
	};

	const textSizes = {
		sm: 'text-sm',
		md: 'text-base',
		lg: 'text-lg',
		xl: 'text-xl'
	};

	// Wrapper styles
	$: wrapperStyles = cn(
		'flex items-center justify-center',
		centered && 'min-h-[200px]',
		overlay && 'fixed inset-0 bg-background/80 backdrop-blur-sm z-50',
		text && 'flex-col gap-3',
		!text && 'gap-2'
	);
</script>

<div class={cn(wrapperStyles, className)} role="status" aria-label={text || 'Loading'}>
	{#if variant === 'spinner'}
		<svg 
			class={cn('animate-spin text-primary', sizeStyles[size])} 
			xmlns="http://www.w3.org/2000/svg" 
			fill="none" 
			viewBox="0 0 24 24"
		>
			<circle 
				class="opacity-25" 
				cx="12" 
				cy="12" 
				r="10" 
				stroke="currentColor" 
				stroke-width="4"
			></circle>
			<path 
				class="opacity-75" 
				fill="currentColor" 
				d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			></path>
		</svg>
	{:else if variant === 'dots'}
		<div class="flex space-x-1">
			{#each Array(3) as _, i}
				<div 
					class={cn(
						'bg-primary rounded-full animate-bounce',
						size === 'sm' ? 'w-2 h-2' : 
						size === 'md' ? 'w-3 h-3' : 
						size === 'lg' ? 'w-4 h-4' : 'w-5 h-5'
					)}
					style="animation-delay: {i * 0.1}s"
				></div>
			{/each}
		</div>
	{:else if variant === 'pulse'}
		<div 
			class={cn(
				'bg-primary rounded-full animate-ping',
				sizeStyles[size]
			)}
		></div>
	{:else if variant === 'bars'}
		<div class="flex space-x-1 items-end">
			{#each Array(4) as _, i}
				<div 
					class={cn(
						'bg-primary animate-pulse',
						size === 'sm' ? 'w-1' : 
						size === 'md' ? 'w-1.5' : 
						size === 'lg' ? 'w-2' : 'w-3'
					)}
					style="height: {Math.random() * 20 + 10}px; animation-delay: {i * 0.1}s; animation-duration: 1s;"
				></div>
			{/each}
		</div>
	{/if}
	
	{#if text}
		<p class={cn('text-muted-foreground font-medium', textSizes[size])}>
			{text}
		</p>
	{/if}
	
	<!-- Screen reader text -->
	<span class="sr-only">Loading content, please wait...</span>
</div>

<style>
	@keyframes bounce-delay {
		0%, 80%, 100% { 
			transform: scale(0);
		} 40% { 
			transform: scale(1.0);
		}
	}
	
	.animate-bounce-delay {
		animation: bounce-delay 1.4s infinite ease-in-out both;
	}
</style>