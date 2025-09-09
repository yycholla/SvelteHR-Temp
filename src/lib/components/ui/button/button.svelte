<script lang="ts" module>
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { type VariantProps, tv } from 'tailwind-variants';
	import type { EnhancedButtonProps } from '$lib/types/design-system.js';

	export const buttonVariants = tv({
		base: 'btn-base',
		variants: {
			variant: {
				default: 'btn-default',
				destructive: 'btn-destructive',
				outline: 'btn-outline',
				secondary: 'btn-secondary',
				ghost: 'btn-ghost',
				link: 'btn-link',
				success: 'btn-success',
				warning: 'btn-warning',
				info: 'btn-info'
			},
			size: {
				xs: 'btn-xs',
				sm: 'btn-sm',
				md: 'btn-md',
				lg: 'btn-lg',
				xl: 'btn-xl',
				icon: 'btn-icon'
			},
			fullWidth: {
				true: 'btn-full-width'
			},
			loading: {
				true: 'btn-loading'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'md',
			fullWidth: false,
			loading: false
		}
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> &
		Omit<EnhancedButtonProps, 'className'> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
			loading?: boolean;
			loadingText?: string;
			fullWidth?: boolean;
			icon?: {
				position?: 'left' | 'right' | 'only';
				component?: any;
			};
			external?: boolean;
		};
</script>

<script lang="ts">
	let {
		class: className,
		variant = 'default',
		size = 'md',
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		disabled,
		loading = false,
		loadingText,
		fullWidth = false,
		icon,
		external = false,
		children,
		...restProps
	}: ButtonProps = $props();

	// Handle loading state
	const isDisabled = disabled || loading;

	// Handle external links
	const linkProps =
		external && href
			? {
					target: '_blank',
					rel: 'noopener noreferrer'
				}
			: {};

	// Component wrapper for dynamic icon rendering
	function renderIcon(IconComponent: any) {
		return IconComponent ? IconComponent : null;
	}
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size, fullWidth, loading }), className)}
		href={isDisabled ? undefined : href}
		aria-disabled={isDisabled}
		role={isDisabled ? 'link' : undefined}
		tabindex={isDisabled ? -1 : undefined}
		{...linkProps}
		{...restProps}
	>
		{#if loading}
			{#if loadingText}
				{loadingText}
			{:else}
				Loading...
			{/if}
		{:else if icon?.position === 'only'}
			{#if icon.component}
				{@const IconComponent = icon.component}
				<IconComponent />
			{/if}
		{:else}
			{#if icon?.position === 'left' && icon.component}
				{@const IconComponent = icon.component}
				<IconComponent />
			{/if}
			{@render children?.()}
			{#if icon?.position === 'right' && icon.component}
				{@const IconComponent = icon.component}
				<IconComponent />
			{/if}
		{/if}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size, fullWidth, loading }), className)}
		{type}
		disabled={isDisabled}
		aria-disabled={isDisabled}
		{...restProps}
	>
		{#if loading}
			{#if loadingText}
				{loadingText}
			{:else}
				Loading...
			{/if}
		{:else if icon?.position === 'only'}
			{#if icon.component}
				{@const IconComponent = icon.component}
				<IconComponent />
			{/if}
		{:else}
			{#if icon?.position === 'left' && icon.component}
				{@const IconComponent = icon.component}
				<IconComponent />
			{/if}
			{@render children?.()}
			{#if icon?.position === 'right' && icon.component}
				{@const IconComponent = icon.component}
				<IconComponent />
			{/if}
		{/if}
	</button>
{/if}
