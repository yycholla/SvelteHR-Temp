<script lang="ts">
	import { cn } from '$lib/utils.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import { onMount } from 'svelte';

	let {
		checked = $bindable(false),
		indeterminate = $bindable(false),
		disabled = false,
		class: className,
		onCheckedChange,
		...restProps
	}: {
		checked?: boolean;
		indeterminate?: boolean;
		disabled?: boolean;
		class?: string;
		onCheckedChange?: (value: boolean | 'indeterminate') => void;
		[key: string]: any;
	} = $props();

	let inputElement: HTMLInputElement;

	onMount(() => {
		if (inputElement && indeterminate) {
			inputElement.indeterminate = indeterminate;
		}
	});

	$effect(() => {
		if (inputElement && indeterminate !== undefined) {
			inputElement.indeterminate = indeterminate;
		}
	});

	function handleChange(e: Event) {
		const target = e.target as HTMLInputElement;
		checked = target.checked;
		if (onCheckedChange) {
			onCheckedChange(target.checked);
		}
	}
</script>

<div class="flex items-center justify-center">
	<div class="relative">
		<input
			bind:this={inputElement}
			type="checkbox"
			{checked}
			{disabled}
			onchange={handleChange}
			class={cn(
				'peer h-4 w-4 shrink-0 rounded border border-input shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
				'appearance-none bg-background checked:border-primary checked:bg-primary checked:text-primary-foreground',
				className
			)}
			{...restProps}
		/>
		<div class="pointer-events-none absolute inset-0 flex items-center justify-center text-current">
			{#if checked}
				<CheckIcon class="h-3.5 w-3.5" />
			{:else if indeterminate}
				<MinusIcon class="h-3.5 w-3.5" />
			{/if}
		</div>
	</div>
</div>
