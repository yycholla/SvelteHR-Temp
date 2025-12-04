<!--
  TagInput Component
  Multi-select input with autocomplete, similar to email client "To:" field

  Features:
  - Type to search and filter options
  - Click or Enter to select
  - Selected items shown as removable badges
  - Keyboard navigation (Arrow keys, Enter, Backspace)
  - Support for icons and custom rendering
-->

<script lang="ts">
	import { X } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';

	interface Option {
		value: string;
		label: string;
		type?: string;
		icon?: any; // Svelte component or string
	}

	interface Props {
		options: Option[];
		selected?: string[]; // Array of selected values
		placeholder?: string;
		maxSelections?: number;
		disabled?: boolean;
		onSelectedChange?: (selected: string[]) => void;
	}

	let {
		options = [],
		selected = $bindable([]),
		placeholder = 'Type to search...',
		maxSelections,
		disabled = false,
		onSelectedChange
	}: Props = $props();

	// Internal state
	let searchTerm = $state('');
	let isOpen = $state(false);
	let highlightedIndex = $state(0);
	let inputElement = $state<HTMLInputElement>();
	let dropdownElement = $state<HTMLDivElement>();

	// Filtered options based on search and already selected items
	let filteredOptions = $derived(() => {
		const searchLower = searchTerm.toLowerCase();
		return options.filter((opt) => {
			// Exclude already selected items
			if (selected.includes(opt.value)) return false;

			// Filter by search term
			if (!searchTerm) return true;
			return opt.label.toLowerCase().includes(searchLower);
		});
	});

	// Selected option objects for display
	let selectedOptions = $derived(
		selected.map((val) => options.find((opt) => opt.value === val)).filter(Boolean)
	);

	// Check if max selections reached
	let maxReached = $derived(maxSelections && selected.length >= maxSelections);

	// Handle option selection
	function selectOption(option: Option) {
		if (maxReached) return;

		selected = [...selected, option.value];
		searchTerm = '';
		highlightedIndex = 0;
		isOpen = false;

		// Call callback
		onSelectedChange?.(selected);

		// Focus back on input
		inputElement?.focus();
	}

	// Handle removing a selected item
	function removeSelected(value: string) {
		selected = selected.filter((v) => v !== value);
		onSelectedChange?.(selected);
		inputElement?.focus();
	}

	// Handle keyboard navigation
	function handleKeyDown(e: KeyboardEvent) {
		if (disabled) return;

		const filtered = filteredOptions();

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				if (isOpen && filtered.length > 0) {
					highlightedIndex = Math.min(highlightedIndex + 1, filtered.length - 1);
					scrollToHighlighted();
				} else {
					isOpen = true;
				}
				break;

			case 'ArrowUp':
				e.preventDefault();
				if (isOpen && filtered.length > 0) {
					highlightedIndex = Math.max(highlightedIndex - 1, 0);
					scrollToHighlighted();
				}
				break;

			case 'Enter':
				e.preventDefault();
				if (isOpen && filtered.length > 0 && highlightedIndex >= 0) {
					selectOption(filtered[highlightedIndex]);
				}
				break;

			case 'Escape':
				e.preventDefault();
				isOpen = false;
				searchTerm = '';
				break;

			case 'Backspace':
				if (searchTerm === '' && selected.length > 0) {
					// Remove last selected item
					removeSelected(selected[selected.length - 1]);
				}
				break;
		}
	}

	// Scroll highlighted item into view
	function scrollToHighlighted() {
		const items = dropdownElement?.querySelectorAll('[data-option]');
		const highlightedItem = items?.[highlightedIndex];
		if (highlightedItem) {
			highlightedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		}
	}

	// Handle input focus
	function handleFocus() {
		if (!disabled) {
			isOpen = true;
		}
	}

	// Handle input blur (with delay to allow clicking dropdown)
	function handleBlur() {
		setTimeout(() => {
			isOpen = false;
			searchTerm = '';
		}, 200);
	}

	// Handle search input
	function handleInput() {
		isOpen = true;
		highlightedIndex = 0;
	}

	// Click outside handler
	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.tag-input-container')) {
			isOpen = false;
			searchTerm = '';
		}
	}

	// Mount/unmount click outside listener
	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});
</script>

<div class="tag-input-container relative">
	<!-- Input container with selected badges -->
	<div
		class="flex min-h-10 w-full flex-wrap gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 {disabled
			? 'cursor-not-allowed opacity-50'
			: ''}"
		role="button"
		tabindex="0"
		onclick={() => inputElement?.focus()}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				inputElement?.focus();
			}
		}}
	>
		<!-- Selected item badges -->
		{#each selectedOptions as option (option.value)}
			<Badge variant="secondary" class="flex items-center gap-1 pl-2 pr-1">
				{#if option.icon}
					{#if typeof option.icon === 'string'}
						{@html option.icon}
					{:else}
						{@const Icon = option.icon}
						<Icon class="h-3 w-3" />
					{/if}
				{/if}
				<span>{option.label}</span>
				<button
					type="button"
					class="ml-1 rounded-sm hover:bg-secondary-foreground/20"
					onclick={(e) => {
						e.stopPropagation();
						removeSelected(option.value);
					}}
					{disabled}
				>
					<X class="h-3 w-3" />
				</button>
			</Badge>
		{/each}

		<!-- Search input -->
		<input
			bind:this={inputElement}
			bind:value={searchTerm}
			type="text"
			class="flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed min-w-[120px]"
			placeholder={selected.length === 0 ? placeholder : ''}
			disabled={disabled || maxReached}
			onfocus={handleFocus}
			onblur={handleBlur}
			oninput={handleInput}
			onkeydown={handleKeyDown}
		/>

		{#if maxReached}
			<span class="text-xs text-muted-foreground self-center">Max reached</span>
		{/if}
	</div>

	<!-- Dropdown with filtered options -->
	{#if isOpen && filteredOptions().length > 0}
		<div
			bind:this={dropdownElement}
			class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
		>
			{#each filteredOptions() as option, index (option.value)}
				<button
					type="button"
					data-option
					class="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground {index ===
					highlightedIndex
						? 'bg-accent text-accent-foreground'
						: ''}"
					onclick={() => selectOption(option)}
					onmouseenter={() => (highlightedIndex = index)}
				>
					{#if option.icon}
						{#if typeof option.icon === 'string'}
							{@html option.icon}
						{:else}
							{@const Icon = option.icon}
							<Icon class="h-4 w-4" />
						{/if}
					{/if}
					<span class="flex-1 text-left">{option.label}</span>
					{#if option.type}
						<span class="text-xs text-muted-foreground">{option.type}</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Helper text when dropdown is open but no matches -->
	{#if isOpen && searchTerm && filteredOptions().length === 0}
		<div
			class="absolute z-50 mt-1 w-full rounded-md border bg-popover p-4 text-center text-sm text-muted-foreground shadow-md"
		>
			No matches found for "{searchTerm}"
		</div>
	{/if}
</div>

<style>
	/* Custom scrollbar for dropdown */
	.tag-input-container [data-option] {
		scroll-margin: 8px;
	}
</style>
