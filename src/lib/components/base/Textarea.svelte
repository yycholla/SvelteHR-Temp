<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let value: string = '';
	export let placeholder: string = '';
	export let disabled: boolean = false;
	export let readonly: boolean = false;
	export let required: boolean = false;
	export let name: string | null = null;
	export let id: string | null = null;
	export let rows: number = 4;
	export let cols: number | null = null;
	export let size: 'sm' | 'md' | 'lg' = 'md';
	export let variant: 'default' | 'error' | 'success' = 'default';
	export let fullWidth: boolean = true;
	export let label: string | null = null;
	export let helperText: string | null = null;
	export let errorText: string | null = null;
	export let maxlength: number | null = null;
	export let resize: 'none' | 'both' | 'horizontal' | 'vertical' = 'vertical';
	export let autoResize: boolean = false;
	export let minHeight: string | null = null;
	export let maxHeight: string | null = null;

	// Internal state
	let focused = false;
	let textareaElement: HTMLTextAreaElement;

	// Character count
	$: characterCount = value.length;
	$: isOverLimit = maxlength ? characterCount > maxlength : false;

	// Computed classes
	$: containerClasses = [
		'textarea-container',
		`textarea-container--${size}`,
		fullWidth && 'textarea-container--full-width',
		focused && 'textarea-container--focused',
		disabled && 'textarea-container--disabled',
		variant === 'error' && 'textarea-container--error',
		variant === 'success' && 'textarea-container--success',
		isOverLimit && 'textarea-container--over-limit'
	]
		.filter(Boolean)
		.join(' ');

	$: textareaClasses = [
		'textarea',
		`textarea--${size}`,
		`textarea--${variant}`,
		`textarea--resize-${resize}`,
		autoResize && 'textarea--auto-resize'
	]
		.filter(Boolean)
		.join(' ');

	// Event handlers
	function handleInput(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		value = target.value;

		if (autoResize) {
			autoResizeTextarea(target);
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

	// Auto-resize functionality
	function autoResizeTextarea(element: HTMLTextAreaElement) {
		if (!autoResize) return;

		// Reset height to auto to get the correct scrollHeight
		element.style.height = 'auto';

		// Calculate new height
		let newHeight = element.scrollHeight;

		// Apply min/max height constraints
		if (minHeight) {
			const minHeightPx = parseInt(minHeight);
			newHeight = Math.max(newHeight, minHeightPx);
		}

		if (maxHeight) {
			const maxHeightPx = parseInt(maxHeight);
			newHeight = Math.min(newHeight, maxHeightPx);
		}

		element.style.height = `${newHeight}px`;
	}

	// Public methods
	export function focus() {
		textareaElement?.focus();
	}

	export function blur() {
		textareaElement?.blur();
	}

	export function select() {
		textareaElement?.select();
	}

	// Initialize auto-resize on mount
	$: if (textareaElement && autoResize) {
		autoResizeTextarea(textareaElement);
	}
</script>

<div class={containerClasses}>
	{#if label}
		<label for={id} class="textarea-label" class:textarea-label--required={required}>
			{label}
			{#if required}
				<span class="textarea-label__required">*</span>
			{/if}
		</label>
	{/if}

	<div class="textarea-wrapper">
		<textarea
			bind:this={textareaElement}
			{name}
			{id}
			{placeholder}
			{disabled}
			{readonly}
			{required}
			{rows}
			{cols}
			{maxlength}
			{value}
			class={textareaClasses}
			style:min-height={minHeight}
			style:max-height={maxHeight}
			on:input={handleInput}
			on:change={handleChange}
			on:focus={handleFocus}
			on:blur={handleBlur}
			on:keydown={handleKeydown}
			on:keyup={handleKeyup}
		></textarea>
	</div>

	<div class="textarea-footer">
		{#if helperText && !errorText}
			<div class="textarea-helper-text">
				{helperText}
			</div>
		{/if}

		{#if errorText}
			<div class="textarea-error-text">
				{errorText}
			</div>
		{/if}

		{#if maxlength}
			<div
				class="textarea-character-count"
				class:textarea-character-count--over-limit={isOverLimit}
			>
				{characterCount}{#if maxlength}/{maxlength}{/if}
			</div>
		{/if}
	</div>
</div>


