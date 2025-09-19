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

<style lang="postcss">
	/* Container Styles */
	.textarea-container {
		@apply flex flex-col;
	}

	.textarea-container--full-width {
		@apply w-full;
	}

	/* Label Styles */
	.textarea-label {
		@apply mb-1 block text-sm font-medium text-gray-700;
	}

	.textarea-label--required {
		@apply text-gray-900;
	}

	.textarea-label__required {
		@apply ml-1 text-red-500;
	}

	/* Textarea Wrapper */
	.textarea-wrapper {
		@apply relative;
	}

	/* Base Textarea Styles */
	.textarea {
		@apply block w-full rounded-md border border-gray-300 placeholder-gray-400 shadow-sm;
		@apply focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500;
		@apply transition-colors duration-200;
		@apply font-sans; /* Ensure consistent font family */
	}

	/* Size Variants */
	.textarea--sm {
		@apply px-3 py-1.5 text-sm;
	}

	.textarea--md {
		@apply px-3 py-2 text-sm;
	}

	.textarea--lg {
		@apply px-4 py-2.5 text-base;
	}

	/* Variant Styles */
	.textarea--default {
		@apply border-gray-300;
	}

	.textarea--error {
		@apply border-red-300 text-red-900 placeholder-red-300;
		@apply focus:border-red-500 focus:outline-none focus:ring-red-500;
	}

	.textarea--success {
		@apply border-green-300 text-green-900 placeholder-green-300;
		@apply focus:border-green-500 focus:outline-none focus:ring-green-500;
	}

	/* Resize Options */
	.textarea--resize-none {
		@apply resize-none;
	}

	.textarea--resize-both {
		@apply resize;
	}

	.textarea--resize-horizontal {
		@apply resize-x;
	}

	.textarea--resize-vertical {
		@apply resize-y;
	}

	/* Auto-resize */
	.textarea--auto-resize {
		@apply resize-none overflow-hidden;
	}

	/* Footer */
	.textarea-footer {
		@apply mt-1 flex items-start justify-between;
	}

	/* Helper Text */
	.textarea-helper-text {
		@apply flex-1 text-sm text-gray-600;
	}

	/* Error Text */
	.textarea-error-text {
		@apply flex-1 text-sm text-red-600;
	}

	/* Character Count */
	.textarea-character-count {
		@apply ml-2 flex-shrink-0 text-sm text-gray-500;
	}

	.textarea-character-count--over-limit {
		@apply font-medium text-red-600;
	}

	/* Container State Styles */
	.textarea-container--disabled .textarea {
		@apply cursor-not-allowed bg-gray-50 text-gray-500;
	}

	.textarea-container--disabled .textarea-label {
		@apply text-gray-500;
	}

	.textarea-container--error .textarea-character-count {
		@apply text-red-600;
	}

	.textarea-container--over-limit .textarea {
		@apply border-red-300 text-red-900;
		@apply focus:border-red-500 focus:ring-red-500;
	}

	/* Readonly state */
	.textarea[readonly] {
		@apply cursor-default bg-gray-50;
	}

	/* Hover states */
	.textarea:not(:disabled):not([readonly]):hover {
		@apply border-gray-400;
	}

	.textarea--error:not(:disabled):not([readonly]):hover {
		@apply border-red-400;
	}

	.textarea--success:not(:disabled):not([readonly]):hover {
		@apply border-green-400;
	}

	/* Focus states */
	.textarea:focus {
		@apply border-blue-500 ring-1 ring-blue-500;
	}

	.textarea--error:focus {
		@apply border-red-500 ring-1 ring-red-500;
	}

	.textarea--success:focus {
		@apply border-green-500 ring-1 ring-green-500;
	}

	/* Placeholder color adjustments */
	.textarea::placeholder {
		@apply text-gray-400;
	}

	.textarea--error::placeholder {
		@apply text-red-300;
	}

	.textarea--success::placeholder {
		@apply text-green-300;
	}

	/* Scrollbar styling for webkit browsers */
	.textarea::-webkit-scrollbar {
		@apply w-2;
	}

	.textarea::-webkit-scrollbar-track {
		@apply rounded bg-gray-100;
	}

	.textarea::-webkit-scrollbar-thumb {
		@apply rounded bg-gray-300 hover:bg-gray-400;
	}
</style>
