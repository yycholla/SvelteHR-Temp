import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { createAuthenticatedApiClient } from '$lib/api/server-client';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const { id } = params;

	if (!id) {
		throw error(400, 'Document ID is required');
	}

	console.log(`📄 Loading document detail page for ID: ${id}`);

	try {
		const apiClient = createAuthenticatedApiClient(cookies);

		// Fetch document data
		const documentResult = await apiClient.documents.getById(id);

		if (!documentResult.success) {
			throw error(404, 'Document not found');
		}

		const document = documentResult.data;

		// Fetch assigned employee details if document has an employee_id
		let assignedEmployee = null;
		if (document.employee_id) {
			try {
				const employeeResult = await apiClient.employees.getById(document.employee_id);
				if (employeeResult.success) {
					assignedEmployee = employeeResult.data;
				}
			} catch (err) {
				console.warn('Failed to load assigned employee:', err);
			}
		}

		console.log('✅ Document detail page loaded successfully');

		return {
			document,
			assignedEmployee
		};

	} catch (err) {
		console.error('❌ Error loading document detail:', err);
		
		if (err instanceof Error) {
			if (err.message.includes('ECONNREFUSED')) {
				throw error(503, 'Unable to connect to the HR service. Please try again later.');
			}
		}
		
		throw err;
	}
};