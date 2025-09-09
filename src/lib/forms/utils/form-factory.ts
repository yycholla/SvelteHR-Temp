import { superForm } from 'sveltekit-superforms';
import { zodClient } from 'sveltekit-superforms/adapters';
import type { z } from 'zod';
import type { FormOptions, SuperValidated } from 'sveltekit-superforms';
import { createFormSchema } from '$lib/forms/builders/schema-builder';
import type { FormSchema, ApiResponse } from '$lib/forms/types';

export interface FormFactoryOptions {
	onSubmit?: (data: any) => Promise<ApiResponse<any>>;
	onSuccess?: (result: any) => void;
	onError?: (error: string | Error) => void;
	resetOnSuccess?: boolean;
	invalidateAll?: boolean;
	multipleSubmits?: 'prevent' | 'allow' | 'abort';
	clearOnSubmit?: 'errors' | 'message' | 'errors-and-message' | 'all' | 'none';
	autoFocusOnError?: boolean;
	scrollToError?: boolean;
	SPA?: boolean;
}

/**
 * Creates a superForm instance from a FormSchema
 */
export function createDynamicForm<T extends Record<string, any>>(
	formSchema: FormSchema,
	initialData?: Partial<T>,
	options: FormFactoryOptions = {}
) {
	// Convert FormSchema to Zod schema
	const zodSchema = createFormSchema(formSchema);

	// Prepare initial data with defaults
	const defaultData = createDefaultData(formSchema, initialData);

	// Create superForm with dynamic schema
	const form = superForm(defaultData, {
		SPA: options.SPA ?? true,
		validators: zodClient(zodSchema),
		resetForm: options.resetOnSuccess ?? false,
		invalidateAll: options.invalidateAll ?? false,
		multipleSubmits: options.multipleSubmits ?? 'prevent',
		clearOnSubmit: options.clearOnSubmit ?? 'errors-and-message',
		autoFocusOnError: options.autoFocusOnError ?? true,
		scrollToError: options.scrollToError ?? true,
		onSubmit: async ({ formData, cancel }) => {
			if (options.onSubmit) {
				try {
					const formDataObj = Object.fromEntries(formData);
					const result = await options.onSubmit(formDataObj);

					if (!result.success) {
						cancel();
						if (options.onError) {
							options.onError(result.error || 'Submission failed');
						}
						return;
					}

					if (options.onSuccess) {
						options.onSuccess(result.data);
					}
				} catch (error) {
					cancel();
					if (options.onError) {
						options.onError(error instanceof Error ? error : String(error));
					}
				}
			}
		},
		onError: ({ result }) => {
			if (options.onError) {
				const errorMessage = result.error?.message || 'An error occurred';
				options.onError(errorMessage);
			}
		}
	});

	return {
		...form,
		schema: zodSchema,
		formSchema
	};
}

/**
 * Creates a superForm instance from server-validated data
 */
export function createServerForm<T extends Record<string, any>>(
	validatedData: SuperValidated<T>,
	zodSchema: z.ZodSchema<T>,
	options: FormFactoryOptions = {}
) {
	return superForm(validatedData, {
		SPA: false,
		validators: zodClient(zodSchema),
		resetForm: options.resetOnSuccess ?? false,
		invalidateAll: options.invalidateAll ?? true,
		multipleSubmits: options.multipleSubmits ?? 'prevent',
		clearOnSubmit: options.clearOnSubmit ?? 'errors-and-message',
		autoFocusOnError: options.autoFocusOnError ?? true,
		scrollToError: options.scrollToError ?? true,
		onResult: ({ result, update }) => {
			if (result.type === 'success' && options.onSuccess) {
				options.onSuccess(result.data);
			} else if (result.type === 'failure' && options.onError) {
				options.onError(result.data?.message || 'Submission failed');
			}
			update();
		}
	});
}

/**
 * Creates default data for a form schema
 */
function createDefaultData(
	formSchema: FormSchema,
	initialData?: Record<string, any>
): Record<string, any> {
	const defaultData: Record<string, any> = {};

	formSchema.fields.forEach((field) => {
		if (field.type === 'section' || field.type === 'divider') {
			return;
		}

		// Use provided initial data if available
		if (initialData && field.name in initialData) {
			defaultData[field.name] = initialData[field.name];
			return;
		}

		// Set defaults based on field type
		switch (field.type) {
			case 'text':
			case 'textarea':
			case 'email':
			case 'phone':
				defaultData[field.name] = '';
				break;

			case 'number':
				defaultData[field.name] = field.required ? 0 : undefined;
				break;

			case 'date':
				defaultData[field.name] = field.required ? new Date().toISOString().split('T')[0] : '';
				break;

			case 'select':
			case 'radio':
				if (field.options?.length) {
					defaultData[field.name] = field.required ? field.options[0].value : '';
				} else {
					defaultData[field.name] = '';
				}
				break;

			case 'multi_select':
			case 'checkbox':
				defaultData[field.name] = [];
				break;

			case 'file':
				defaultData[field.name] = null;
				break;

			default:
				defaultData[field.name] = field.required ? '' : undefined;
		}
	});

	return defaultData;
}

/**
 * Validates form data against a schema without creating a form
 */
export function validateFormData<T>(
	data: Record<string, any>,
	formSchema: FormSchema
): { success: boolean; data?: T; errors?: Record<string, string[]> } {
	try {
		const zodSchema = createFormSchema(formSchema);
		const validatedData = zodSchema.parse(data);

		return {
			success: true,
			data: validatedData as T
		};
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errors: Record<string, string[]> = {};

			error.errors.forEach((err) => {
				const path = err.path.join('.');
				if (!errors[path]) {
					errors[path] = [];
				}
				errors[path].push(err.message);
			});

			return {
				success: false,
				errors
			};
		}

		return {
			success: false,
			errors: {
				_form: ['Validation failed']
			}
		};
	}
}

/**
 * Creates a form for employee data with built-in validation
 */
export function createEmployeeForm(
	initialData?: Record<string, any>,
	options: FormFactoryOptions = {}
) {
	const employeeFormSchema: FormSchema = {
		fields: [
			{
				id: 'username',
				name: 'username',
				type: 'text',
				label: 'Username',
				required: true,
				validation: { minLength: 3, maxLength: 50 }
			},
			{
				id: 'firstName',
				name: 'firstName',
				type: 'text',
				label: 'First Name',
				required: true,
				validation: { minLength: 2, maxLength: 50 }
			},
			{
				id: 'lastName',
				name: 'lastName',
				type: 'text',
				label: 'Last Name',
				required: true,
				validation: { minLength: 2, maxLength: 50 }
			},
			{
				id: 'email',
				name: 'email',
				type: 'email',
				label: 'Email',
				required: true
			},
			{
				id: 'roleId',
				name: 'roleId',
				type: 'select',
				label: 'Role',
				required: true,
				options: [] // Will be populated dynamically
			},
			{
				id: 'departmentId',
				name: 'departmentId',
				type: 'select',
				label: 'Department',
				required: false,
				options: [] // Will be populated dynamically
			},
			{
				id: 'jobTitle',
				name: 'jobTitle',
				type: 'text',
				label: 'Job Title',
				required: false
			},
			{
				id: 'hireDate',
				name: 'hireDate',
				type: 'date',
				label: 'Hire Date',
				required: false
			},
			{
				id: 'employmentType',
				name: 'employmentType',
				type: 'select',
				label: 'Employment Type',
				required: false,
				options: [
					{ value: 'Full-time', label: 'Full-time' },
					{ value: 'Part-time', label: 'Part-time' },
					{ value: 'Contract', label: 'Contract' },
					{ value: 'Intern', label: 'Intern' }
				]
			},
			{
				id: 'onboardingStatus',
				name: 'onboardingStatus',
				type: 'select',
				label: 'Status',
				required: false,
				options: [
					{ value: 'PreHire', label: 'Pre-Hire' },
					{ value: 'Onboarding', label: 'Onboarding' },
					{ value: 'Active', label: 'Active' },
					{ value: 'Terminated', label: 'Terminated' }
				]
			}
		]
	};

	return createDynamicForm(employeeFormSchema, initialData, options);
}

/**
 * Type-safe form creation with specific schemas
 */
export interface TypedFormFactory {
	employee: (
		initialData?: Record<string, any>,
		options?: FormFactoryOptions
	) => ReturnType<typeof createEmployeeForm>;
	// Add more typed forms as needed
}

export const forms: TypedFormFactory = {
	employee: createEmployeeForm
};
