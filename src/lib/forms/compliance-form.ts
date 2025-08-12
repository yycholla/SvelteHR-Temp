import { superForm } from 'sveltekit-superforms';
import { z } from 'zod';
import { createComplianceItemSchema, updateComplianceItemSchema } from '$lib/schemas/compliance';

export type ComplianceFormInput = z.infer<typeof createComplianceItemSchema>;
export type UpdateComplianceFormInput = z.infer<typeof updateComplianceItemSchema>;

export function createComplianceForm(options: { 
	onSuccess?: (item: any) => void;
	onError?: (error: string) => void;
} = {}) {
	const initialData: ComplianceFormInput = {
		employeeId: 0,
		itemType: '',
		itemName: '',
		effectiveDate: new Date().toISOString().split('T')[0],
		authority: '',
		licenseNumber: '',
		status: 'Active'
	};

	const sForm = superForm(initialData, {
		SPA: true,
		resetForm: false,
		multipleSubmits: 'prevent',
		clearOnSubmit: 'errors-and-message',
		validators: createComplianceItemSchema,
		onUpdate: async ({ form }) => {
			try {
				const data = createComplianceItemSchema.parse(form.data);
				
				const response = await fetch('/api/hr/compliance', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data)
				});

				if (!response.ok) {
					throw new Error(`Failed to create compliance item: ${response.statusText}`);
				}

				const item = await response.json();
				if (options.onSuccess) options.onSuccess(item);
				return { message: { type: 'success', text: 'Compliance item created successfully' } };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to create compliance item';
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

export function updateComplianceForm(itemId: number, options: { 
	onSuccess?: (item: any) => void;
	onError?: (error: string) => void;
} = {}) {
	const sForm = superForm({}, {
		SPA: true,
		resetForm: false,
		multipleSubmits: 'prevent',
		clearOnSubmit: 'errors-and-message',
		validators: updateComplianceItemSchema,
		onUpdate: async ({ form }) => {
			try {
				const data = updateComplianceItemSchema.parse({ ...form.data, id: itemId });
				
				const response = await fetch(`/api/hr/compliance/${itemId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data)
				});

				if (!response.ok) {
					throw new Error(`Failed to update compliance item: ${response.statusText}`);
				}

				const item = await response.json();
				if (options.onSuccess) options.onSuccess(item);
				return { message: { type: 'success', text: 'Compliance item updated successfully' } };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to update compliance item';
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