<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let type:
		| 'text'
		| 'email'
		| 'password'
		| 'number'
		| 'tel'
		| 'url'
		| 'search'
		| 'date'
		| 'datetime-local'
		| 'time' = 'text';
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
	]
		.filter(Boolean)
		.join(' ');

	$: inputClasses = [
		'input',
		`input--${size}`,
		`input--${variant}`,
		leftIcon && 'input--with-left-icon',
		rightIcon && 'input--with-right-icon'
	]
		.filter(Boolean)
		.join(' ');

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
		<label for={id} class="input-label" class:input-label--required={required}>
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


