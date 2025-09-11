<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'datetime-local' | 'time' = 'text';
  export let value: string | number = '';
  export let placeholder: string = '';
  export let disabled: boolean = false;
  export let readonly: boolean = false;
  export let required: boolean = false;
  export let autocomplete: string | null = null;
  export let name: string | null = null;
  export let id: string | null = null;
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let variant: 'default' | 'error' | 'success' = 'default';
  export let fullWidth: boolean = false;
  export let leftIcon: string | null = null;
  export let rightIcon: string | null = null;
  export let label: string | null = null;
  export let helperText: string | null = null;
  export let errorText: string | null = null;
  export let min: number | string | null = null;
  export let max: number | string | null = null;
  export let step: number | string | null = null;
  export let maxlength: number | null = null;
  export let pattern: string | null = null;

  // Internal state
  let focused = false;
  let inputElement: HTMLInputElement;

  // Computed classes
  $: containerClasses = [
    'input-container',
    `input-container--${size}`,
    fullWidth && 'input-container--full-width',
    focused && 'input-container--focused',
    disabled && 'input-container--disabled',
    variant === 'error' && 'input-container--error',
    variant === 'success' && 'input-container--success'
  ].filter(Boolean).join(' ');

  $: inputClasses = [
    'input',
    `input--${size}`,
    `input--${variant}`,
    leftIcon && 'input--with-left-icon',
    rightIcon && 'input--with-right-icon'
  ].filter(Boolean).join(' ');

  // Event handlers
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    if (type === 'number') {
      value = target.valueAsNumber || 0;
    } else {
      value = target.value;
    }
    dispatch('input', { value, event });
  }

  function handleChange(event: Event) {
    dispatch('change', { value, event });
  }

  function handleFocus(event: FocusEvent) {
    focused = true;
    dispatch('focus', { value, event });
  }

  function handleBlur(event: FocusEvent) {
    focused = false;
    dispatch('blur', { value, event });
  }

  function handleKeydown(event: KeyboardEvent) {
    dispatch('keydown', { value, event });
  }

  function handleKeyup(event: KeyboardEvent) {
    dispatch('keyup', { value, event });
  }

  // Public methods
  export function focus() {
    inputElement?.focus();
  }

  export function blur() {
    inputElement?.blur();
  }

  export function select() {
    inputElement?.select();
  }
</script>

<div class={containerClasses}>
  {#if label}
    <label 
      for={id} 
      class="input-label"
      class:input-label--required={required}
    >
      {label}
      {#if required}
        <span class="input-label__required">*</span>
      {/if}
    </label>
  {/if}

  <div class="input-wrapper">
    {#if leftIcon}
      <div class="input-icon input-icon--left">
        <i class="icon-{leftIcon}"></i>
      </div>
    {/if}

    <input
      bind:this={inputElement}
      {type}
      {name}
      {id}
      {placeholder}
      {disabled}
      {readonly}
      {required}
      {autocomplete}
      {min}
      {max}
      {step}
      {maxlength}
      {pattern}
      value={type === 'number' ? value : value.toString()}
      class={inputClasses}
      on:input={handleInput}
      on:change={handleChange}
      on:focus={handleFocus}
      on:blur={handleBlur}
      on:keydown={handleKeydown}
      on:keyup={handleKeyup}
    />

    {#if rightIcon}
      <div class="input-icon input-icon--right">
        <i class="icon-{rightIcon}"></i>
      </div>
    {/if}
  </div>

  {#if helperText && !errorText}
    <div class="input-helper-text">
      {helperText}
    </div>
  {/if}

  {#if errorText}
    <div class="input-error-text">
      {errorText}
    </div>
  {/if}
</div>

<style lang="postcss">
  /* Container Styles */
  .input-container {
    @apply flex flex-col;
  }

  .input-container--full-width {
    @apply w-full;
  }

  /* Label Styles */
  .input-label {
    @apply block text-sm font-medium text-gray-700 mb-1;
  }

  .input-label--required {
    @apply text-gray-900;
  }

  .input-label__required {
    @apply text-red-500 ml-1;
  }

  /* Input Wrapper */
  .input-wrapper {
    @apply relative;
  }

  /* Base Input Styles */
  .input {
    @apply block w-full border border-gray-300 rounded-md shadow-sm placeholder-gray-400;
    @apply focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500;
    @apply transition-colors duration-200;
  }

  /* Size Variants */
  .input--sm {
    @apply px-3 py-1.5 text-sm;
  }

  .input--md {
    @apply px-3 py-2 text-sm;
  }

  .input--lg {
    @apply px-4 py-2.5 text-base;
  }

  /* Variant Styles */
  .input--default {
    @apply border-gray-300;
  }

  .input--error {
    @apply border-red-300 text-red-900 placeholder-red-300;
    @apply focus:outline-none focus:ring-red-500 focus:border-red-500;
  }

  .input--success {
    @apply border-green-300 text-green-900 placeholder-green-300;
    @apply focus:outline-none focus:ring-green-500 focus:border-green-500;
  }

  /* Icon Adjustments */
  .input--with-left-icon {
    @apply pl-10;
  }

  .input--with-right-icon {
    @apply pr-10;
  }

  .input--sm.input--with-left-icon {
    @apply pl-8;
  }

  .input--sm.input--with-right-icon {
    @apply pr-8;
  }

  .input--lg.input--with-left-icon {
    @apply pl-12;
  }

  .input--lg.input--with-right-icon {
    @apply pr-12;
  }

  /* Icon Styles */
  .input-icon {
    @apply absolute inset-y-0 flex items-center pointer-events-none;
  }

  .input-icon--left {
    @apply left-0 pl-3;
  }

  .input-icon--right {
    @apply right-0 pr-3;
  }

  .input-icon i {
    @apply w-5 h-5 text-gray-400;
  }

  /* Container state adjustments */
  .input-container--focused .input-icon i {
    @apply text-blue-500;
  }

  .input-container--error .input-icon i {
    @apply text-red-500;
  }

  .input-container--success .input-icon i {
    @apply text-green-500;
  }

  /* Disabled State */
  .input-container--disabled .input {
    @apply bg-gray-50 text-gray-500 cursor-not-allowed;
  }

  .input-container--disabled .input-label {
    @apply text-gray-500;
  }

  .input-container--disabled .input-icon i {
    @apply text-gray-300;
  }

  /* Helper Text */
  .input-helper-text {
    @apply mt-1 text-sm text-gray-600;
  }

  /* Error Text */
  .input-error-text {
    @apply mt-1 text-sm text-red-600;
  }

  /* Special input types */
  .input[type="search"] {
    @apply appearance-none;
  }

  .input[type="number"] {
    @apply appearance-none;
  }

  .input[type="date"],
  .input[type="datetime-local"],
  .input[type="time"] {
    @apply appearance-none;
  }

  /* Readonly state */
  .input[readonly] {
    @apply bg-gray-50 cursor-default;
  }

  /* Hover states */
  .input:not(:disabled):not([readonly]):hover {
    @apply border-gray-400;
  }

  .input--error:not(:disabled):not([readonly]):hover {
    @apply border-red-400;
  }

  .input--success:not(:disabled):not([readonly]):hover {
    @apply border-green-400;
  }

  /* Focus states */
  .input:focus {
    @apply ring-1 ring-blue-500 border-blue-500;
  }

  .input--error:focus {
    @apply ring-1 ring-red-500 border-red-500;
  }

  .input--success:focus {
    @apply ring-1 ring-green-500 border-green-500;
  }

  /* Placeholder color adjustments */
  .input::placeholder {
    @apply text-gray-400;
  }

  .input--error::placeholder {
    @apply text-red-300;
  }

  .input--success::placeholder {
    @apply text-green-300;
  }
</style>