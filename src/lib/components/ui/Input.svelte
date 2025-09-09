<!--
	Input Component
	
	Reusable input component with multiple types and validation
	Supports text, email, password, number, and other input types
	
	Usage:
	<Input type="email" placeholder="Enter email" bind:value={email} />
	<Input type="password" label="Password" required bind:value={password} />
-->

<script lang="ts">
	import { cn } from '$lib/utils';

	// Component props
	interface InputProps {
		type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'datetime-local' | 'time';
		value?: string | number;
		placeholder?: string;
		label?: string;
		error?: string;
		hint?: string;
		disabled?: boolean;
		required?: boolean;
		readonly?: boolean;
		autocomplete?: string;
		id?: string;
		name?: string;
		class?: string;
		inputClass?: string;
		maxlength?: number;
		minlength?: number;
		min?: number | string;
		max?: number | string;
		step?: number | string;
		pattern?: string;
		size?: 'sm' | 'md' | 'lg';
		variant?: 'default' | 'filled' | 'outline';
		leftIcon?: string;
		rightIcon?: string;
		showPasswordToggle?: boolean;
	}

	let {
		type = 'text',
		value = $bindable(''),
		placeholder = '',
		label = '',
		error = '',
		hint = '',
		disabled = false,
		required = false,
		readonly = false,
		autocomplete = '',
		id = '',
		name = '',
		class: className = '',
		inputClass = '',
		maxlength,
		minlength,
		min,
		max,
		step,
		pattern,
		size = 'md',
		variant = 'default',
		leftIcon = '',
		rightIcon = '',
		showPasswordToggle = false,
		...restProps
	}: InputProps = $props();

	// Generate unique ID if not provided
	const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

	// Password visibility toggle
	let showPassword = $state(false);
	let currentType = $derived(
		type === 'password' && showPasswordToggle ? (showPassword ? 'text' : 'password') : type
	);

	// Base input styles
	const baseStyles = 'flex w-full rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

	// Size styles
	const sizeStyles = {
		sm: 'h-8 px-3 py-1',
		md: 'h-10 px-3 py-2',
		lg: 'h-12 px-4 py-3'
	};

	// Variant styles
	const variantStyles = {
		default: 'border-input',
		filled: 'bg-muted border-transparent',
		outline: 'border-2 border-input'
	};

	// Container classes
	const containerClasses = $derived(cn('space-y-2', className));

	// Label classes
	const labelClasses = $derived(cn(
		'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
		error && 'text-destructive',
		required && "after:content-['*'] after:ml-0.5 after:text-destructive"
	));

	// Input classes
	const inputClasses = $derived(cn(
		baseStyles,
		sizeStyles[size],
		variantStyles[variant],
		error && 'border-destructive focus-visible:ring-destructive',
		leftIcon && 'pl-10',
		(rightIcon || (type === 'password' && showPasswordToggle)) && 'pr-10',
		inputClass
	));

	// Error message classes
	const errorClasses = $derived(cn(
		'text-sm text-destructive',
		error && 'animate-in slide-in-from-left-1 duration-150'
	));

	// Hint classes
	const hintClasses = $derived(cn(
		'text-sm text-muted-foreground'
	));

	// Toggle password visibility
	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}

	// Handle input changes
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		if (type === 'number') {
			value = target.valueAsNumber || 0;
		} else {
			value = target.value;
		}
	}
</script>

<div class={containerClasses}>
	{#if label}
		<label for={inputId} class={labelClasses}>
			{label}
		</label>
	{/if}

	<div class="relative">
		<!-- Left icon -->
		{#if leftIcon}
			<div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<!-- Icon content would be dynamic based on leftIcon prop -->
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={leftIcon}></path>
				</svg>
			</div>
		{/if}

		<!-- Main input -->
		<input
			{...restProps}
			type={currentType}
			id={inputId}
			{name}
			{placeholder}
			{disabled}
			{readonly}
			{required}
			{autocomplete}
			{maxlength}
			{minlength}
			{min}
			{max}
			{step}
			{pattern}
			class={inputClasses}
			bind:value
			oninput={handleInput}
			aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
			aria-invalid={!!error}
		/>

		<!-- Right icon or password toggle -->
		{#if type === 'password' && showPasswordToggle}
			<button
				type="button"
				class="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
				onclick={togglePasswordVisibility}
				aria-label={showPassword ? 'Hide password' : 'Show password'}
			>
				{#if showPassword}
					<!-- Eye slash icon -->
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
					</svg>
				{:else}
					<!-- Eye icon -->
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
					</svg>
				{/if}
			</button>
		{:else if rightIcon}
			<div class="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={rightIcon}></path>
				</svg>
			</div>
		{/if}
	</div>

	<!-- Error message -->
	{#if error}
		<p id="{inputId}-error" class={errorClasses} role="alert">
			{error}
		</p>
	{/if}

	<!-- Hint text -->
	{#if hint && !error}
		<p id="{inputId}-hint" class={hintClasses}>
			{hint}
		</p>
	{/if}
</div>

<style>
	/* Custom focus styles */
	input:focus-visible {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
	}
	
	/* Animation for error messages */
	@keyframes slide-in-from-left-1 {
		0% {
			transform: translateX(-4px);
			opacity: 0;
		}
		100% {
			transform: translateX(0);
			opacity: 1;
		}
	}
	
	.animate-in {
		animation-fill-mode: both;
	}
	
	.slide-in-from-left-1 {
		animation-name: slide-in-from-left-1;
	}
	
	.duration-150 {
		animation-duration: 150ms;
	}
</style>