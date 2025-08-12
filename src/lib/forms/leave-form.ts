import { superForm } from 'sveltekit-superforms';
import { z } from 'zod';
import { createLeaveSchema, updateLeaveSchema } from '$lib/schemas/leave';

export type LeaveFormInput = z.infer<typeof createLeaveSchema>;
export type UpdateLeaveFormInput = z.infer<typeof updateLeaveSchema>;

export function createLeaveForm(options: { 
	onSuccess?: (leave: any) => void;
	onError?: (error: string) => void;
} = {}) {
	const initialData: LeaveFormInput = {
		leaveBalanceId: 0,
		startDate: '',
		endDate: '',
		status: 'Pending',
		reason: ''
	};

	const sForm = superForm(initialData, {
		SPA: true,
		resetForm: false,
		multipleSubmits: 'prevent',
		clearOnSubmit: 'errors-and-message',
		validators: createLeaveSchema,
		onUpdate: async ({ form }) => {
			try {
				const data = createLeaveSchema.parse(form.data);
				
				const response = await fetch('/api/hr/leave/requests', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data)
				});

				if (!response.ok) {
					throw new Error(`Failed to create leave request: ${response.statusText}`);
				}

				const leave = await response.json();
				if (options.onSuccess) options.onSuccess(leave);
				return { message: { type: 'success', text: 'Leave request created successfully' } };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to create leave request';
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

export function approveLeaveForm(leaveId: number, options: { 
	onSuccess?: (leave: any) => void;
	onError?: (error: string) => void;
} = {}) {
	const approvalSchema = z.object({
		status: z.enum(['Approved', 'Rejected']),
		comments: z.string().optional()
	});

	const sForm = superForm({ status: 'Approved', comments: '' }, {
		SPA: true,
		resetForm: false,
		multipleSubmits: 'prevent',
		clearOnSubmit: 'errors-and-message',
		validators: approvalSchema,
		onUpdate: async ({ form }) => {
			try {
				const data = approvalSchema.parse(form.data);
				
				const response = await fetch(`/api/hr/leave/requests/${leaveId}/approve`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data)
				});

				if (!response.ok) {
					throw new Error(`Failed to process leave request: ${response.statusText}`);
				}

				const leave = await response.json();
				if (options.onSuccess) options.onSuccess(leave);
				return { message: { 
					type: 'success', 
					text: `Leave request ${data.status.toLowerCase()} successfully` 
				} };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to process leave request';
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