<script lang="ts" module>
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { type VariantProps, tv } from "tailwind-variants";
	import type { EnhancedCardProps } from "$lib/types/design-system.js";

	export const cardVariants = tv({
		base: "card-base",
		variants: {
			variant: {
				default: "card-default",
				outline: "card-outline",
				ghost: "card-ghost",
				elevated: "card-elevated",
				interactive: "card-interactive",
			},
			padding: {
				none: "card-padding-none",
				sm: "card-padding-sm",
				md: "",  // default padding
				lg: "card-padding-lg",
			},
			loading: {
				true: "card-loading",
			},
			state: {
				default: "",
				error: "card-error",
				selected: "card-selected",
				disabled: "card-disabled",
			},
		},
		defaultVariants: {
			variant: "default",
			padding: "md",
			loading: false,
			state: "default",
		},
	});

	export type CardVariant = VariantProps<typeof cardVariants>["variant"];
	export type CardPadding = VariantProps<typeof cardVariants>["padding"];
	export type CardState = VariantProps<typeof cardVariants>["state"];

	export type CardProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & 
		Omit<EnhancedCardProps, 'className' | 'padding'> & {
			variant?: CardVariant;
			padding?: CardPadding;
			loading?: boolean;
			state?: CardState;
			clickable?: boolean;
			elevated?: boolean;
			href?: string;
			external?: boolean;
			onclick?: (event: MouseEvent) => void;
		};
</script>

<script lang="ts">
	let {
		class: className,
		variant = "default",
		padding = "md",
		loading = false,
		state = "default",
		clickable = false,
		elevated = false,
		href,
		external = false,
		onclick,
		ref = $bindable(null),
		children,
		...restProps
	}: CardProps = $props();
	
	// Determine final variant based on props
	let finalVariant = $derived(elevated ? "elevated" : clickable || href ? "interactive" : variant);
	
	// Handle link props for external links
	let linkProps = $derived(external && href ? {
		target: "_blank",
		rel: "noopener noreferrer"
	} : {});
	
	// Handle click events
	function handleClick(event: MouseEvent) {
		if (state === "disabled") return;
		onclick?.(event);
	}
	
	// Determine if card should be focusable - only when it has interactive behavior
	let isFocusable = $derived((clickable || href || onclick) && state !== "disabled");
	let tabindex = $derived(isFocusable ? 0 : undefined);
	let role = $derived(clickable && !href ? "button" : href ? "link" : undefined);
	
	// Only set tabindex if we also have a role (interactive element)
	let finalTabindex = $derived(role && isFocusable ? 0 : undefined);
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="card"
		class={cn(cardVariants({ variant: finalVariant, padding, loading, state }), className)}
		{href}
		{role}
		{tabindex}
		aria-disabled={state === "disabled"}
		onclick={handleClick}
		{...linkProps}
	>
		{#if loading}
			<!-- Loading state content -->
			<div class="animate-pulse space-y-4">
				<div class="h-4 bg-secondary-200 rounded w-3/4"></div>
				<div class="space-y-2">
					<div class="h-3 bg-secondary-200 rounded"></div>
					<div class="h-3 bg-secondary-200 rounded w-5/6"></div>
				</div>
			</div>
		{:else}
			{@render children?.()}
		{/if}
	</a>
{:else}
	<div
		bind:this={ref}
		data-slot="card"
		class={cn(cardVariants({ variant: finalVariant, padding, loading, state }), className)}
		{role}
		{finalTabindex}
		aria-disabled={state === "disabled"}
		onclick={handleClick}
		{...restProps}
	>
		{#if loading}
			<!-- Loading state content -->
			<div class="animate-pulse space-y-4">
				<div class="h-4 bg-secondary-200 rounded w-3/4 dark:bg-secondary-700"></div>
				<div class="space-y-2">
					<div class="h-3 bg-secondary-200 rounded dark:bg-secondary-700"></div>
					<div class="h-3 bg-secondary-200 rounded w-5/6 dark:bg-secondary-700"></div>
				</div>
			</div>
		{:else}
			{@render children?.()}
		{/if}
	</div>
{/if}