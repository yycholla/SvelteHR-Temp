<script lang="ts">
	let {
		type = 'text',
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		readonly = false,
		required = false,
		autocomplete = null,
		name = null,
		id = null,
		size = 'md',
		variant = 'default',
		fullWidth = false,
		leftIcon = null,
		rightIcon = null,
		label = null,
		helperText = null,
		errorText = null,
		min = null,
		max = null,
		step = null,
		maxlength = null,
		pattern = null,
		oninput = undefined,
		onchange = undefined,
		onfocus = undefined,
		onblur = undefined,
		onkeydown = undefined,
		onkeyup = undefined
	}: {
		type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'datetime-local' | 'time';
		value?: string | number;
		placeholder?: string;
		disabled?: boolean;
		readonly?: boolean;
		required?: boolean;
		autocomplete?: string | null;
		name?: string | null;
		id?: string | null;
		size?: 'sm' | 'md' | 'lg';
		variant?: 'default' | 'error' | 'success';
		fullWidth?: boolean;
		leftIcon?: string | null;
		rightIcon?: string | null;
		label?: string | null;
		helperText?: string | null;
		errorText?: string | null;
		min?: number | string | null;
		max?: number | string | null;
		step?: number | string | null;
		maxlength?: number | null;
		pattern?: string | null;
		oninput?: ((detail: { value: string | number; event: Event }) => void) | undefined;
		onchange?: ((detail: { value: string | number; event: Event }) => void) | undefined;
		onfocus?: ((detail: { value: string | number; event: FocusEvent }) => void) | undefined;
		onblur?: ((detail: { value: string | number; event: FocusEvent }) => void) | undefined;
		onkeydown?: ((detail: { value: string | number; event: KeyboardEvent }) => void) | undefined;
		onkeyup?: ((detail: { value: string | number; event: KeyboardEvent }) => void) | undefined;
	} = $props();

	// Internal state
	let focused = $state(false);
	let inputElement: HTMLInputElement;

	// Computed classes
	let containerClasses = $derived(
		[
			'input-container',
			`input-container--${size}`,
			fullWidth && 'input-container--full-width',
			focused && 'input-container--focused',
			disabled && 'input-container--disabled',
			variant === 'error' && 'input-container--error',
			variant === 'success' && 'input-container--success'
		]
			.filter(Boolean)
			.join(' ')
	);

	let inputClasses = $derived(
		[
			'input',
			`input--${size}`,
			`input--${variant}`,
			leftIcon && 'input--with-left-icon',
			rightIcon && 'input--with-right-icon'
		]
			.filter(Boolean)
			.join(' ')
	);

	// Event handlers
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		if (type === 'number') {
			value = target.valueAsNumber || 0;
		} else {
			value = target.value;
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
			oninput={handleInput}
			onchange={handleChange}
			onfocus={handleFocus}
			onblur={handleBlur}
			onkeydown={handleKeydown}
			onkeyup={handleKeyup}
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


