import { superForm } from 'sveltekit-superforms';
import { z } from 'zod';
import { createEmployeeSchema, updateEmployeeSchema } from '$lib/schemas/employee';

export type EmployeeFormInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeFormInput = z.infer<typeof updateEmployeeSchema>;

export function createEmployeeForm(options: { 
	onSuccess?: (employee: any) => void;
	onError?: (error: string) => void;
} = {}) {
	const initialData: EmployeeFormInput = {
		username: '',
		firstName: '',
		lastName: '',
		email: '',
		roleId: 0,
		departmentId: 0,
		jobTitle: '',
		hireDate: new Date().toISOString().split('T')[0],
		employmentType: 'Full-time',
		onboardingStatus: 'PreHire'
	};

	const sForm = superForm(initialData, {
		SPA: true,
		resetForm: false,
		multipleSubmits: 'prevent',
		clearOnSubmit: 'errors-and-message',
		validator: createEmployeeSchema,
		onUpdate: async ({ form }) => {
			try {
				const data = createEmployeeSchema.parse(form.data);
				
				// Use server-side API endpoint as middleman
				const response = await fetch('/api/employees', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data)
				});

				if (!response.ok) {
					throw new Error(`Failed to create employee: ${response.statusText}`);
				}

				const employee = await response.json();
				if (options.onSuccess) options.onSuccess(employee);
				return { message: { type: 'success', text: 'Employee created successfully' } };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to create employee';
				if (options.onError) options.onError(errorMessage);
				return { message: { type: 'error', text: errorMessage } };
			}
		}
	});

	return {
		...sForm,
		isSubmitting: sForm.submitting
	};
}

export function updateEmployeeForm(employeeId: number, options: { 
	onSuccess?: (employee: any) => void;
	onError?: (error: string) => void;
} = {}) {
	const sForm = superForm({}, {
		SPA: true,
		resetForm: false,
		multipleSubmits: 'prevent',
		clearOnSubmit: 'errors-and-message',
		validator: updateEmployeeSchema,
		onUpdate: async ({ form }) => {
			try {
				const data = updateEmployeeSchema.parse({ ...form.data, id: employeeId });
				
				// Use server-side API endpoint as middleman
				const response = await fetch(`/api/employees/${employeeId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data)
				});

				if (!response.ok) {
					throw new Error(`Failed to update employee: ${response.statusText}`);
				}

				const employee = await response.json();
				if (options.onSuccess) options.onSuccess(employee);
				return { message: { type: 'success', text: 'Employee updated successfully' } };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to update employee';
				if (options.onError) options.onError(errorMessage);
				return { message: { type: 'error', text: errorMessage } };
			}
		}
	});

	return {
		...sForm,
		isSubmitting: sForm.submitting
	};
}