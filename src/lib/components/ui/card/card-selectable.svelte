<script lang="ts" module>
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { type VariantProps, tv } from "tailwind-variants";
	import type { EnhancedCardProps } from "$lib/types/design-system.js";

	export const selectableCardVariants = tv({
		base: "card-base cursor-pointer transition-all focus-within:outline-none",
		variants: {
			variant: {
				default: "card-default hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700",
				outline: "card-outline hover:shadow-sm hover:border-primary-300 dark:hover:border-primary-600",
				ghost: "card-ghost hover:bg-secondary-50 dark:hover:bg-secondary-800",
				elevated: "card-elevated hover:shadow-lg",
			},
			selected: {
				true: "card-selected border-primary-500 bg-primary-50 shadow-md dark:border-primary-400 dark:bg-primary-950",
				false: "",
			},
			disabled: {
				true: "card-disabled cursor-not-allowed opacity-50",
				false: "",
			},
			size: {
				sm: "card-padding-sm",
				md: "",
				lg: "card-padding-lg",
			}
		},
		defaultVariants: {
			variant: "default",
			selected: false,
			disabled: false,
			size: "md",
		},
	});

	export type SelectableCardProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & 
		Omit<EnhancedCardProps, 'className'> & {
			variant?: "default" | "outline" | "ghost" | "elevated";
			selected?: boolean;
			disabled?: boolean;
			size?: "sm" | "md" | "lg";
			selectionMode?: "checkbox" | "radio" | "button";
			value?: any;
			name?: string;
			onSelectionChange?: (selected: boolean, value?: any) => void;
			href?: string;
			external?: boolean;
		};
</script>

<script lang="ts">
	let {
		class: className,
		variant = "default",
		selected = $bindable(false),
		disabled = false,
		size = "md",
		selectionMode = "checkbox",
		value,
		name,
		onSelectionChange,
		href,
		external = false,
		ref = $bindable(null),
		children,
		onclick,
		onkeydown,
		...restProps
	}: SelectableCardProps = $props();
	
	// Handle link props for external links
	let linkProps = $derived(external && href ? {
		target: "_blank",
		rel: "noopener noreferrer"
	} : {});
	
	// Handle selection change
	function handleSelectionChange() {
		if (disabled) return;
		selected = !selected;
		onSelectionChange?.(selected, value);
	}
	
	// Handle click events
	function handleClick(event: MouseEvent) {
		if (disabled) return;
		
		// If it's a link, don't handle selection
		if (!href) {
			handleSelectionChange();
		}
		
		onclick?.(event);
	}
	
	// Handle keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		if (disabled) return;
		
		if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault();
			if (!href) {
				handleSelectionChange();
			}
		}
		
		onkeydown?.(event);
	}
	
	// Determine ARIA attributes - selectable cards are intentionally interactive
	let role = $derived(href ? "link" : selectionMode === "radio" ? "radio" : selectionMode === "checkbox" ? "checkbox" : "button");
	let ariaChecked = $derived(selectionMode === "checkbox" || selectionMode === "radio" ? selected : undefined);
	let tabIndex = $derived(disabled ? -1 : 0);
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="selectable-card"
		class={cn(selectableCardVariants({ variant, selected, disabled, size }), className)}
		{href}
		{role}
		tabindex={tabIndex}
		aria-disabled={disabled}
		aria-checked={ariaChecked}
		onclick={handleClick}
		onkeydown={handleKeydown}
		{...linkProps}
		{...restProps}
	>
		{#if selectionMode === "checkbox" || selectionMode === "radio"}
			<div class="card-selection-indicator">
				{#if selectionMode === "checkbox"}
					<input
						type="checkbox"
						bind:checked={selected}
						{name}
						{value}
						{disabled}
						tabindex="-1"
						class="sr-only"
						aria-hidden="true"
					/>
				{:else if selectionMode === "radio"}
					<input
						type="radio"
						bind:group={selected}
						{name}
						{value}
						{disabled}
						tabindex="-1"
						class="sr-only"
						aria-hidden="true"
					/>
				{/if}
				<div class={cn(
					"selection-visual",
					selectionMode === "radio" ? "selection-radio" : "selection-checkbox",
					selected && "selected",
					disabled && "disabled"
				)}>
					{#if selected}
						{#if selectionMode === "checkbox"}
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="20,6 9,17 4,12"></polyline>
							</svg>
						{:else}
							<div class="radio-dot"></div>
						{/if}
					{/if}
				</div>
			</div>
		{/if}
		
		{@render children?.()}
	</a>
{:else}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		bind:this={ref}
		data-slot="selectable-card"
		class={cn(selectableCardVariants({ variant, selected, disabled, size }), className)}
		{role}
		tabindex={tabIndex}
		aria-disabled={disabled}
		aria-checked={ariaChecked}
		onclick={handleClick}
		onkeydown={handleKeydown}
		{...restProps}
	>
		{#if selectionMode === "checkbox" || selectionMode === "radio"}
			<div class="card-selection-indicator">
				{#if selectionMode === "checkbox"}
					<input
						type="checkbox"
						bind:checked={selected}
						{name}
						{value}
						{disabled}
						tabindex="-1"
						class="sr-only"
						aria-hidden="true"
					/>
				{:else if selectionMode === "radio"}
					<input
						type="radio"
						bind:group={selected}
						{name}
						{value}
						{disabled}
						tabindex="-1"
						class="sr-only"
						aria-hidden="true"
					/>
				{/if}
				<div class={cn(
					"selection-visual",
					selectionMode === "radio" ? "selection-radio" : "selection-checkbox",
					selected && "selected",
					disabled && "disabled"
				)}>
					{#if selected}
						{#if selectionMode === "checkbox"}
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="20,6 9,17 4,12"></polyline>
							</svg>
						{:else}
							<div class="radio-dot"></div>
						{/if}
					{/if}
				</div>
			</div>
		{/if}
		
		{@render children?.()}
	</div>
{/if}

<style>
	.card-selection-indicator {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: 10;
	}
	
	.selection-visual {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		border-width: 2px;
		border-color: var(--color-secondary-300);
		background-color: white;
		transition-property: all;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		transition-duration: 150ms;
	}
	
	:global(.dark) .selection-visual {
		background-color: var(--color-secondary-900);
		border-color: var(--color-secondary-600);
	}
	
	.selection-checkbox {
		border-radius: 0.25rem;
	}
	
	.selection-radio {
		border-radius: 9999px;
	}
	
	.selection-visual.selected {
		border-color: var(--color-primary-500);
		background-color: var(--color-primary-500);
		color: white;
	}
	
	:global(.dark) .selection-visual.selected {
		border-color: var(--color-primary-400);
		background-color: var(--color-primary-400);
	}
	
	.selection-visual.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.radio-dot {
		width: 0.5rem;
		height: 0.5rem;
		background-color: white;
		border-radius: 9999px;
	}
	
	/* Focus styles */
	[data-slot="selectable-card"]:focus-visible {
		outline: 2px solid transparent;
		outline-offset: 2px;
		box-shadow: 0 0 0 2px var(--color-primary-500);
		box-shadow: 0 0 0 2px var(--color-primary-500), 0 0 0 4px rgba(0, 0, 0, 0.1);
	}
	
	:global(.dark) [data-slot="selectable-card"]:focus-visible {
		box-shadow: 0 0 0 2px var(--color-primary-500), 0 0 0 4px var(--color-secondary-900);
	}
	
	/* Enhanced hover states */
	[data-slot="selectable-card"]:not([aria-disabled="true"]):hover .selection-visual {
		border-color: var(--color-primary-400);
		transform: scale(1.05);
	}
</style>