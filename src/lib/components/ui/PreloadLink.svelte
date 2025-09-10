<!--
  PreloadLink Component - Svelte 5 Performance Optimization
  
  Smart link component that preloads data on hover for improved performance.
  Uses Svelte 5 runes for reactive state management and modern patterns.
-->
<script lang="ts">
	import { preloadData, preloadCode } from '$app/navigation';
	import { page } from '$app/stores';
	
	// Props using Svelte 5 $props
	interface Props {
		href: string;
		preloadData?: boolean;
		preloadCode?: boolean;
		hoverDelay?: number;
		class?: string;
		children?: import('svelte').Snippet;
		[key: string]: any;
	}
	
	let {
		href,
		preloadData: shouldPreloadData = true,
		preloadCode: shouldPreloadCode = true,
		hoverDelay = 100,
		class: className = '',
		children,
		...restProps
	}: Props = $props();
	
	// State using $state rune
	let isHovered = $state(false);
	let preloadTimer = $state<number | null>(null);
	let hasPreloaded = $state(false);
	
	// Check if this is the current page using $derived
	const isCurrentPage = $derived(() => {
		if (typeof window === 'undefined') return false;
		return $page.url.pathname === href;
	});
	
	// Preload function
	async function performPreload() {
		if (hasPreloaded || isCurrentPage()) return;
		
		try {
			// Preload the route data
			if (shouldPreloadData) {
				await preloadData(href);
			}
			
			// Preload the route code
			if (shouldPreloadCode) {
				await preloadCode(href);
			}
			
			hasPreloaded = true;
			console.log(`Preloaded: ${href}`);
		} catch (error) {
			console.warn(`Failed to preload ${href}:`, error);
		}
	}
	
	// Handle mouse enter with debouncing
	function handleMouseEnter() {
		if (hasPreloaded || isCurrentPage()) return;
		
		isHovered = true;
		
		// Clear any existing timer
		if (preloadTimer) {
			clearTimeout(preloadTimer);
		}
		
		// Set up delayed preload
		preloadTimer = window.setTimeout(() => {
			if (isHovered && !hasPreloaded) {
				performPreload();
			}
		}, hoverDelay);
	}
	
	// Handle mouse leave
	function handleMouseLeave() {
		isHovered = false;
		
		// Clear preload timer if still pending
		if (preloadTimer) {
			clearTimeout(preloadTimer);
			preloadTimer = null;
		}
	}
	
	// Handle focus (for keyboard navigation)
	function handleFocus() {
		if (!hasPreloaded && !isCurrentPage()) {
			performPreload();
		}
	}
	
	// Cleanup timer on component unmount using $effect
	$effect(() => {
		return () => {
			if (preloadTimer) {
				clearTimeout(preloadTimer);
			}
		};
	});
	
	// Link classes with current page indication
	const linkClasses = $derived(() => {
		const base = 'transition-colors duration-200';
		const current = isCurrentPage() 
			? 'text-primary-600 font-medium' 
			: 'text-surface-700 hover:text-primary-600';
		const preloaded = hasPreloaded ? 'cursor-pointer' : '';
		
		return `${base} ${current} ${preloaded} ${className}`.trim();
	});
</script>

<!-- Enhanced link with preloading capabilities -->
<a
	{href}
	class={linkClasses()}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	onfocus={handleFocus}
	data-sveltekit-preload-data={shouldPreloadData ? 'hover' : 'off'}
	data-sveltekit-preload-code={shouldPreloadCode ? 'hover' : 'off'}
	aria-current={isCurrentPage() ? 'page' : undefined}
	{...restProps}
>
	{@render children?.()}
</a>

<!--
Usage Examples:

Basic preload link:
<PreloadLink href="/dashboard">
	Dashboard
</PreloadLink>

Custom hover delay:
<PreloadLink href="/employees" hoverDelay={200}>
	Employee Management
</PreloadLink>

Disable code preloading:
<PreloadLink href="/reports" preloadCode={false}>
	Reports
</PreloadLink>

With custom styling:
<PreloadLink 
	href="/settings" 
	class="font-semibold text-lg"
	hoverDelay={50}
>
	Settings
</PreloadLink>

Data-only preloading:
<PreloadLink 
	href="/analytics" 
	preloadData={true}
	preloadCode={false}
	hoverDelay={150}
>
	Analytics
</PreloadLink>
-->