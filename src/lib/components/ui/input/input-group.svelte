<script lang="ts" module>
	import type { HTMLInputAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { EnhancedInputProps } from "$lib/types/design-system.js";

	export interface InputGroupProps extends WithElementRef<Omit<HTMLInputAttributes, 'disabled' | 'size' | 'id' | 'loading' | 'placeholder'>>, Omit<EnhancedInputProps, 'className'> {
		prefix?: string;
		suffix?: string;
		prefixIcon?: any;
		suffixIcon?: any;
		error?: string;
		success?: string;
		warning?: string;
		description?: string;
		label?: string;
		required?: boolean;
		characterLimit?: number;
		showCharacterCount?: boolean;
		clearable?: boolean;
		loading?: boolean;
		variant?: "default" | "error" | "success" | "warning";
		size?: "xs" | "sm" | "md" | "lg" | "xl";
	}
</script>

<script lang="ts">
	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		prefix,
		suffix,
		prefixIcon,
		suffixIcon,
		error,
		success,
		warning,
		description,
		label,
		required = false,
		characterLimit,
		showCharacterCount = false,
		clearable = false,
		loading = false,
		variant = "default",
		size = "md",
		disabled,
		readonly,
		placeholder,
		id,
		...restProps
	}: InputGroupProps = $props();

	// Determine validation state
	let validationState = $derived(error ? "error" : success ? "success" : warning ? "warning" : "default");
	
	// Character count logic
	let characterCount = $derived(typeof value === "string" ? value.length : 0);
	let isOverLimit = $derived(characterLimit ? characterCount > characterLimit : false);
	let showCount = $derived(showCharacterCount || characterLimit);
	
	// Clear function
	function clearInput() {
		if (typeof value === "string") {
			value = "";
		}
		ref?.focus();
	}
	
	// Determine if we need group wrapper
	let hasGroupElements = $derived(prefix || suffix || prefixIcon || suffixIcon);
	
	// Generate unique ID
	let inputId = $derived(id || `input-${Math.random().toString(36).substr(2, 9)}`);
	let descriptionId = $derived(`${inputId}-description`);
	let errorId = $derived(`${inputId}-error`);
	let successId = $derived(`${inputId}-success`);
	let warningId = $derived(`${inputId}-warning`);
	
	// ARIA described by
	let ariaDescribedBy = $derived([
		description ? descriptionId : null,
		error ? errorId : null,
		success ? successId : null,
		warning ? warningId : null
	].filter(Boolean).join(' ') || undefined);
</script>

<div class="form-group">
	<!-- Label -->
	{#if label}
		<label 
			for={inputId} 
			class={cn("form-label", required && "required")}
		>
			{label}
		</label>
	{/if}
	
	<!-- Input Group -->
	{#if hasGroupElements}
		<div class={cn("input-group", `input-group-${size}`)}>
			<!-- Prefix Icon -->
			{#if prefixIcon}
				<div class="input-addon input-prefix-icon">
					{#if prefixIcon}
						{@const PrefixIconComponent = prefixIcon}
						<PrefixIconComponent />
					{/if}
				</div>
			{/if}
			
			<!-- Prefix Text -->
			{#if prefix}
				<span class="input-addon input-prefix">{prefix}</span>
			{/if}
			
			<!-- Input Field -->
			<div class="relative flex-1">
				<input
					bind:this={ref}
					bind:value
					{id}
					data-slot="input"
					class={cn(
						"input-base",
						`input-${validationState}`,
						`input-${size}`,
						clearable && value && "input-clearable",
						loading && "input-loading",
						className
					)}
					{disabled}
					{readonly}
					{placeholder}
					maxlength={characterLimit}
					aria-invalid={validationState === "error"}
					aria-describedby={ariaDescribedBy}
					aria-required={required}
					{...restProps}
				/>
				
				<!-- Loading Spinner -->
				{#if loading}
					<div class="input-spinner">
						<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
					</div>
				{/if}
				
				<!-- Clear Button -->
				{#if clearable && value && !disabled && !readonly && !loading}
					<button
						type="button"
						class="input-clear-button"
						onclick={clearInput}
						aria-label="Clear input"
						tabindex="-1"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</button>
				{/if}
			</div>
			
			<!-- Suffix Text -->
			{#if suffix}
				<span class="input-addon input-suffix">{suffix}</span>
			{/if}
			
			<!-- Suffix Icon -->
			{#if suffixIcon}
				<div class="input-addon input-suffix-icon">
					{#if suffixIcon}
						{@const SuffixIconComponent = suffixIcon}
						<SuffixIconComponent />
					{/if}
				</div>
			{/if}
		</div>
	{:else}
		<div class="relative">
			<input
				bind:this={ref}
				bind:value
				id={inputId}
				data-slot="input"
				class={cn(
					"input-base",
					`input-${validationState}`,
					`input-${size}`,
					clearable && value && "input-clearable",
					loading && "input-loading",
					className
				)}
				{disabled}
				{readonly}
				{placeholder}
				maxlength={characterLimit}
				aria-invalid={validationState === "error"}
				aria-describedby={ariaDescribedBy}
				aria-required={required}
				{...restProps}
			/>
			
			<!-- Loading Spinner -->
			{#if loading}
				<div class="input-spinner">
					<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
				</div>
			{/if}
			
			<!-- Clear Button -->
			{#if clearable && value && !disabled && !readonly && !loading}
				<button
					type="button"
					class="input-clear-button"
					onclick={clearInput}
					aria-label="Clear input"
					tabindex="-1"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
			{/if}
		</div>
	{/if}
	
	<!-- Description -->
	{#if description}
		<p class="form-description" id={descriptionId}>{description}</p>
	{/if}
	
	<!-- Validation Messages -->
	{#if error}
		<p class="form-error" id={errorId} role="alert">{error}</p>
	{:else if success}
		<p class="form-success" id={successId}>{success}</p>
	{:else if warning}
		<p class="form-warning" id={warningId}>{warning}</p>
	{/if}
	
	<!-- Character Counter -->
	{#if showCount}
		<div class={cn(
			"input-counter",
			isOverLimit && "over-limit"
		)}>
			{#if characterLimit}
				<span class={isOverLimit ? "text-error-500" : ""}>{characterCount}</span>/{characterLimit}
			{:else}
				{characterCount} characters
			{/if}
		</div>
	{/if}
</div>

<style>
	.input-group {
		position: relative;
		display: flex;
		width: 100%;
	}
	
	.input-group-xs { font-size: 0.75rem; line-height: 1rem; }
	.input-group-sm { font-size: 0.875rem; line-height: 1.25rem; }
	.input-group-md { font-size: 1rem; line-height: 1.5rem; }
	.input-group-lg { font-size: 1.125rem; line-height: 1.75rem; }
	.input-group-xl { font-size: 1.25rem; line-height: 1.75rem; }
	
	.input-addon {
		display: flex;
		align-items: center;
		justify-content: center;
		border-width: 1px;
		border-color: var(--color-border);
		background-color: var(--color-secondary-50);
		color: var(--color-secondary-600);
	}
	
	:global(.dark) .input-addon {
		background-color: var(--color-secondary-800);
		color: var(--color-secondary-300);
		border-color: var(--color-border);
	}
	
	.input-prefix {
		padding-left: 0.75rem;
		padding-right: 0.75rem;
		border-top-left-radius: 0.375rem;
		border-bottom-left-radius: 0.375rem;
		border-right-width: 0;
	}
	
	.input-suffix {
		padding-left: 0.75rem;
		padding-right: 0.75rem;
		border-top-right-radius: 0.375rem;
		border-bottom-right-radius: 0.375rem;
		border-left-width: 0;
	}
	
	.input-prefix-icon {
		padding-left: 0.625rem;
		padding-right: 0.625rem;
		border-top-left-radius: 0.375rem;
		border-bottom-left-radius: 0.375rem;
		border-right-width: 0;
	}
	
	.input-suffix-icon {
		padding-left: 0.625rem;
		padding-right: 0.625rem;
		border-top-right-radius: 0.375rem;
		border-bottom-right-radius: 0.375rem;
		border-left-width: 0;
	}
	
	.input-group .input-base {
		flex: 1 1 0%;
		border-radius: 0;
		border-left-width: 0;
		border-right-width: 0;
	}
	
	.input-group .input-base:first-child {
		border-top-left-radius: 0.375rem;
		border-bottom-left-radius: 0.375rem;
		border-left-width: 1px;
	}
	
	.input-group .input-base:last-child {
		border-top-right-radius: 0.375rem;
		border-bottom-right-radius: 0.375rem;
		border-right-width: 1px;
	}
	
	.input-group .input-base:only-child {
		border-radius: 0.375rem;
		border-width: 1px;
	}
	
	.input-spinner {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-secondary-400);
	}
	
	.input-loading {
		padding-right: 2.5rem;
	}
	
	.input-loading.input-clearable {
		padding-right: 4rem;
	}
</style>