<script lang="ts">
	let {
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		readonly = false,
		required = false,
		name = null,
		id = null,
		rows = 4,
		cols = null,
		size = 'md',
		variant = 'default',
		fullWidth = true,
		label = null,
		helperText = null,
		errorText = null,
		maxlength = null,
		resize = 'vertical',
		autoResize = false,
		minHeight = null,
		maxHeight = null,
		oninput = undefined,
		onchange = undefined,
		onfocus = undefined,
		onblur = undefined,
		onkeydown = undefined,
		onkeyup = undefined
	}: {
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		readonly?: boolean;
		required?: boolean;
		name?: string | null;
		id?: string | null;
		rows?: number;
		cols?: number | null;
		size?: 'sm' | 'md' | 'lg';
		variant?: 'default' | 'error' | 'success';
		fullWidth?: boolean;
		label?: string | null;
		helperText?: string | null;
		errorText?: string | null;
		maxlength?: number | null;
		resize?: 'none' | 'both' | 'horizontal' | 'vertical';
		autoResize?: boolean;
		minHeight?: string | null;
		maxHeight?: string | null;
		oninput?: ((detail: { value: string; event: Event }) => void) | undefined;
		onchange?: ((detail: { value: string; event: Event }) => void) | undefined;
		onfocus?: ((detail: { value: string; event: FocusEvent }) => void) | undefined;
		onblur?: ((detail: { value: string; event: FocusEvent }) => void) | undefined;
		onkeydown?: ((detail: { value: string; event: KeyboardEvent }) => void) | undefined;
		onkeyup?: ((detail: { value: string; event: KeyboardEvent }) => void) | undefined;
	} = $props();

	// Internal state
	let focused = $state(false);
	let textareaElement: HTMLTextAreaElement;

	// Character count
	let characterCount = $derived(value.length);
	let isOverLimit = $derived(maxlength ? characterCount > maxlength : false);

	// Computed classes
	let containerClasses = $derived(
		[
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
			.join(' ')
	);

	let textareaClasses = $derived(
		[
			'textarea',
			`textarea--${size}`,
			`textarea--${variant}`,
			`textarea--resize-${resize}`,
			autoResize && 'textarea--auto-resize'
		]
			.filter(Boolean)
			.join(' ')
	);

	// Event handlers
	function handleInput(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		value = target.value;

		if (autoResize) {
			autoResizeTextarea(target);
		}

		oninput?.({ value, event });
	}

	function handleChange(event: Event) {
		onchange?.({ value, event });
	}

	function handleFocus(event: FocusEvent) {
		focused = true;
		onfocus?.({ value, event });
	}

	function handleBlur(event: FocusEvent) {
		focused = false;
		onblur?.({ value, event });
	}

	function handleKeydown(event: KeyboardEvent) {
		onkeydown?.({ value, event });
	}

	function handleKeyup(event: KeyboardEvent) {
		onkeyup?.({ value, event });
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
	$effect(() => {
		if (textareaElement && autoResize) {
			autoResizeTextarea(textareaElement);
		}
	});
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
			oninput={handleInput}
			onchange={handleChange}
			onfocus={handleFocus}
			onblur={handleBlur}
			onkeydown={handleKeydown}
			onkeyup={handleKeyup}
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


