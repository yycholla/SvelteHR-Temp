<script lang="ts" module>
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	export interface CardSkeletonProps extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
		variant?: "default" | "profile" | "list" | "content" | "custom";
		lines?: number;
		showHeader?: boolean;
		showFooter?: boolean;
		showImage?: boolean;
		imageAspect?: "square" | "video" | "wide";
		size?: "sm" | "md" | "lg";
		animated?: boolean;
	}
</script>

<script lang="ts">
	let {
		class: className,
		variant = "default",
		lines = 3,
		showHeader = true,
		showFooter = false,
		showImage = false,
		imageAspect = "square",
		size = "md",
		animated = true,
		ref = $bindable(null),
		...restProps
	}: CardSkeletonProps = $props();
	
	// Generate line widths for more natural skeleton
	let lineWidths = $derived(Array.from({ length: lines }, (_, i) => {
		if (i === lines - 1) return "w-3/4"; // Last line is shorter
		return Math.random() > 0.3 ? "w-full" : "w-5/6"; // Varied widths
	}));
</script>

<div
	bind:this={ref}
	data-slot="card-skeleton"
	class={cn(
		"card-base border border-border",
		size === "sm" && "card-padding-sm",
		size === "lg" && "card-padding-lg",
		className
	)}
	{...restProps}
>
	{#if showImage}
		<div class={cn(
			"skeleton-base mb-4",
			imageAspect === "square" && "aspect-square",
			imageAspect === "video" && "aspect-video", 
			imageAspect === "wide" && "aspect-[16/6]",
			animated && "animate-pulse"
		)}></div>
	{/if}
	
	{#if showHeader}
		<div class="card-header p-6 pb-4">
			<!-- Title skeleton -->
			<div class={cn(
				"skeleton-base h-6 w-3/4 mb-2",
				animated && "animate-pulse"
			)}></div>
			
			<!-- Subtitle skeleton -->
			<div class={cn(
				"skeleton-base h-4 w-1/2",
				animated && "animate-pulse"
			)}></div>
		</div>
	{/if}
	
	<div class={cn(
		"card-content",
		showHeader ? "p-6 pt-0" : "p-6"
	)}>
		{#if variant === "profile"}
			<!-- Profile variant: Avatar + info -->
			<div class="flex items-start space-x-4 mb-4">
				<div class={cn(
					"skeleton-base w-12 h-12 rounded-full flex-shrink-0",
					animated && "animate-pulse"
				)}></div>
				<div class="flex-1 space-y-2">
					<div class={cn(
						"skeleton-base h-4 w-32",
						animated && "animate-pulse"
					)}></div>
					<div class={cn(
						"skeleton-base h-3 w-24",
						animated && "animate-pulse"
					)}></div>
				</div>
			</div>
		{:else if variant === "list"}
			<!-- List variant: Multiple items -->
			{#each Array(3) as _, i}
				<div class="flex items-center space-x-3 mb-3 last:mb-0">
					<div class={cn(
						"skeleton-base w-8 h-8 rounded",
						animated && "animate-pulse"
					)}></div>
					<div class="flex-1 space-y-1">
						<div class={cn(
							"skeleton-base h-3",
							i === 0 ? "w-3/4" : i === 1 ? "w-2/3" : "w-1/2",
							animated && "animate-pulse"
						)}></div>
					</div>
				</div>
			{/each}
		{:else if variant === "content"}
			<!-- Content variant: Text blocks -->
			<div class="space-y-3">
				{#each lineWidths as width}
					<div class={cn(
						"skeleton-base h-4",
						width,
						animated && "animate-pulse"
					)}></div>
				{/each}
			</div>
		{:else}
			<!-- Default variant: Simple lines -->
			<div class="space-y-2">
				{#each lineWidths as width, i}
					<div class={cn(
						"skeleton-base",
						i === 0 ? "h-4" : "h-3",
						width,
						animated && "animate-pulse"
					)}></div>
				{/each}
			</div>
		{/if}
	</div>
	
	{#if showFooter}
		<div class="card-footer p-6 pt-0 flex justify-between items-center">
			<div class={cn(
				"skeleton-base h-8 w-20",
				animated && "animate-pulse"
			)}></div>
			<div class={cn(
				"skeleton-base h-8 w-16",
				animated && "animate-pulse"
			)}></div>
		</div>
	{/if}
</div>

<style>
	/* Custom skeleton animation for more realistic loading */
	@keyframes shimmer {
		0% {
			background-position: -200% 0;
		}
		100% {
			background-position: 200% 0;
		}
	}
	
	.skeleton-base {
		background: linear-gradient(90deg, 
			var(--color-secondary-200) 25%, 
			var(--color-secondary-100) 50%, 
			var(--color-secondary-200) 75%
		);
		background-size: 200% 100%;
	}
	
	:global(.dark) .skeleton-base {
		background: linear-gradient(90deg, 
			var(--color-secondary-700) 25%, 
			var(--color-secondary-600) 50%, 
			var(--color-secondary-700) 75%
		);
		background-size: 200% 100%;
	}
	
	.animate-pulse .skeleton-base {
		animation: shimmer 2s ease-in-out infinite;
	}
</style>