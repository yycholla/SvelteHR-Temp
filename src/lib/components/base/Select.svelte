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
  let selectedOption: typeof options[0] | null = null;

  // Computed values
  $: filteredOptions = searchable && searchTerm
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  $: selectedOption = options.find(option => option.value === value) || null;

  $: containerClasses = [
    'select-container',
    `select-container--${size}`,
    fullWidth && 'select-container--full-width',
    focused && 'select-container--focused',
    disabled && 'select-container--disabled',
    variant === 'error' && 'select-container--error',
    variant === 'success' && 'select-container--success'
  ].filter(Boolean).join(' ');

  $: selectClasses = [
    'select',
    `select--${size}`,
    `select--${variant}`,
    isOpen && 'select--open'
  ].filter(Boolean).join(' ');

  // Event handlers
  function handleToggle() {
    if (disabled) return;
    isOpen = !isOpen;
    
    if (isOpen && searchable) {
      setTimeout(() => searchInputElement?.focus(), 0);
    }
  }

  function handleOptionClick(option: typeof options[0]) {
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
    if (relatedTarget && (
      dropdownElement?.contains(relatedTarget) ||
      searchInputElement === relatedTarget
    )) {
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
    <label 
      for={id} 
      class="select-label"
      class:select-label--required={required}
    >
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

<style lang="postcss">
  /* Container Styles */
  .select-container {
    @apply flex flex-col relative;
  }

  .select-container--full-width {
    @apply w-full;
  }

  /* Label Styles */
  .select-label {
    @apply block text-sm font-medium text-gray-700 mb-1;
  }

  .select-label--required {
    @apply text-gray-900;
  }

  .select-label__required {
    @apply text-red-500 ml-1;
  }

  /* Wrapper */
  .select-wrapper {
    @apply relative;
  }

  /* Base Select Styles */
  .select {
    @apply relative w-full bg-white border border-gray-300 rounded-md shadow-sm;
    @apply flex items-center justify-between cursor-pointer;
    @apply focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500;
    @apply transition-colors duration-200;
  }

  /* Size Variants */
  .select--sm {
    @apply px-3 py-1.5 text-sm;
  }

  .select--md {
    @apply px-3 py-2 text-sm;
  }

  .select--lg {
    @apply px-4 py-2.5 text-base;
  }

  /* Variant Styles */
  .select--default {
    @apply border-gray-300;
  }

  .select--error {
    @apply border-red-300;
    @apply focus:ring-red-500 focus:border-red-500;
  }

  .select--success {
    @apply border-green-300;
    @apply focus:ring-green-500 focus:border-green-500;
  }

  /* Select Value */
  .select__value {
    @apply flex-1 text-left truncate;
  }

  /* Actions */
  .select__actions {
    @apply flex items-center space-x-1 ml-2;
  }

  .select__clear {
    @apply p-1 text-gray-400 hover:text-gray-600 rounded;
  }

  .select__clear i {
    @apply w-3 h-3;
  }

  .select__arrow {
    @apply text-gray-400 transition-transform duration-200;
  }

  .select__arrow--open {
    @apply transform rotate-180;
  }

  .select__arrow i {
    @apply w-4 h-4;
  }

  /* Dropdown */
  .select__dropdown {
    @apply absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50;
    @apply overflow-hidden;
  }

  /* Search */
  .select__search {
    @apply p-2 border-b border-gray-200;
  }

  .select__search-input {
    @apply w-full px-3 py-2 border border-gray-300 rounded-md text-sm;
    @apply focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500;
  }

  /* Options Container */
  .select__options {
    @apply overflow-y-auto;
  }

  /* Individual Option */
  .select__option {
    @apply w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center justify-between;
    @apply focus:outline-none focus:bg-gray-100;
    @apply transition-colors duration-150;
  }

  .select__option--selected {
    @apply bg-blue-50 text-blue-900;
  }

  .select__option--disabled {
    @apply text-gray-400 cursor-not-allowed;
  }

  .select__option--disabled:hover {
    @apply bg-transparent;
  }

  .select__option-label {
    @apply flex-1 truncate;
  }

  .select__option-check {
    @apply text-blue-600 ml-2;
  }

  .select__option-check i {
    @apply w-4 h-4;
  }

  /* No Options */
  .select__no-options {
    @apply px-3 py-2 text-sm text-gray-500 text-center;
  }

  /* Container State Styles */
  .select-container--disabled .select {
    @apply bg-gray-50 cursor-not-allowed;
  }

  .select-container--disabled .select__value {
    @apply text-gray-500;
  }

  .select-container--disabled .select__arrow {
    @apply text-gray-300;
  }

  .select-container--error .select__value {
    @apply text-red-900;
  }

  .select-container--success .select__value {
    @apply text-green-900;
  }

  /* Helper Text */
  .select-helper-text {
    @apply mt-1 text-sm text-gray-600;
  }

  /* Error Text */
  .select-error-text {
    @apply mt-1 text-sm text-red-600;
  }

  /* Hover States */
  .select:not(:disabled):hover {
    @apply border-gray-400;
  }

  .select--error:not(:disabled):hover {
    @apply border-red-400;
  }

  .select--success:not(:disabled):hover {
    @apply border-green-400;
  }

  /* Open State */
  .select--open {
    @apply ring-1 border-blue-500;
  }

  .select--error.select--open {
    @apply ring-red-500 border-red-500;
  }

  .select--success.select--open {
    @apply ring-green-500 border-green-500;
  }
</style>