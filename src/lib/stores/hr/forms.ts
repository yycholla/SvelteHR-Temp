import { writable } from 'svelte/store';

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

	const { subscribe, set, update } = writable<FormState<T>>(initialState);

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

	return {
		subscribe,
		updateField: (fieldName: keyof T, value: any) => {
			update(state => {
				const newData = { ...state.data, [fieldName]: value };
				const fieldErrors = validateField(fieldName, value);
				const newErrors = { ...state.errors };
				
				if (fieldErrors.length > 0) {
					newErrors[fieldName as string] = fieldErrors;
				} else {
					delete newErrors[fieldName as string];
				}

				const isValid = Object.keys(newErrors).length === 0;

				return {
					...state,
					data: newData,
					errors: newErrors,
					touched: { ...state.touched, [fieldName]: true },
					isValid,
					isDirty: true
				};
			});
		},
		setData: (newData: Partial<T>) => {
			update(state => {
				const updatedData = { ...state.data, ...newData };
				const errors = validateForm(updatedData);
				const isValid = Object.keys(errors).length === 0;

				return {
					...state,
					data: updatedData,
					errors,
					isValid,
					isDirty: true
				};
			});
		},
		setErrors: (errors: Record<string, string[]>) => {
			update(state => ({
				...state,
				errors,
				isValid: Object.keys(errors).length === 0
			}));
		},
		setSubmitting: (isSubmitting: boolean) => {
			update(state => ({ ...state, isSubmitting }));
		},
		touchField: (fieldName: keyof T) => {
			update(state => ({
				...state,
				touched: { ...state.touched, [fieldName]: true }
			}));
		},
		reset: () => {
			set({ ...initialState, data: { ...initialData } });
		},
		validate: () => {
			let isValid = true;
			update(state => {
				const errors = validateForm(state.data);
				const allTouched: Record<string, boolean> = {};
				
				// Mark all fields as touched during validation
				for (const key in state.data) {
					allTouched[key] = true;
				}

				isValid = Object.keys(errors).length === 0;

				return {
					...state,
					errors,
					touched: allTouched,
					isValid
				};
			});
			return isValid;
		}
	};
}

export { createFormStore };