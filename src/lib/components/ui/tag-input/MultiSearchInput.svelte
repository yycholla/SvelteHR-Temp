<!--
  MultiSearchInput Component
  Free-form multi-term search with tag display and autocomplete suggestions

  Features:
  - Type search terms and press Enter, comma, or space to add
  - Autocomplete suggestions from provided options
  - Selected terms shown as removable badges
  - Keyboard navigation (Arrow keys, Enter, Backspace)
  - Debounced search callback
-->

<script lang="ts">
	import { X } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';

	interface SearchOption {
		value: string;
		label: string;
	}

	interface Props {
		searchTerms?: string[];
		options?: SearchOption[]; // Suggestions for autocomplete
		placeholder?: string;
		disabled?: boolean;
		onSearchChange?: (terms: string[]) => void;
		debounceMs?: number;
		allowCustomTerms?: boolean; // Allow adding terms not in options
	}

	let {
		searchTerms = $bindable([]),
		options = [],
		placeholder = 'Search... (Enter, comma, or space to seperate)',
		disabled = false,
		onSearchChange,
		debounceMs = 500,
		allowCustomTerms = true
	}: Props = $props();

	// Dynamic placeholder based on whether options are available
	const dynamicPlaceholder = $derived(
		searchTerms.length === 0
			? options.length > 0
				? 'Search... (Enter/comma/space to add)'
				: placeholder
			: ''
	);

	// Internal state
	let inputValue = $state('');
	let inputElement = $state<HTMLInputElement>();
	let dropdownElement = $state<HTMLDivElement>();
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let isOpen = $state(false);
	let highlightedIndex = $state(0);

	// Filtered options based on input and already selected
	const filteredOptions = $derived.by(() => {
		if (!inputValue || !options.length) return [];

		const searchLower = inputValue.toLowerCase();
		return options.filter((opt) => {
			// Exclude already selected items
			if (searchTerms.includes(opt.value)) return false;

			// Filter by search term
			return opt.label.toLowerCase().includes(searchLower);
		});
	});

	// Map selected values to labels for display
	const displayLabels = $derived.by(() => {
		return searchTerms.map((value) => {
			const option = options.find((opt) => opt.value === value);
			return option ? option.label : value; // Fallback to value if not found
		});
	});

	// Add a search term
	function addTerm(term: string) {
		const trimmed = term.trim();
		if (!trimmed || searchTerms.includes(trimmed)) return;

		searchTerms = [...searchTerms, trimmed];
		inputValue = '';
		isOpen = false;
		highlightedIndex = 0;

		// Trigger debounced callback
		triggerSearchChange();
	}

	// Select an option from dropdown
	function selectOption(option: SearchOption) {
		addTerm(option.value);
		inputElement?.focus();
	}

	// Remove a search term
	function removeTerm(term: string) {
		searchTerms = searchTerms.filter((t) => t !== term);
		inputElement?.focus();

		// Trigger debounced callback
		triggerSearchChange();
	}

	// Scroll highlighted item into view
	function scrollToHighlighted() {
		const items = dropdownElement?.querySelectorAll('[data-option]');
		const highlightedItem = items?.[highlightedIndex];
		if (highlightedItem) {
			highlightedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		}
	}

	// Debounced search change callback
	function triggerSearchChange() {
		if (!onSearchChange) return;

		// Clear existing timer
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		// Set new timer
		debounceTimer = setTimeout(() => {
			onSearchChange(searchTerms);
		}, debounceMs);
	}

	// Handle keyboard input
	function handleKeyDown(e: KeyboardEvent) {
		if (disabled) return;

		const filtered = filteredOptions;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				if (isOpen && filtered.length > 0) {
					highlightedIndex = Math.min(highlightedIndex + 1, filtered.length - 1);
					scrollToHighlighted();
				} else if (filtered.length > 0) {
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
					// Select highlighted option
					selectOption(filtered[highlightedIndex]);
				} else if (allowCustomTerms && inputValue.trim()) {
					// Add custom term
					addTerm(inputValue);
				}
				break;

			case ',':
				e.preventDefault();
				if (inputValue.trim()) {
					addTerm(inputValue);
				}
				break;

			case ' ':
				// Add on space only if there's content and dropdown is closed
				if (inputValue.trim() && !isOpen) {
					e.preventDefault();
					addTerm(inputValue);
				}
				break;

			case 'Backspace':
				if (inputValue === '' && searchTerms.length > 0) {
					// Remove last term
					removeTerm(searchTerms[searchTerms.length - 1]);
				}
				break;

			case 'Escape':
				e.preventDefault();
				isOpen = false;
				inputValue = '';
				break;
		}
	}

	// Handle input changes
	function handleInput() {
		if (filteredOptions.length > 0) {
			isOpen = true;
			highlightedIndex = 0;
		} else {
			isOpen = false;
		}
	}

	// Handle focus
	function handleFocus() {
		if (!disabled && filteredOptions.length > 0) {
			isOpen = true;
		}
	}

	// Handle input blur (with delay to allow clicking dropdown)
	function handleBlur() {
		setTimeout(() => {
			isOpen = false;
			// Optionally add current input as custom term on blur
			// if (allowCustomTerms && inputValue.trim()) {
			// 	addTerm(inputValue);
			// }
		}, 200);
	}

	// Click outside handler
	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.multi-search-input-container')) {
			isOpen = false;
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

<div class="multi-search-input-container relative">
	<!-- Input container with search term badges -->
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
		<!-- Search term badges -->
		{#each searchTerms as term, index (term)}
			<Badge variant="secondary" class="flex items-center gap-1 pr-1 pl-2">
				<span>{displayLabels[index]}</span>
				<button
					type="button"
					class="ml-1 rounded-sm hover:bg-secondary-foreground/20"
					onclick={(e) => {
						e.stopPropagation();
						removeTerm(term);
					}}
					{disabled}
					aria-label="Remove search term"
				>
					<X class="h-3 w-3" />
				</button>
			</Badge>
		{/each}

		<!-- Search input -->
		<input
			bind:this={inputElement}
			bind:value={inputValue}
			type="text"
			class="min-w-[120px] flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
			placeholder={dynamicPlaceholder}
			{disabled}
			onfocus={handleFocus}
			onblur={handleBlur}
			oninput={handleInput}
			onkeydown={handleKeyDown}
		/>
	</div>

	<!-- Dropdown with filtered options -->
	{#if isOpen && filteredOptions.length > 0}
		<div
			bind:this={dropdownElement}
			class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
		>
			{#each filteredOptions as option, index (option.value)}
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
					<span class="flex-1 text-left">{option.label}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* Custom scrollbar for dropdown */
	.multi-search-input-container [data-option] {
		scroll-margin: 8px;
	}
</style>
