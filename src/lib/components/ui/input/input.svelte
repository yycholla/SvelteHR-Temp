<script lang="ts">
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { EnhancedInputProps } from '$lib/types/design-system.js';

	type InputType = Exclude<HTMLInputTypeAttribute, 'file'>;

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, 'type'> &
			({ type: 'file'; files?: FileList } | { type?: InputType; files?: undefined }) &
			Omit<EnhancedInputProps, 'className' | 'size' | 'variant'>
	> & {
		variant?: 'default' | 'error' | 'success' | 'warning';
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		error?: string;
		success?: string;
		warning?: string;
		description?: string;
		maxlength?: number;
		showCount?: boolean;
		clearable?: boolean;
		prefix?: string;
		suffix?: string;
	};

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		class: className,
		variant = 'default',
		size = 'md',
		error,
		success,
		warning,
		description,
		maxlength,
		showCount = false,
		clearable = false,
		prefix,
		suffix,
		disabled,
		readonly,
		...restProps
	}: Props = $props();

	// Determine the validation state
	let validationState = $derived(
		error ? 'error' : success ? 'success' : warning ? 'warning' : 'default'
	);

	// Character count logic
	let characterCount = $derived(typeof value === 'string' ? value.length : 0);
	let isOverLimit = $derived(maxlength ? characterCount > maxlength : false);

	// Clear function
	function clearInput() {
		if (typeof value === 'string') {
			value = '';
		}
	}

	// Determine if we need input group wrapper
	let hasGroupElements = $derived(prefix || suffix);
</script>

<div class="space-y-2">
	<!-- Main input wrapper -->
	{#if hasGroupElements}
		<div class="input-group">
			{#if prefix}
				<span class="input-prefix">{prefix}</span>
			{/if}

			{#if type === 'file'}
				<input
					bind:this={ref}
					data-slot="input"
					class={cn(
						'input-base',
						`input-${validationState}`,
						`input-${size}`,
						clearable && 'input-clearable',
						className
					)}
					type="file"
					bind:files
					bind:value
					{disabled}
					{readonly}
					{maxlength}
					aria-invalid={validationState === 'error'}
					aria-describedby={description || error || success || warning
						? `input-description-${Math.random()}`
						: undefined}
					{...restProps}
				/>
			{:else}
				<input
					bind:this={ref}
					data-slot="input"
					class={cn(
						'input-base',
						`input-${validationState}`,
						`input-${size}`,
						clearable && 'input-clearable',
						className
					)}
					{type}
					bind:value
					{disabled}
					{readonly}
					{maxlength}
					aria-invalid={validationState === 'error'}
					aria-describedby={description || error || success || warning
						? `input-description-${Math.random()}`
						: undefined}
					{...restProps}
				/>
			{/if}

			{#if suffix}
				<span class="input-suffix">{suffix}</span>
			{/if}
		</div>
	{:else}
		<div class="relative">
			{#if type === 'file'}
				<input
					bind:this={ref}
					data-slot="input"
					class={cn(
						'input-base',
						`input-${validationState}`,
						`input-${size}`,
						clearable && 'input-clearable',
						className
					)}
					type="file"
					bind:files
					bind:value
					{disabled}
					{readonly}
					{maxlength}
					aria-invalid={validationState === 'error'}
					aria-describedby={description || error || success || warning
						? `input-description-${Math.random()}`
						: undefined}
					{...restProps}
				/>
			{:else}
				<input
					bind:this={ref}
					data-slot="input"
					class={cn(
						'input-base',
						`input-${validationState}`,
						`input-${size}`,
						clearable && 'input-clearable',
						className
					)}
					{type}
					bind:value
					{disabled}
					{readonly}
					{maxlength}
					aria-invalid={validationState === 'error'}
					aria-describedby={description || error || success || warning
						? `input-description-${Math.random()}`
						: undefined}
					{...restProps}
				/>
			{/if}

			<!-- Clear button -->
			{#if clearable && value && !disabled && !readonly}
				<button
					type="button"
					class="input-clear-button"
					onclick={clearInput}
					aria-label="Clear input"
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M18 6L6 18M6 6l12 12"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</button>
			{/if}
		</div>
	{/if}

	<!-- Description and validation messages -->
	{#if description}
		<p class="form-description" id="input-description-{Math.random()}">{description}</p>
	{/if}

	{#if error}
		<p class="form-error" id="input-error-{Math.random()}" role="alert">{error}</p>
	{:else if success}
		<p class="form-success" id="input-success-{Math.random()}">{success}</p>
	{:else if warning}
		<p class="form-warning" id="input-warning-{Math.random()}">{warning}</p>
	{/if}

	<!-- Character counter -->
	{#if showCount && maxlength}
		<div class={cn('input-counter', isOverLimit && 'over-limit')}>
			{characterCount}/{maxlength}
		</div>
	{:else if showCount && typeof value === 'string'}
		<div class="input-counter">
			{characterCount} characters
		</div>
	{/if}
</div>
