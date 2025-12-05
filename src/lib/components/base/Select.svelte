<script lang="ts">
	import { onMount } from 'svelte';

	let {
		value = $bindable(null),
		options = [],
		placeholder = 'Select an option...',
		disabled = false,
		required = false,
		name = null,
		id = null,
		size = 'md',
		variant = 'default',
		fullWidth = false,
		label = null,
		helperText = null,
		errorText = null,
		searchable = false,
		clearable = false,
		multiple = false,
		maxHeight = '300px',
		onchange = undefined,
		onfocus = undefined,
		onblur = undefined
	}: {
		value?: string | number | null;
		options?: Array<{ value: string | number; label: string; disabled?: boolean }>;
		placeholder?: string;
		disabled?: boolean;
		required?: boolean;
		name?: string | null;
		id?: string | null;
		size?: 'sm' | 'md' | 'lg';
		variant?: 'default' | 'error' | 'success';
		fullWidth?: boolean;
		label?: string | null;
		helperText?: string | null;
		errorText?: string | null;
		searchable?: boolean;
		clearable?: boolean;
		multiple?: boolean;
		maxHeight?: string;
		onchange?: ((detail: { value: string | number | null; option: any }) => void) | undefined;
		onfocus?: (() => void) | undefined;
		onblur?: (() => void) | undefined;
	} = $props();

	// Internal state
	let isOpen = $state(false);
	let focused = $state(false);
	let searchTerm = $state('');
	let selectElement = $state<HTMLButtonElement>();
	let dropdownElement = $state<HTMLDivElement>();
	let searchInputElement = $state<HTMLInputElement>();

	// Computed values
	const filteredOptions = $derived(
		searchable && searchTerm
			? options.filter((option) => option.label.toLowerCase().includes(searchTerm.toLowerCase()))
			: options
	);

	const selectedOption = $derived(options.find((option) => option.value === value) || null);

	const containerClasses = $derived(
		[
			'select-container',
			`select-container--${size}`,
			fullWidth && 'select-container--full-width',
			focused && 'select-container--focused',
			disabled && 'select-container--disabled',
			variant === 'error' && 'select-container--error',
			variant === 'success' && 'select-container--success'
		]
			.filter(Boolean)
			.join(' ')
	);

	const selectClasses = $derived(
		['select', `select--${size}`, `select--${variant}`, isOpen && 'select--open']
			.filter(Boolean)
			.join(' ')
	);

	// Event handlers
	function handleToggle() {
		if (disabled) return;
		isOpen = !isOpen;

		if (isOpen && searchable) {
			setTimeout(() => searchInputElement?.focus(), 0);
		}
	}

	function handleOptionClick(option: (typeof options)[0]) {
		if (option.disabled) return;

		value = option.value;
		isOpen = false;
		searchTerm = '';

		onchange?.({ value, option });
	}

	function handleClear(event: Event) {
		event.stopPropagation();
		value = null;
		onchange?.({ value: null, option: null });
	}

	function handleSearchInput(event: Event) {
		const target = event.target as HTMLInputElement;
		searchTerm = target.value;
	}

	function handleFocus() {
		focused = true;
		onfocus?.();
	}

	function handleBlur(event: FocusEvent) {
		// Don't blur if focusing on dropdown or search input
		const relatedTarget = event.relatedTarget as Element;
		if (
			relatedTarget &&
			(dropdownElement?.contains(relatedTarget) || searchInputElement === relatedTarget)
		) {
			return;
		}

		focused = false;
		isOpen = false;
		searchTerm = '';
		onblur?.();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (disabled) return;

		switch (event.key) {
			case 'Enter':
			case ' ':
				event.preventDefault();
				handleToggle();
				break;
			case 'Escape':
				isOpen = false;
				searchTerm = '';
				break;
			case 'ArrowDown':
				event.preventDefault();
				if (!isOpen) {
					isOpen = true;
				}
				// TODO: Implement keyboard navigation through options
				break;
			case 'ArrowUp':
				event.preventDefault();
				// TODO: Implement keyboard navigation through options
				break;
		}
	}

	// Close dropdown when clicking outside
	function handleDocumentClick(event: MouseEvent) {
		const target = event.target as Element;
		if (!dropdownElement?.contains(target) && !selectElement?.contains(target)) {
			isOpen = false;
			searchTerm = '';
		}
	}

	onMount(() => {
		document.addEventListener('click', handleDocumentClick);
		return () => {
			document.removeEventListener('click', handleDocumentClick);
		};
	});
</script>

<div class={containerClasses}>
	{#if label}
		<label for={id} class="select-label" class:select-label--required={required}>
			{label}
			{#if required}
				<span class="select-label__required">*</span>
			{/if}
		</label>
	{/if}

	<div class="select-wrapper">
		<button
			bind:this={selectElement}
			type="button"
			{id}
			{disabled}
			class={selectClasses}
			aria-haspopup="listbox"
			aria-expanded={isOpen}
			onclick={handleToggle}
			onfocus={handleFocus}
			onblur={handleBlur}
			onkeydown={handleKeydown}
		>
			<span class="select__value">
				{selectedOption ? selectedOption.label : placeholder}
			</span>

			<span class="select__arrow" class:select__arrow--open={isOpen}>
				<i class="icon-chevron-down"></i>
			</span>
		</button>

		{#if clearable && value !== null}
			<button
				type="button"
				class="select__clear"
				onclick={handleClear}
				aria-label="Clear selection"
				tabindex="-1"
			>
				<i class="icon-x"></i>
			</button>
		{/if}

		{#if isOpen}
			<div
				bind:this={dropdownElement}
				class="select__dropdown"
				style="max-height: {maxHeight}"
				role="listbox"
			>
				{#if searchable}
					<div class="select__search">
						<input
							bind:this={searchInputElement}
							type="text"
							class="select__search-input"
							placeholder="Search options..."
							bind:value={searchTerm}
							oninput={handleSearchInput}
						/>
					</div>
				{/if}

				<div class="select__options">
					{#if filteredOptions.length === 0}
						<div class="select__no-options">
							{searchTerm ? 'No options found' : 'No options available'}
						</div>
					{:else}
						{#each filteredOptions as option (option.value)}
							<button
								type="button"
								class="select__option"
								class:select__option--selected={value === option.value}
								class:select__option--disabled={option.disabled}
								disabled={option.disabled}
								role="option"
								aria-selected={value === option.value}
								onclick={() => handleOptionClick(option)}
							>
								<span class="select__option-label">{option.label}</span>
								{#if value === option.value}
									<span class="select__option-check">
										<i class="icon-check"></i>
									</span>
								{/if}
							</button>
						{/each}
					{/if}
				</div>
			</div>
		{/if}
	</div>

	{#if helperText && !errorText}
		<div class="select-helper-text">
			{helperText}
		</div>
	{/if}

	{#if errorText}
		<div class="select-error-text">
			{errorText}
		</div>
	{/if}
</div>
