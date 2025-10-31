<script lang="ts">
	import { Button } from 'carbon-components-svelte';

	let {
		variant = 'primary',
		size = 'md',
		type = 'button',
		disabled = false,
		loading = false,
		href = null,
		target = null,
		rel = null,
		icon = undefined,
		iconDescription = '',
		tooltipAlignment = 'center',
		tooltipPosition = 'bottom',
		isSelected = false,
		hasIconOnly = false,
		iconOnly = false,
		expressive = false,
		skeleton = false,
		children,
		...restProps
	}: {
		variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success' | 'warning' | 'ghost';
		size?: 'sm' | 'md' | 'lg' | 'xl' | 'field';
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		loading?: boolean;
		href?: string | null;
		target?: string | null;
		rel?: string | null;
		icon?: any;
		iconDescription?: string;
		tooltipAlignment?: 'start' | 'center' | 'end';
		tooltipPosition?: 'top' | 'right' | 'bottom' | 'left';
		isSelected?: boolean;
		hasIconOnly?: boolean;
		iconOnly?: boolean;
		expressive?: boolean;
		skeleton?: boolean;
		children?: import('svelte').Snippet;
		[key: string]: any;
	} = $props();

	// Map custom variants to Carbon variants
	let carbonKind = $derived(mapVariantToKind(variant));
	let carbonSize = $derived(mapSizeToCarbon(size));

	function mapVariantToKind(variant: string): string {
		switch (variant) {
			case 'primary':
				return 'primary';
			case 'secondary':
				return 'secondary';
			case 'tertiary':
				return 'tertiary';
			case 'danger':
				return 'danger';
			case 'success':
				return 'primary'; // Carbon doesn't have success, use primary
			case 'warning':
				return 'secondary'; // Carbon doesn't have warning, use secondary
			case 'ghost':
				return 'ghost';
			default:
				return 'primary';
		}
	}

	function mapSizeToCarbon(size: string): string {
		switch (size) {
			case 'sm':
				return 'sm';
			case 'md':
				return 'md'; // Default Carbon size
			case 'lg':
				return 'lg';
			case 'xl':
				return 'xl';
			case 'field':
				return 'field';
			default:
				return 'md';
		}
	}

	// Handle iconOnly prop for backward compatibility
	let hasIconOnlyComputed = $derived(hasIconOnly || iconOnly);
</script>

<Button
	kind={carbonKind}
	size={carbonSize}
	{type}
	{disabled}
	{href}
	{target}
	{rel}
	{icon}
	{iconDescription}
	{tooltipAlignment}
	{tooltipPosition}
	{isSelected}
	hasIconOnly={hasIconOnlyComputed}
	{expressive}
	{skeleton}
	{...restProps}
>
	{#if loading}
		<span class="carbon-button-loading">
			<div class="carbon-spinner"></div>
		</span>
	{:else}
		{@render children?.()}
	{/if}
</Button>

<style>
	.carbon-button-loading {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.carbon-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
