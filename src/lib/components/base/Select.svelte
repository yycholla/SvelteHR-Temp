<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';

	const dispatch = createEventDispatcher();

	export let value: string | number | null = null;
	export let options: Array<{ value: string | number; label: string; disabled?: boolean }> = [];
	export let placeholder: string = 'Select an option...';
	export let disabled: boolean = false;
	export let required: boolean = false;
	export const name: string | null = null;
	export let id: string | null = null;
	export let size: 'sm' | 'md' | 'lg' = 'md';
	export let variant: 'default' | 'error' | 'success' = 'default';
	export let fullWidth: boolean = false;
	export let label: string | null = null;
	export let helperText: string | null = null;
	export let errorText: string | null = null;
	export let searchable: boolean = false;
	export let clearable: boolean = false;
	export const multiple: boolean = false;
	export let maxHeight: string = '300px';

	// Internal state
	let isOpen = false;
	let focused = false;
	let searchTerm = '';
	let selectElement: HTMLSelectElement;
	let dropdownElement: HTMLDivElement;
	let searchInputElement: HTMLInputElement;
	let selectedOption: (typeof options)[0] | null = null;

	// Computed values
	$: filteredOptions =
		searchable && searchTerm
			? options.filter((option) => option.label.toLowerCase().includes(searchTerm.toLowerCase()))
			: options;

	$: selectedOption = options.find((option) => option.value === value) || null;

	$: containerClasses = [
		'select-container',
		`select-container--${size}`,
		fullWidth && 'select-container--full-width',
		focused && 'select-container--focused',
		disabled && 'select-container--disabled',
		variant === 'error' && 'select-container--error',
		variant === 'success' && 'select-container--success'
	]
		.filter(Boolean)
		.join(' ');

	$: selectClasses = ['select', `select--${size}`, `select--${variant}`, isOpen && 'select--open']
		.filter(Boolean)
		.join(' ');

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

		dispatch('change', { value, option });
	}

	function handleClear(event: Event) {
		event.stopPropagation();
		value = null;
		dispatch('change', { value: null, option: null });
	}

	function handleSearchInput(event: Event) {
		const target = event.target as HTMLInputElement;
		searchTerm = target.value;
	}

	function handleFocus() {
		focused = true;
		dispatch('focus');
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
		dispatch('blur');
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
			on:click={handleToggle}
			on:focus={handleFocus}
			on:blur={handleBlur}
			on:keydown={handleKeydown}
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
				on:click={handleClear}
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
							on:input={handleSearchInput}
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
								on:click={() => handleOptionClick(option)}
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


