import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zodAdapter } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';
import { createEmployeeSchema } from '$lib/schemas/employee';
import { loadEmployeeData } from '$lib/api/server-client';
import { MountainHRApiClient } from '$lib/api/client';

export const load: PageServerLoad = async ({ cookies }) => {
	console.log('📝 Loading employee create form');

	try {
		// Load departments and roles for dropdowns
		const { departments, roles } = await loadEmployeeData(cookies, { page: 1, limit: 1 });

		// Initialize form with superValidate
		const form = await superValidate(zodAdapter(createEmployeeSchema));

		console.log('✅ Employee create form loaded');

		return {
			form,
			departments,
			roles
		};
	} catch (error) {
		console.error('❌ Error loading employee create form:', error);

		// Return form even if loading data fails
		const form = await superValidate(zodAdapter(createEmployeeSchema));

		return {
			form,
			departments: [],
			roles: []
		};
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		console.log('🚀 Employee create form submission started');

		const form = await superValidate(request, zodAdapter(createEmployeeSchema));

		console.log('📝 Form validation result:', { valid: form.valid, data: form.data });

		if (!form.valid) {
			console.log('❌ Form validation failed:', form.errors);
			return fail(400, { form });
		}

		try {
			// Create API client with Bearer token
			const apiClient = new MountainHRApiClient();
			const token = cookies.get('hr_token') || '';
			apiClient.setToken(token);

			// Submit to backend API
			console.log('🌐 Submitting to backend API:', form.data);
			const response = await apiClient.post('/api/v2/employees', form.data);

			console.log('✅ Employee created successfully:', response.data);

			// Redirect to employee list or detail page
			throw redirect(303, '/hr/employees');
		} catch (error) {
			console.error('💥 Employee creation failed:', error);

			const errorMessage = error instanceof Error ? error.message : 'Failed to create employee';

			return fail(500, {
				form,
				error: errorMessage
			});
		}
	}
};
