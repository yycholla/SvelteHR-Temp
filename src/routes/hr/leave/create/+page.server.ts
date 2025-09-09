import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zodAdapter } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { createFormSchema } from '$lib/forms/builders/schema-builder';
import { loadFormTemplate } from '$lib/forms/utils/template-loader';
import { MountainHRApiClient } from '$lib/api/client';

export const load: PageServerLoad = async ({ cookies }) => {
	console.log('📝 Loading leave request create form');

	try {
		// Load the leave request form template
		const template = await loadFormTemplate('leave-request');

		// Create Zod schema from the template
		const formSchema = createFormSchema(template.template_schema);

		// Initialize form with superValidate
		const form = await superValidate(zodAdapter(formSchema));

		console.log('✅ Leave request create form loaded');

		return {
			form,
			template
		};
	} catch (error) {
		console.error('❌ Error loading leave request create form:', error);

		// Return minimal form structure if template loading fails
		const fallbackSchema = z.object({
			leaveType: z.string().min(1, 'Leave type is required'),
			startDate: z.string().min(1, 'Start date is required'),
			endDate: z.string().min(1, 'End date is required'),
			reason: z.string().min(10, 'Please provide a reason for your leave request')
		});

		const form = await superValidate(zodAdapter(fallbackSchema));

		return {
			form,
			template: null,
			error: 'Failed to load form template'
		};
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		console.log('🚀 Leave request form submission started');

		try {
			// Load template again to get the schema for validation
			const template = await loadFormTemplate('leave-request');
			const formSchema = createFormSchema(template.template_schema);

			const form = await superValidate(request, zodAdapter(formSchema));

			console.log('📝 Form validation result:', { valid: form.valid, data: form.data });

			if (!form.valid) {
				console.log('❌ Form validation failed:', form.errors);
				return fail(400, { form });
			}

			// Create API client with Bearer token
			const apiClient = new MountainHRApiClient();
			const token = cookies.get('hr_token') || '';
			apiClient.setToken(token);

			// Transform form data for the backend API
			const leaveRequestData = {
				employee_id: form.data.employeeId || 'current-user', // Will be set by backend
				type: form.data.leaveType,
				start_date: form.data.startDate,
				end_date: form.data.endDate,
				reason: form.data.reason,
				notes: form.data.additionalNotes || '',
				work_coverage_plan: form.data.workCoverage || '',
				backup_contact: form.data.backupContact || '',
				emergency_contact_allowed: form.data.emergencyContactDuringLeave === 'yes',
				duration_type: form.data.durationType || 'full_day',
				start_time: form.data.startTime || null,
				end_time: form.data.endTime || null,
				supporting_documents: form.data.supportingDocuments || []
			};

			// Submit to backend API
			console.log('🌐 Submitting leave request to backend:', leaveRequestData);
			const response = await apiClient.post('/api/v2/leave-requests', leaveRequestData);

			console.log('✅ Leave request created successfully:', response.data);

			// Redirect to leave requests list
			throw redirect(303, '/hr/leave');
		} catch (error) {
			console.error('💥 Leave request creation failed:', error);

			// Try to reload the form with the original template
			try {
				const template = await loadFormTemplate('leave-request');
				const formSchema = createFormSchema(template.template_schema);
				const form = await superValidate(request, zodAdapter(formSchema));

				const errorMessage =
					error instanceof Error ? error.message : 'Failed to create leave request';

				return fail(500, {
					form,
					error: errorMessage
				});
			} catch (templateError) {
				// Fallback if template loading also fails
				const fallbackSchema = z.object({
					leaveType: z.string(),
					startDate: z.string(),
					endDate: z.string(),
					reason: z.string()
				});

				const form = await superValidate(request, zodAdapter(fallbackSchema));

				return fail(500, {
					form,
					error: 'Failed to create leave request'
				});
			}
		}
	}
};
