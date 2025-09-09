<!--
	Form Component
	
	Advanced form component with validation, error handling, and accessibility
	Integrates with Zod schemas for runtime validation and proper form state management
	
	Usage:
	<Form schema={loginSchema} onSubmit={handleSubmit}>
		{#snippet fields({ form, errors })}
			<Input name="email" bind:value={form.email} error={errors.email} />
			<Input name="password" type="password" bind:value={form.password} error={errors.password} />
			<Button type="submit">Login</Button>
		{/snippet}
	</Form>
-->

<script lang="ts">
	import { cn } from '$lib/utils';
	import type { z } from 'zod';

	// Component props
	interface FormProps<T extends z.ZodType> {
		schema: T;
		initialValues?: Partial<z.infer<T>>;
		onSubmit?: (data: z.infer<T>, event: SubmitEvent) => void | Promise<void>;
		onChange?: (data: Partial<z.infer<T>>) => void;
		validate?: 'onSubmit' | 'onChange' | 'onBlur';
		class?: string;
		novalidate?: boolean;
		autocomplete?: 'on' | 'off';
		id?: string;
		children?: any;
	}

	let {
		schema,
		initialValues = {},
		onSubmit,
		onChange,
		validate = 'onSubmit',
		class: className = '',
		novalidate = true,
		autocomplete = 'off',
		id = '',
		children,
		...restProps
	}: FormProps<any> = $props();

	// Form state management
	let form = $state({ ...initialValues });
	let errors = $state<Record<string, string>>({});
	let touched = $state<Record<string, boolean>>({});
	let isSubmitting = $state(false);
	let isValid = $state(true);

	// Generate unique form ID if not provided
	const formId = id || `form-${Math.random().toString(36).substr(2, 9)}`;

	// Validate form data using Zod schema
	function validateForm(data: any): { success: boolean; errors: Record<string, string> } {
		try {
			schema.parse(data);
			return { success: true, errors: {} };
		} catch (error) {
			if (error instanceof Error && 'issues' in error) {
				const validationErrors: Record<string, string> = {};
				(error as any).issues.forEach((issue: any) => {
					const path = issue.path.join('.');
					validationErrors[path] = issue.message;
				});
				return { success: false, errors: validationErrors };
			}
			return { success: false, errors: { general: 'Validation failed' } };
		}
	}

	// Validate single field
	function validateField(name: string, value: any) {
		try {
			// Create partial schema for single field validation
			const fieldSchema = schema.pick({ [name]: true });
			fieldSchema.parse({ [name]: value });
			
			// Remove error if validation passes
			const newErrors = { ...errors };
			delete newErrors[name];
			errors = newErrors;
		} catch (error) {
			if (error instanceof Error && 'issues' in error) {
				const issue = (error as any).issues[0];
				errors = { ...errors, [name]: issue.message };
			}
		}
	}

	// Handle form submission
	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		
		if (isSubmitting) return;
		
		isSubmitting = true;

		try {
			// Validate entire form
			const validation = validateForm(form);
			errors = validation.errors;
			isValid = validation.success;

			if (validation.success && onSubmit) {
				await onSubmit(form, event);
			}
		} catch (error) {
			console.error('Form submission error:', error);
			errors = { ...errors, general: 'Form submission failed' };
		} finally {
			isSubmitting = false;
		}
	}

	// Handle input changes
	function handleChange(name: string, value: any) {
		form = { ...form, [name]: value };
		
		// Call onChange callback if provided
		onChange?.(form);

		// Validate on change if enabled
		if (validate === 'onChange' && touched[name]) {
			validateField(name, value);
		}
	}

	// Handle input blur
	function handleBlur(name: string, value: any) {
		touched = { ...touched, [name]: true };

		// Validate on blur if enabled
		if (validate === 'onBlur' || validate === 'onChange') {
			validateField(name, value);
		}
	}

	// Helper function to get field error
	function getFieldError(name: string): string {
		return errors[name] || '';
	}

	// Helper function to check if field has error
	function hasFieldError(name: string): boolean {
		return Boolean(errors[name]);
	}

	// Helper function to get field value
	function getFieldValue(name: string): any {
		return form[name];
	}

	// Helper function to set field value
	function setFieldValue(name: string, value: any) {
		handleChange(name, value);
	}

	// Form context for child components
	const formContext = $derived({
		form,
		errors,
		touched,
		isSubmitting,
		isValid,
		getFieldError,
		hasFieldError,
		getFieldValue,
		setFieldValue,
		handleChange,
		handleBlur
	});

	// Form classes
	const formClasses = $derived(cn('space-y-4', className));

	// Clear general error when form changes
	$effect(() => {
		if (form && errors.general) {
			const newErrors = { ...errors };
			delete newErrors.general;
			errors = newErrors;
		}
	});
</script>

<form
	{...restProps}
	id={formId}
	class={formClasses}
	{novalidate}
	{autocomplete}
	onsubmit={handleSubmit}
	aria-invalid={!isValid}
>
	{#if errors.general}
		<div
			class="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md"
			role="alert"
			aria-live="polite"
		>
			{errors.general}
		</div>
	{/if}

	{@render children?.(formContext)}
</form>

<style>
	/* Custom form styles */
	form:invalid {
		outline: none;
	}
	
	/* Focus within form for better accessibility */
	form:focus-within {
		outline: none;
	}

	/* Custom validation styles */
	form[aria-invalid="true"] {
		/* Visual indication that form has errors */
	}
</style>