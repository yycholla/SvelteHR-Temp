<script lang="ts" module>
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { type VariantProps, tv } from "tailwind-variants";
	import type { ButtonVariant, ButtonSize } from "./button.svelte";

	export const buttonGroupVariants = tv({
		base: "inline-flex focus-within:relative",
		variants: {
			orientation: {
				horizontal: "flex-row",
				vertical: "flex-col",
			},
			attached: {
				true: "[&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none [&>*:not(:first-child):not(:last-child)]:rounded-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:first-child)]:ml-[-1px]",
				false: "gap-2",
			},
			size: {
				xs: "[&>*]:btn-xs",
				sm: "[&>*]:btn-sm", 
				md: "[&>*]:btn-md",
				lg: "[&>*]:btn-lg",
				xl: "[&>*]:btn-xl",
			},
			variant: {
				default: "[&>*]:btn-default",
				destructive: "[&>*]:btn-destructive",
				outline: "[&>*]:btn-outline",
				secondary: "[&>*]:btn-secondary",
				ghost: "[&>*]:btn-ghost",
				link: "[&>*]:btn-link",
				success: "[&>*]:btn-success",
				warning: "[&>*]:btn-warning",
				info: "[&>*]:btn-info",
			},
			fullWidth: {
				true: "w-full [&>*]:flex-1",
			},
			disabled: {
				true: "[&>*]:disabled:opacity-50 [&>*]:disabled:cursor-not-allowed",
			},
		},
		compoundVariants: [
			{
				orientation: "vertical",
				attached: true,
				class: "[&>*:first-child]:rounded-b-none [&>*:last-child]:rounded-t-none [&>*:not(:first-child):not(:last-child)]:rounded-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:first-child)]:border-l [&>*:not(:first-child)]:mt-[-1px] [&>*:not(:first-child)]:ml-0",
			},
			{
				attached: true,
				class: "[&>*:focus]:relative [&>*:focus]:z-10",
			},
		],
		defaultVariants: {
			orientation: "horizontal",
			attached: true,
			size: "md",
			fullWidth: false,
			disabled: false,
		},
	});

	export type ButtonGroupOrientation = VariantProps<typeof buttonGroupVariants>["orientation"];
	export type ButtonGroupSize = VariantProps<typeof buttonGroupVariants>["size"];
	export type ButtonGroupVariant = VariantProps<typeof buttonGroupVariants>["variant"];

	export type ButtonGroupProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		orientation?: ButtonGroupOrientation;
		attached?: boolean;
		size?: ButtonGroupSize;
		variant?: ButtonGroupVariant;
		fullWidth?: boolean;
		disabled?: boolean;
		exclusive?: boolean;
		value?: any;
		onValueChange?: (value: any) => void;
		ariaLabel?: string;
		ariaLabelledBy?: string;
	};
</script>

<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	let {
		class: className,
		orientation = "horizontal",
		attached = true,
		size = "md",
		variant,
		fullWidth = false,
		disabled = false,
		exclusive = false,
		value = $bindable(undefined),
		onValueChange,
		ariaLabel,
		ariaLabelledBy,
		ref = $bindable(null),
		children,
		...restProps
	}: ButtonGroupProps = $props();

	const dispatch = createEventDispatcher();

	// Handle keyboard navigation within the group
	function handleKeydown(event: KeyboardEvent) {
		if (disabled) return;

		const buttons = ref?.querySelectorAll('button:not([disabled])') as NodeListOf<HTMLButtonElement>;
		if (!buttons?.length) return;

		const currentIndex = Array.from(buttons).findIndex(btn => btn === document.activeElement);
		let nextIndex = currentIndex;

		switch (event.key) {
			case 'ArrowRight':
			case 'ArrowDown':
				event.preventDefault();
				nextIndex = orientation === 'horizontal' 
					? (currentIndex + 1) % buttons.length
					: Math.min(currentIndex + 1, buttons.length - 1);
				break;
			case 'ArrowLeft':
			case 'ArrowUp':
				event.preventDefault();
				nextIndex = orientation === 'horizontal'
					? (currentIndex - 1 + buttons.length) % buttons.length
					: Math.max(currentIndex - 1, 0);
				break;
			case 'Home':
				event.preventDefault();
				nextIndex = 0;
				break;
			case 'End':
				event.preventDefault();
				nextIndex = buttons.length - 1;
				break;
			default:
				return;
		}

		if (nextIndex !== currentIndex && buttons[nextIndex]) {
			buttons[nextIndex].focus();
		}
	}

	// Handle button click for exclusive selection
	function handleButtonClick(event: Event, buttonValue?: any) {
		if (disabled || !exclusive) return;

		const newValue = buttonValue;
		if (value !== newValue) {
			value = newValue;
			onValueChange?.(newValue);
			dispatch('change', newValue);
		}
	}

	// Determine ARIA attributes
	let role = $derived(exclusive ? 'radiogroup' : 'group');
	let ariaOrientation = $derived(orientation);
</script>

<div
	bind:this={ref}
	data-slot="button-group"
	class={cn(buttonGroupVariants({ orientation, attached, size, variant, fullWidth, disabled }), className)}
	{role}
	aria-orientation={ariaOrientation}
	aria-label={ariaLabel}
	aria-labelledby={ariaLabelledBy}
	onkeydown={handleKeydown}
	{...restProps}
>
	{@render children?.({ handleButtonClick, exclusive, value, disabled, size, variant })}
</div>