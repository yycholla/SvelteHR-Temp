<script lang="ts" module>
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	export interface SelectOption {
		value: any;
		label: string;
		disabled?: boolean;
		description?: string;
		icon?: any;
		group?: string;
	}

	export interface SearchableSelectProps extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
		options: SelectOption[];
		value?: any;
		multiple?: boolean;
		searchable?: boolean;
		clearable?: boolean;
		placeholder?: string;
		searchPlaceholder?: string;
		loading?: boolean;
		loadingText?: string;
		emptyText?: string;
		maxSelected?: number;
		disabled?: boolean;
		size?: 'sm' | 'md' | 'lg';
		variant?: 'default' | 'error' | 'success' | 'warning';
		customRender?: (option: SelectOption) => string;
		onSearch?: (query: string) => Promise<SelectOption[]> | SelectOption[];
		onSelectionChange?: (value: any) => void;
		onOpen?: () => void;
		onClose?: () => void;
	}
</script>

<script lang="ts">
	import { createEventDispatcher, tick } from 'svelte';

	let {
		class: className,
		options = [],
		value = $bindable(undefined),
		multiple = false,
		searchable = true,
		clearable = true,
		placeholder = 'Select option...',
		searchPlaceholder = 'Search options...',
		loading = false,
		loadingText = 'Loading...',
		emptyText = 'No options found',
		maxSelected,
		disabled = false,
		size = 'md',
		variant = 'default',
		customRender,
		onSearch,
		onSelectionChange,
		onOpen,
		onClose,
		ref = $bindable(null),
		...restProps
	}: SearchableSelectProps = $props();

	const dispatch = createEventDispatcher();

	let isOpen = $state(false);
	let searchQuery = $state('');
	let filteredOptions = $state<SelectOption[]>([]);
	let searchInput: HTMLInputElement;
	let dropdownRef: HTMLDivElement;
	let highlightedIndex = $state(0);
	let isSearching = $state(false);

	// Convert single value to array for consistency
	let selectedValues = $derived(
		multiple
			? Array.isArray(value)
				? value
				: value !== undefined
					? [value]
					: []
			: value !== undefined
				? [value]
				: []
	);

	// Filter options based on search query
	$effect(() => {
		if (onSearch && searchQuery) {
			isSearching = true;
			Promise.resolve(onSearch(searchQuery))
				.then((results) => {
					filteredOptions = results;
					isSearching = false;
					highlightedIndex = 0;
				})
				.catch(() => {
					filteredOptions = [];
					isSearching = false;
				});
		} else if (searchQuery && searchable) {
			filteredOptions = options.filter(
				(option) =>
					option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
					option.description?.toLowerCase().includes(searchQuery.toLowerCase())
			);
			highlightedIndex = 0;
		} else {
			filteredOptions = options;
			highlightedIndex = 0;
		}
	});

	// Group options if needed
	let groupedOptions = $derived(
		filteredOptions.reduce(
			(acc, option) => {
				const group = option.group || 'default';
				if (!acc[group]) acc[group] = [];
				acc[group].push(option);
				return acc;
			},
			{} as Record<string, SelectOption[]>
		)
	);

	// Get display text for selected values
	let displayText = $derived(
		(() => {
			if (selectedValues.length === 0) return placeholder;
			if (multiple) {
				if (selectedValues.length === 1) {
					const option = options.find((opt) => opt.value === selectedValues[0]);
					return option?.label || selectedValues[0];
				}
				return `${selectedValues.length} selected`;
			}
			const option = options.find((opt) => opt.value === selectedValues[0]);
			return option?.label || selectedValues[0];
		})()
	);

	// Handle option selection
	function selectOption(option: SelectOption) {
		if (option.disabled) return;

		if (multiple) {
			const newValues = selectedValues.includes(option.value)
				? selectedValues.filter((v) => v !== option.value)
				: [...selectedValues, option.value];

			if (maxSelected && newValues.length > maxSelected) return;

			value = newValues;
		} else {
			value = option.value;
			closeDropdown();
		}

		onSelectionChange?.(value);
		dispatch('change', value);
	}

	// Handle clear selection
	function clearSelection() {
		value = multiple ? [] : undefined;
		onSelectionChange?.(value);
		dispatch('change', value);
	}

	// Open dropdown
	function openDropdown() {
		if (disabled) return;
		isOpen = true;
		searchQuery = '';
		onOpen?.();
		dispatch('open');

		tick().then(() => {
			if (searchable && searchInput) {
				searchInput.focus();
			}
		});
	}

	// Close dropdown
	function closeDropdown() {
		isOpen = false;
		searchQuery = '';
		onClose?.();
		dispatch('close');
	}

	// Handle keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		if (disabled) return;

		switch (event.key) {
			case 'Enter':
				event.preventDefault();
				if (!isOpen) {
					openDropdown();
				} else if (filteredOptions[highlightedIndex]) {
					selectOption(filteredOptions[highlightedIndex]);
				}
				break;
			case 'Escape':
				event.preventDefault();
				closeDropdown();
				break;
			case 'ArrowDown':
				event.preventDefault();
				if (!isOpen) {
					openDropdown();
				} else {
					highlightedIndex = Math.min(highlightedIndex + 1, filteredOptions.length - 1);
				}
				break;
			case 'ArrowUp':
				event.preventDefault();
				if (isOpen) {
					highlightedIndex = Math.max(highlightedIndex - 1, 0);
				}
				break;
			case ' ':
				if (!searchable || !isOpen) {
					event.preventDefault();
					if (!isOpen) {
						openDropdown();
					} else if (filteredOptions[highlightedIndex]) {
						selectOption(filteredOptions[highlightedIndex]);
					}
				}
				break;
		}
	}

	// Handle click outside
	function handleClickOutside(event: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
			closeDropdown();
		}
	}

	// Size classes
	const sizeClasses = {
		sm: 'h-8 px-2 text-sm',
		md: 'h-9 px-3 text-base',
		lg: 'h-10 px-4 text-lg'
	};

	// Variant classes
	const variantClasses = {
		default: 'border-border focus-within:border-primary-500 focus-within:ring-primary-500/50',
		error: 'border-error-500 focus-within:border-error-500 focus-within:ring-error-500/50',
		success: 'border-success-500 focus-within:border-success-500 focus-within:ring-success-500/50',
		warning: 'border-warning-500 focus-within:border-warning-500 focus-within:ring-warning-500/50'
	};
</script>

<svelte:window onclick={handleClickOutside} />

<div bind:this={ref} class={cn('relative w-full', className)} {...restProps}>
	<!-- Trigger -->
	<button
		type="button"
		class={cn(
			'flex w-full items-center justify-between rounded-md border bg-background transition-all',
			'focus:ring-2 focus:ring-offset-2 focus:outline-none',
			'disabled:cursor-not-allowed disabled:opacity-50',
			sizeClasses[size],
			variantClasses[variant],
			isOpen && 'ring-2 ring-offset-2',
			className
		)}
		{disabled}
		onclick={openDropdown}
		onkeydown={handleKeydown}
		aria-haspopup="listbox"
		aria-expanded={isOpen}
		aria-label={placeholder}
	>
		<div class="flex min-w-0 flex-1 items-center">
			{#if multiple && selectedValues.length > 1}
				<div class="flex flex-wrap gap-1">
					{#each selectedValues.slice(0, 3) as selectedValue}
						{@const option = options.find((opt) => opt.value === selectedValue)}
						<span
							class="inline-flex items-center gap-1 rounded bg-secondary-100 px-2 py-0.5 text-xs text-secondary-700"
						>
							{option?.label || selectedValue}
							<button
								type="button"
								class="hover:text-secondary-900"
								aria-label="Remove {option?.label || selectedValue}"
								onclick={(e) => {
									e.stopPropagation();
									selectOption(option || { value: selectedValue, label: selectedValue });
								}}
							>
								<svg
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="3"
								>
									<path d="M18 6L6 18M6 6l12 12" />
								</svg>
							</button>
						</span>
					{/each}
					{#if selectedValues.length > 3}
						<span class="text-xs text-secondary-500">+{selectedValues.length - 3} more</span>
					{/if}
				</div>
			{:else}
				<span class={cn('truncate', selectedValues.length === 0 && 'text-secondary-500')}>
					{displayText}
				</span>
			{/if}
		</div>

		<div class="flex items-center gap-1">
			{#if clearable && selectedValues.length > 0 && !disabled}
				<button
					type="button"
					class="rounded p-1 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600"
					aria-label="Clear selection"
					onclick={(e) => {
						e.stopPropagation();
						clearSelection();
					}}
				>
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="3"
					>
						<path d="M18 6L6 18M6 6l12 12" />
					</svg>
				</button>
			{/if}

			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class={cn('text-secondary-400 transition-transform', isOpen && 'rotate-180')}
			>
				<path d="M6 9l6 6 6-6" />
			</svg>
		</div>
	</button>

	<!-- Dropdown -->
	{#if isOpen}
		<div
			bind:this={dropdownRef}
			class="absolute top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-lg"
			role="listbox"
			aria-multiselectable={multiple}
		>
			{#if searchable}
				<div class="border-b p-2">
					<input
						bind:this={searchInput}
						bind:value={searchQuery}
						type="text"
						placeholder={searchPlaceholder}
						class="w-full rounded border border-border px-3 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:outline-none"
					/>
				</div>
			{/if}

			<div class="max-h-60 overflow-auto p-1">
				{#if loading || isSearching}
					<div class="flex items-center justify-center py-4 text-secondary-500">
						<svg class="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
								fill="none"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						{loadingText}
					</div>
				{:else if filteredOptions.length === 0}
					<div class="py-4 text-center text-sm text-secondary-500">
						{emptyText}
					</div>
				{:else}
					{#each Object.entries(groupedOptions) as [groupName, groupOptions], groupIndex}
						{#if groupName !== 'default'}
							<div class="bg-secondary-50 px-2 py-1 text-xs font-medium text-secondary-600">
								{groupName}
							</div>
						{/if}

						{#each groupOptions as option, optionIndex}
							{@const globalIndex =
								Object.entries(groupedOptions)
									.slice(0, groupIndex)
									.reduce((acc, [, opts]) => acc + opts.length, 0) + optionIndex}
							<button
								type="button"
								class={cn(
									'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm',
									'hover:bg-secondary-100 focus:bg-secondary-100 focus:outline-none',
									'disabled:cursor-not-allowed disabled:opacity-50',
									highlightedIndex === globalIndex && 'bg-secondary-100',
									selectedValues.includes(option.value) && 'bg-primary-50 text-primary-700'
								)}
								disabled={option.disabled}
								onclick={() => selectOption(option)}
							>
								<div class="flex min-w-0 flex-1 items-center gap-2">
									{#if option.icon}
										<svelte:component this={option.icon} class="h-4 w-4 flex-shrink-0" />
									{/if}

									<div class="min-w-0 flex-1">
										<div class="truncate">
											{#if customRender}
												{@html customRender(option)}
											{:else}
												{option.label}
											{/if}
										</div>
										{#if option.description}
											<div class="truncate text-xs text-secondary-500">
												{option.description}
											</div>
										{/if}
									</div>
								</div>

								{#if selectedValues.includes(option.value)}
									<svg
										width="20"
										height="20"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										class="text-primary-600"
									>
										<polyline points="20,6 9,17 4,12"></polyline>
									</svg>
								{/if}
							</button>
						{/each}
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
