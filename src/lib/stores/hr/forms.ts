// Modernized to use Svelte 5 runes instead of Svelte 4 writable stores

export interface FormState<T = any> {
	data: T;
	errors: Record<string, string[]>;
	touched: Record<string, boolean>;
	isValid: boolean;
	isSubmitting: boolean;
	isDirty: boolean;
}

export interface ValidationRule {
	required?: boolean;
	min?: number;
	max?: number;
	pattern?: RegExp;
	custom?: (value: any) => string | null;
}

export type ValidationSchema<T> = {
	[K in keyof T]?: ValidationRule[];
};

// Form store factory using Svelte 5 runes
function createFormStore<T extends Record<string, any>>(
	initialData: T,
	validationSchema?: ValidationSchema<T>
) {
	const initialState: FormState<T> = {
		data: { ...initialData },
		errors: {},
		touched: {},
		isValid: true,
		isSubmitting: false,
		isDirty: false
	};

	// Create reactive state using Svelte 5 runes
	let formState = $state<FormState<T>>({ ...initialState, data: { ...initialData } });

	function validateField(fieldName: keyof T, value: any): string[] {
		const rules = validationSchema?.[fieldName];
		if (!rules) return [];

		const errors: string[] = [];

		for (const rule of rules) {
			if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
				errors.push('This field is required');
			}

			if (rule.min && typeof value === 'string' && value.length < rule.min) {
				errors.push(`Must be at least ${rule.min} characters`);
			}

			if (rule.max && typeof value === 'string' && value.length > rule.max) {
				errors.push(`Must be no more than ${rule.max} characters`);
			}

			if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
				errors.push('Invalid format');
			}

			if (rule.custom) {
				const customError = rule.custom(value);
				if (customError) {
					errors.push(customError);
				}
			}
		}

		return errors;
	}

	function validateForm(data: T): Record<string, string[]> {
		const allErrors: Record<string, string[]> = {};

		for (const fieldName in validationSchema) {
			const fieldErrors = validateField(fieldName, data[fieldName]);
			if (fieldErrors.length > 0) {
				allErrors[fieldName] = fieldErrors;
			}
		}

		return allErrors;
	}

	// Return reactive interface
	return {
		// Derived values
		get data() {
			return formState.data;
		},
		get errors() {
			return formState.errors;
		},
		get touched() {
			return formState.touched;
		},
		get isValid() {
			return formState.isValid;
		},
		get isSubmitting() {
			return formState.isSubmitting;
		},
		get isDirty() {
			return formState.isDirty;
		},

		// Computed derived values using getters (reactive)
		get hasErrors() {
			return Object.keys(formState.errors).length > 0;
		},
		get touchedFields() {
			return Object.keys(formState.touched);
		},
		get errorCount() {
			return Object.keys(formState.errors).length;
		},

		// Actions
		updateField: (fieldName: keyof T, value: any) => {
			const newData = { ...formState.data, [fieldName]: value };
			const fieldErrors = validateField(fieldName, value);
			const newErrors = { ...formState.errors };

			if (fieldErrors.length > 0) {
				newErrors[fieldName as string] = fieldErrors;
			} else {
				delete newErrors[fieldName as string];
			}

			const isValid = Object.keys(newErrors).length === 0;

			// Direct state mutations
			formState.data = newData;
			formState.errors = newErrors;
			formState.touched = { ...formState.touched, [fieldName]: true };
			formState.isValid = isValid;
			formState.isDirty = true;
		},

		setData: (newData: Partial<T>) => {
			const updatedData = { ...formState.data, ...newData };
			const errors = validateForm(updatedData);
			const isValid = Object.keys(errors).length === 0;

			formState.data = updatedData;
			formState.errors = errors;
			formState.isValid = isValid;
			formState.isDirty = true;
		},

		setErrors: (errors: Record<string, string[]>) => {
			formState.errors = errors;
			formState.isValid = Object.keys(errors).length === 0;
		},

		setSubmitting: (isSubmitting: boolean) => {
			formState.isSubmitting = isSubmitting;
		},

		touchField: (fieldName: keyof T) => {
			formState.touched = { ...formState.touched, [fieldName]: true };
		},

		reset: () => {
			Object.assign(formState, { ...initialState, data: { ...initialData } });
		},

		validate: () => {
			const errors = validateForm(formState.data);
			const allTouched: Record<string, boolean> = {};

			// Mark all fields as touched during validation
			for (const key in formState.data) {
				allTouched[key] = true;
			}

			const isValid = Object.keys(errors).length === 0;

			formState.errors = errors;
			formState.touched = allTouched;
			formState.isValid = isValid;

			return isValid;
		},

		// Utility methods
		getFieldError: (fieldName: keyof T): string[] => {
			return formState.errors[fieldName as string] || [];
		},

		isFieldTouched: (fieldName: keyof T): boolean => {
			return formState.touched[fieldName as string] || false;
		},

		hasFieldError: (fieldName: keyof T): boolean => {
			return (formState.errors[fieldName as string]?.length || 0) > 0;
		}
	};
}

export { createFormStore };
