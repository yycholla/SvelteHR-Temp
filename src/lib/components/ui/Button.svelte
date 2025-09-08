<!--
	Base Button Component
	
	Reusable button component with Tailwind CSS variants
	Supports multiple variants, sizes, states, and accessibility features
	
	Usage:
	<Button variant="primary" size="md" onclick={handleClick}>
		Click me
	</Button>
-->

<script lang="ts">
	import { cn } from '$lib/utils';

	// Component props
	interface ButtonProps {
		variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
		size?: 'sm' | 'md' | 'lg' | 'icon';
		disabled?: boolean;
		loading?: boolean;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		onclick?: (event: MouseEvent) => void;
		children?: any;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		type = 'button',
		class: className = '',
		onclick,
		children,
		...restProps
	}: ButtonProps = $props();

	// Base button styles
	const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

	// Variant styles
	const variantStyles = {
		primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
		secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
		outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
		ghost: 'hover:bg-accent hover:text-accent-foreground',
		destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
		link: 'text-primary underline-offset-4 hover:underline'
	};

	// Size styles
	const sizeStyles = {
		sm: 'h-9 rounded-md px-3',
		md: 'h-10 px-4 py-2',
		lg: 'h-11 rounded-md px-8',
		icon: 'h-10 w-10'
	};

	// Loading spinner SVG
	const loadingSpinnerSVG = `
		<svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
		</svg>
	`;

	// Computed classes
	const computedClasses = $derived(cn(
		baseStyles,
		variantStyles[variant],
		sizeStyles[size],
		loading && 'cursor-wait',
		className
	));

	// Handle click with loading state
	function handleClick(event: MouseEvent) {
		if (disabled || loading) {
			event.preventDefault();
			return;
		}
		onclick?.(event);
	}
</script>

<button 
	{type}
	class={computedClasses}
	disabled={disabled || loading}
	onclick={handleClick}
	aria-busy={loading}
	aria-disabled={disabled || loading}
	{...restProps}
>
	{#if loading}
		<svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
		</svg>
	{/if}
	
	{@render children?.()}
</button>

<style>
	/* Additional custom styles if needed */
	button:focus-visible {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
	}
</style>