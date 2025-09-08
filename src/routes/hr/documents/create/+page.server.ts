import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zodAdapter } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { createFormSchema } from '$lib/forms/builders/schema-builder';
import { loadFormTemplate } from '$lib/forms/utils/template-loader';
import { MountainHRApiClient } from '$lib/api/client';

export const load: PageServerLoad = async ({ cookies }) => {
	console.log('📝 Loading document upload form');

	try {
		// Load the document upload form template
		const template = await loadFormTemplate('document-upload');

		// Create Zod schema from the template
		const formSchema = createFormSchema(template.template_schema);

		// Initialize form with superValidate
		const form = await superValidate(zodAdapter(formSchema));

		console.log('✅ Document upload form loaded');

		return {
			form,
			template
		};
	} catch (error) {
		console.error('❌ Error loading document upload form:', error);

		// Return minimal form structure if template loading fails
		const fallbackSchema = z.object({
			title: z.string().min(1, 'Title is required'),
			description: z.string().optional(),
			category: z.string().min(1, 'Category is required'),
			employee_id: z.string().optional(),
			is_public: z.boolean().default(false)
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
		console.log('🚀 Document upload form submission started');

		try {
			// Load template again to get the schema for validation
			const template = await loadFormTemplate('document-upload');
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
			const documentData = {
				title: form.data.title,
				description: form.data.description || '',
				documentCategory: form.data.category,
				employeeId: form.data.employee_id ? parseInt(form.data.employee_id) : null,
				is_public: form.data.is_public || false,
				securityLevel: form.data.is_public ? 'Public' : 'Internal'
				// File handling would be done separately in a multipart upload
				// For now, we're just handling the metadata
			};

			// Note: In a real implementation, file upload would be handled differently
			// This would typically involve multipart form data and file processing
			console.log('🌐 Document metadata prepared:', documentData);

			// For now, we'll simulate success and redirect
			// In a real implementation, you'd upload the file and create the document record
			console.log('✅ Document upload simulated successfully');

			// Redirect to documents list
			throw redirect(303, '/hr/documents');
		} catch (error) {
			console.error('💥 Document upload failed:', error);

			// Try to reload the form with the original template
			try {
				const template = await loadFormTemplate('document-upload');
				const formSchema = createFormSchema(template.template_schema);
				const form = await superValidate(request, zodAdapter(formSchema));

				const errorMessage = error instanceof Error ? error.message : 'Failed to upload document';

				return fail(500, {
					form,
					error: errorMessage
				});
			} catch (templateError) {
				// Fallback if template loading also fails
				const fallbackSchema = z.object({
					title: z.string(),
					description: z.string().optional(),
					category: z.string(),
					employee_id: z.string().optional(),
					is_public: z.boolean()
				});

				const form = await superValidate(request, zodAdapter(fallbackSchema));

				return fail(500, {
					form,
					error: 'Failed to upload document'
				});
			}
		}
	}
};
