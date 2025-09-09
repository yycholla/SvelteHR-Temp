<!--
	Skeleton Loading Component
	
	Provides skeleton loading animations for various content types
	Used to show loading placeholders while data is being fetched
	
	Usage:
	<Skeleton class="h-4 w-32" />
	<Skeleton variant="text" lines={3} />
	<Skeleton variant="card" />
-->

<script lang="ts">
	import { cn } from '$lib/utils';

	// Component props
	interface SkeletonProps {
		variant?: 'default' | 'text' | 'circular' | 'rectangular' | 'card' | 'table' | 'avatar';
		lines?: number;
		width?: string | number;
		height?: string | number;
		class?: string;
		animate?: boolean;
		children?: any;
	}

	let {
		variant = 'default',
		lines = 1,
		width,
		height,
		class: className = '',
		animate = true,
		children
	}: SkeletonProps = $props();

	// Base skeleton styles
	const baseStyles = 'bg-muted rounded-md';
	const animationStyles = animate ? 'animate-pulse' : '';

	// Variant styles
	const variantStyles = {
		default: 'h-4',
		text: 'h-4',
		circular: 'rounded-full aspect-square',
		rectangular: 'rounded-md',
		card: 'h-48 w-full',
		table: 'h-10 w-full',
		avatar: 'w-10 h-10 rounded-full'
	};

	// Computed styles
	$: computedStyles = cn(
		baseStyles,
		animationStyles,
		variantStyles[variant],
		className
	);

	// Style object for custom dimensions
	$: styleObject = {
		...(width && { width: typeof width === 'number' ? `${width}px` : width }),
		...(height && { height: typeof height === 'number' ? `${height}px` : height })
	};
</script>

{#if variant === 'text' && lines > 1}
	<div class="space-y-2">
		{#each Array(lines) as _, index}
			<div 
				class={computedStyles} 
				style:width={index === lines - 1 ? '75%' : '100%'}
			></div>
		{/each}
	</div>
{:else if variant === 'card'}
	<div class={cn('border rounded-lg p-4 space-y-3', className)}>
		<div class="flex items-center space-x-4">
			<div class={cn(baseStyles, animationStyles, 'w-12 h-12 rounded-full')}></div>
			<div class="space-y-2 flex-1">
				<div class={cn(baseStyles, animationStyles, 'h-4 w-3/4')}></div>
				<div class={cn(baseStyles, animationStyles, 'h-3 w-1/2')}></div>
			</div>
		</div>
		<div class="space-y-2">
			<div class={cn(baseStyles, animationStyles, 'h-3 w-full')}></div>
			<div class={cn(baseStyles, animationStyles, 'h-3 w-4/5')}></div>
			<div class={cn(baseStyles, animationStyles, 'h-3 w-3/5')}></div>
		</div>
	</div>
{:else if variant === 'table'}
	<div class={cn('border rounded-lg overflow-hidden', className)}>
		<!-- Table header -->
		<div class="border-b p-4 bg-muted/50">
			<div class="flex space-x-4">
				{#each Array(4) as _}
					<div class={cn(baseStyles, animationStyles, 'h-4 flex-1')}></div>
				{/each}
			</div>
		</div>
		
		<!-- Table rows -->
		{#each Array(5) as _}
			<div class="border-b last:border-b-0 p-4">
				<div class="flex space-x-4 items-center">
					<div class={cn(baseStyles, animationStyles, 'w-8 h-8 rounded-full')}></div>
					{#each Array(3) as _}
						<div class={cn(baseStyles, animationStyles, 'h-4 flex-1')}></div>
					{/each}
					<div class={cn(baseStyles, animationStyles, 'w-20 h-6 rounded-full')}></div>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class={computedStyles} style={Object.keys(styleObject).length > 0 ? styleObject : undefined}>
		{@render children?.()}
	</div>
{/if}

<style>
	/* Custom animation for skeleton */
	@keyframes skeleton-loading {
		0% {
			background-position: -200px 0;
		}
		100% {
			background-position: calc(200px + 100%) 0;
		}
	}

	/* Alternative shimmer animation */
	.skeleton-shimmer {
		background: linear-gradient(90deg, 
			hsl(var(--muted)) 25%, 
			hsl(var(--muted) / 0.5) 50%, 
			hsl(var(--muted)) 75%);
		background-size: 200px 100%;
		animation: skeleton-loading 1.5s infinite;
	}
</style>