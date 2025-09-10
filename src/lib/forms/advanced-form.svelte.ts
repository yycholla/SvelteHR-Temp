/**
 * Advanced Form Management with Svelte 5 Runes
 * 
 * Next-generation form handling system built with Svelte 5 runes.
 * Provides optimized validation, state management, and developer experience
 * with minimal boilerplate and maximum performance.
 */

import { untrack } from 'svelte';
import type { z } from 'zod';
import { createDebouncedDerived, createPerformanceMonitor } from '$lib/utils/reactivity.svelte';

// Performance monitoring for forms
const formMonitor = createPerformanceMonitor('AdvancedForm');

// Form field state interface
interface FieldState<T = any> {
	value: T;
	error: string | null;
	touched: boolean;
	dirty: boolean;
	validating: boolean;
}

// Form validation options
interface ValidationOptions {
	debounceMs?: number;
	validateOnChange?: boolean;
	validateOnBlur?: boolean;
	validateOnSubmit?: boolean;
}

// Form submission result
interface SubmissionResult<T> {
	success: boolean;
	data?: T;
	errors?: Record<string, string>;
	message?: string;
}

/**
 * Advanced form manager with optimized Svelte 5 runes
 */
export function createAdvancedForm<TSchema extends z.ZodType>(
	schema: TSchema,
	options: {
		initialValues?: Partial<z.infer<TSchema>>;
		validation?: ValidationOptions;
		onSubmit?: (data: z.infer<TSchema>) => Promise<SubmissionResult<z.infer<TSchema>>> | SubmissionResult<z.infer<TSchema>>;
		onValidationError?: (errors: Record<string, string>) => void;
		onFieldChange?: (field: string, value: any) => void;
	} = {}
) {
	type FormData = z.infer<TSchema>;
	
	const {
		initialValues = {},
		validation = {},
		onSubmit,
		onValidationError,
		onFieldChange
	} = options;

	const {
		debounceMs = 300,
		validateOnChange = true,
		validateOnBlur = true,
		validateOnSubmit = true
	} = validation;

	// Core form state
	let formData = $state<Record<string, any>>({ ...initialValues });
	let fieldStates = $state<Record<string, FieldState>>({});
	let isSubmitting = $state<boolean>(false);
	let submitCount = $state<number>(0);
	let lastSubmissionResult = $state<SubmissionResult<FormData> | null>(null);

	// Initialize field states for known fields
	$effect(() => {
		for (const key of Object.keys(formData)) {
			if (!fieldStates[key]) {
				fieldStates[key] = {
					value: formData[key],
					error: null,
					touched: false,
					dirty: false,
					validating: false
				};
			}
		}
	});

	// Debounced validation for performance
	const debouncedValidation = createDebouncedDerived(() => {
		return formMonitor.monitor(() => validateForm(formData));
	}, debounceMs);

	// Computed form-level states
	const isValid = $derived(() => {
		const validation = debouncedValidation();
		return validation.success;
	});

	const errors = $derived(() => {
		const validation = debouncedValidation();
		return validation.errors || {};
	});

	const touchedFields = $derived(() =>
		Object.keys(fieldStates).filter(key => fieldStates[key]?.touched)
	);

	const dirtyFields = $derived(() =>
		Object.keys(fieldStates).filter(key => fieldStates[key]?.dirty)
	);

	const hasErrors = $derived(() => Object.keys(errors()).length > 0);
	const hasChanges = $derived(() => dirtyFields().length > 0);
	const canSubmit = $derived(() => !isSubmitting && isValid() && hasChanges());

	// Form validation function
	function validateForm(data: Record<string, any>) {
		try {
			const parsedData = schema.parse(data);
			return { success: true, data: parsedData, errors: {} };
		} catch (error) {
			if (error instanceof z.ZodError) {
				const errors: Record<string, string> = {};
				error.issues.forEach(issue => {
					const path = issue.path.join('.');
					errors[path] = issue.message;
				});
				return { success: false, errors };
			}
			return { success: false, errors: { _form: 'Validation failed' } };
		}
	}

	// Field-level validation
	function validateField(fieldName: string, value: any) {
		const fieldSchema = schema.pick({ [fieldName]: true } as any);
		try {
			fieldSchema.parse({ [fieldName]: value });
			return null;
		} catch (error) {
			if (error instanceof z.ZodError) {
				const issue = error.issues.find(i => i.path.join('.') === fieldName);
				return issue?.message || 'Invalid value';
			}
			return 'Validation error';
		}
	}

	// Field management functions
	function getField(name: string): FieldState {
		if (!fieldStates[name]) {
			fieldStates[name] = {
				value: formData[name],
				error: null,
				touched: false,
				dirty: false,
				validating: false
			};
		}
		return fieldStates[name];
	}

	function setFieldValue(name: string, value: any) {
		// Update form data
		formData[name] = value;

		// Update field state
		const field = getField(name);
		const hasChanged = field.value !== value;
		
		fieldStates[name] = {
			...field,
			value,
			dirty: hasChanged || field.dirty,
			error: validateOnChange ? validateField(name, value) : field.error
		};

		// Call field change callback
		onFieldChange?.(name, value);
	}

	function setFieldTouched(name: string, touched: boolean = true) {
		const field = getField(name);
		fieldStates[name] = {
			...field,
			touched,
			error: touched && validateOnBlur ? validateField(name, field.value) : field.error
		};
	}

	function setFieldError(name: string, error: string | null) {
		const field = getField(name);
		fieldStates[name] = { ...field, error };
	}

	function clearFieldError(name: string) {
		setFieldError(name, null);
	}

	// Form-level operations
	function resetForm(newValues: Partial<FormData> = {}) {
		formData = { ...initialValues, ...newValues };
		fieldStates = {};
		lastSubmissionResult = null;
	}

	function setFormData(data: Partial<FormData>) {
		for (const [key, value] of Object.entries(data)) {
			setFieldValue(key, value);
		}
	}

	function clearErrors() {
		for (const key of Object.keys(fieldStates)) {
			clearFieldError(key);
		}
	}

	// Advanced field operations
	function touchAllFields() {
		for (const key of Object.keys(fieldStates)) {
			setFieldTouched(key, true);
		}
	}

	function validateAllFields() {
		for (const [key, value] of Object.entries(formData)) {
			const error = validateField(key, value);
			setFieldError(key, error);
		}
	}

	// Submission handling
	async function handleSubmit(event?: Event) {
		event?.preventDefault();
		
		if (isSubmitting) return;
		
		isSubmitting = true;
		submitCount++;

		try {
			// Touch all fields to show validation errors
			touchAllFields();

			// Validate entire form
			if (validateOnSubmit) {
				validateAllFields();
				
				if (!isValid()) {
					const currentErrors = errors();
					onValidationError?.(currentErrors);
					lastSubmissionResult = {
						success: false,
						errors: currentErrors,
						message: 'Please fix validation errors'
					};
					return lastSubmissionResult;
				}
			}

			// Call submission handler
			if (onSubmit) {
				const result = await onSubmit(formData as FormData);
				lastSubmissionResult = result;

				if (result.success) {
					// Reset dirty states on successful submission
					for (const key of Object.keys(fieldStates)) {
						fieldStates[key] = { ...fieldStates[key], dirty: false };
					}
				} else if (result.errors) {
					// Set field errors from submission result
					for (const [key, error] of Object.entries(result.errors)) {
						setFieldError(key, error);
					}
				}

				return result;
			}

			return { success: true };
		} catch (error) {
			const result = {
				success: false,
				message: error instanceof Error ? error.message : 'Submission failed'
			};
			lastSubmissionResult = result;
			return result;
		} finally {
			isSubmitting = false;
		}
	}

	// Field binding helpers
	function createFieldBinding(name: string) {
		return {
			get value() {
				return getField(name).value;
			},
			set value(newValue: any) {
				setFieldValue(name, newValue);
			}
		};
	}

	function createFieldProps(name: string) {
		const field = getField(name);
		
		return $derived(() => ({
			value: field.value,
			error: field.error,
			touched: field.touched,
			dirty: field.dirty,
			validating: field.validating,
			onChange: (value: any) => setFieldValue(name, value),
			onBlur: () => setFieldTouched(name, true),
			onFocus: () => {
				// Clear error on focus for better UX
				if (field.error) {
					clearFieldError(name);
				}
			}
		}));
	}

	// Array field helpers
	function createArrayField<T>(name: string, defaultItem: T) {
		return {
			get items() {
				const value = formData[name] || [];
				return Array.isArray(value) ? value : [];
			},
			
			push(item: T = defaultItem) {
				const currentItems = this.items;
				setFieldValue(name, [...currentItems, item]);
			},
			
			remove(index: number) {
				const currentItems = this.items;
				if (index >= 0 && index < currentItems.length) {
					setFieldValue(name, currentItems.filter((_, i) => i !== index));
				}
			},
			
			move(fromIndex: number, toIndex: number) {
				const currentItems = this.items;
				if (fromIndex >= 0 && fromIndex < currentItems.length &&
					toIndex >= 0 && toIndex < currentItems.length) {
					const newItems = [...currentItems];
					const [movedItem] = newItems.splice(fromIndex, 1);
					newItems.splice(toIndex, 0, movedItem);
					setFieldValue(name, newItems);
				}
			},
			
			update(index: number, updater: (item: T) => T) {
				const currentItems = this.items;
				if (index >= 0 && index < currentItems.length) {
					const newItems = [...currentItems];
					newItems[index] = updater(newItems[index]);
					setFieldValue(name, newItems);
				}
			}
		};
	}

	// Return form API
	return {
		// State accessors
		get data() { return formData as FormData; },
		get fields() { return fieldStates; },
		get isSubmitting() { return isSubmitting; },
		get isValid() { return isValid(); },
		get errors() { return errors(); },
		get hasErrors() { return hasErrors(); },
		get hasChanges() { return hasChanges(); },
		get canSubmit() { return canSubmit(); },
		get submitCount() { return submitCount; },
		get lastResult() { return lastSubmissionResult; },
		get touchedFields() { return touchedFields(); },
		get dirtyFields() { return dirtyFields(); },

		// Field operations
		getField,
		setFieldValue,
		setFieldTouched,
		setFieldError,
		clearFieldError,
		createFieldBinding,
		createFieldProps,
		createArrayField,

		// Form operations
		handleSubmit,
		resetForm,
		setFormData,
		clearErrors,
		touchAllFields,
		validateAllFields,

		// Validation
		validateForm: () => validateForm(formData),
		validateField,

		// Development helpers
		getDebugInfo: () => ({
			data: formData,
			fields: fieldStates,
			validation: debouncedValidation(),
			performance: formMonitor.getStats()
		})
	};
}