<script lang="ts" module>
	import { tv } from 'tailwind-variants';
	import { cn } from '$lib/utils.js';

	export const bulkSelectCheckboxVariants = tv({
		base: 'flex items-center justify-center rounded border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
		variants: {
			size: {
				sm: 'h-4 w-4',
				default: 'h-5 w-5',
				lg: 'h-6 w-6'
			},
			state: {
				unchecked: 'border-muted-foreground/30 bg-background hover:border-muted-foreground/50',
				checked: 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
				indeterminate: 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
			}
		},
		defaultVariants: {
			size: 'default',
			state: 'unchecked'
		}
	});

	export type BulkSelectState = 'unchecked' | 'checked' | 'indeterminate';
	export type BulkSelectSize = 'sm' | 'default' | 'lg';

	export type BulkSelectCheckboxProps = {
		checked: boolean;
		indeterminate?: boolean;
		size?: BulkSelectSize;
		disabled?: boolean;
		onCheckedChange: (checked: boolean) => void;
		class?: string;
		id?: string;
		'aria-label'?: string;
	};
</script>

<script lang="ts">
	import { Check, Minus } from 'lucide-svelte';

	let {
		checked = false,
		indeterminate = false,
		size = 'default',
		disabled = false,
		onCheckedChange,
		class: className,
		id,
		'aria-label': ariaLabel
	}: BulkSelectCheckboxProps = $props();

	const state = $derived<BulkSelectState>(
		indeterminate ? 'indeterminate' : checked ? 'checked' : 'unchecked'
	);

	function handleClick() {
		if (disabled) return;
		onCheckedChange(!checked);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (disabled) return;
		if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault();
			onCheckedChange(!checked);
		}
	}

	const iconSize = $derived(() => {
		switch (size) {
			case 'sm':
				return 'h-3 w-3';
			case 'lg':
				return 'h-4 w-4';
			default:
				return 'h-3.5 w-3.5';
		}
	});
</script>

<button
	type="button"
	role="checkbox"
	aria-checked={indeterminate ? 'mixed' : checked}
	aria-label={ariaLabel}
	{id}
	{disabled}
	class={cn(
		bulkSelectCheckboxVariants({ size, state }),
		className,
		disabled && 'cursor-not-allowed opacity-50'
	)}
	onclick={handleClick}
	onkeydown={handleKeydown}
>
	{#if state === 'checked'}
		<Check class={iconSize} />
	{:else if state === 'indeterminate'}
		<Minus class={iconSize} />
	{/if}
</button>
