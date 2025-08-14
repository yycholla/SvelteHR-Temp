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
		// No validators - we'll handle validation manually
		onSubmit: async ({ formData }) => {
			console.log('🚀 CREATE FORM SUBMISSION STARTED');
			try {
				const formDataObj = Object.fromEntries(formData);
				console.log('📝 Raw form data:', formDataObj);
				
				// Convert string values to appropriate types
				const processedData = {
					...formDataObj,
					roleId: formDataObj.roleId ? parseInt(formDataObj.roleId as string) : undefined,
					departmentId: formDataObj.departmentId ? parseInt(formDataObj.departmentId as string) : undefined
				};
				console.log('🔄 Processed data:', processedData);
				
				const data = createEmployeeSchema.parse(processedData);
				console.log('✅ Validated data:', data);
				
				// Use server-side API endpoint as middleman
				const response = await fetch('/api/employees', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data)
				});
				
				console.log('🌐 Response status:', response.status);

				if (!response.ok) {
					const errorData = await response.json();
					console.error('❌ Error response:', errorData);
					throw new Error(errorData.error || `Failed to create employee: ${response.statusText}`);
				}

				const employee = await response.json();
				console.log('🎉 Success response:', employee);
				
				if (options.onSuccess) {
					console.log('🔄 Calling onSuccess callback');
					options.onSuccess(employee);
				}
			} catch (error) {
				console.error('💥 Form submission error:', error);
				const errorMessage = error instanceof Error ? error.message : 'Failed to create employee';
				if (options.onError) {
					console.log('🔄 Calling onError callback');
					options.onError(errorMessage);
				}
				throw error; // Re-throw to show error in form
			}
		}
	});

	return {
		...sForm,
		isSubmitting: sForm.submitting
	};
}

export function updateEmployeeForm(employeeId: number, initialData: any = {}, options: { 
	onSuccess?: (employee: any) => void;
	onError?: (error: string) => void;
} = {}) {
	const sForm = superForm(initialData, {
		SPA: true,
		resetForm: false,
		multipleSubmits: 'prevent',
		clearOnSubmit: 'errors-and-message',
		// No validators - we'll handle validation manually
		onSubmit: async ({ formData }) => {
			console.log('🚀 UPDATE FORM SUBMISSION STARTED');
			try {
				const formDataObj = Object.fromEntries(formData);
				console.log('📝 Raw form data:', formDataObj);
				
				// Convert string values to appropriate types
				const processedData = {
					...formDataObj,
					id: employeeId,
					roleId: formDataObj.roleId ? parseInt(formDataObj.roleId as string) : undefined,
					departmentId: formDataObj.departmentId ? parseInt(formDataObj.departmentId as string) : undefined
				};
				console.log('🔄 Processed data:', processedData);
				
				const data = updateEmployeeSchema.parse({ ...processedData, id: employeeId });
				console.log('✅ Validated data:', data);
				
				// Use server-side API endpoint as middleman
				const response = await fetch(`/api/employees/${employeeId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data)
				});
				
				console.log('🌐 Response status:', response.status);

				if (!response.ok) {
					const errorData = await response.json();
					console.error('❌ Error response:', errorData);
					throw new Error(errorData.error || `Failed to update employee: ${response.statusText}`);
				}

				const employee = await response.json();
				console.log('🎉 Success response:', employee);
				
				if (options.onSuccess) {
					console.log('🔄 Calling onSuccess callback');
					options.onSuccess(employee);
				}
			} catch (error) {
				console.error('💥 Form submission error:', error);
				const errorMessage = error instanceof Error ? error.message : 'Failed to update employee';
				if (options.onError) {
					console.log('🔄 Calling onError callback');
					options.onError(errorMessage);
				}
				throw error; // Re-throw to show error in form
			}
		}
	});

	return {
		...sForm,
		isSubmitting: sForm.submitting
	};
}