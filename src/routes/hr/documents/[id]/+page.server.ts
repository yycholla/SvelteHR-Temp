import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const { id } = params;

	if (!id) {
		throw error(400, 'Document ID is required');
	}

	try {
		// Fetch document data from the API
		const documentResponse = await fetch(`http://localhost:8080/api/v1/documents/${id}`, {
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!documentResponse.ok) {
			if (documentResponse.status === 404) {
				throw error(404, 'Document not found');
			}
			throw error(documentResponse.status, 'Failed to load document');
		}

		const documentData = await documentResponse.json();

		// Fetch assigned employee details if document has an assignee
		let assignedEmployee = null;
		if (documentData.data.employee_id) {
			try {
				const employeeResponse = await fetch(`http://localhost:8080/api/v1/employees/${documentData.data.employee_id}`, {
					headers: {
						'Content-Type': 'application/json'
					}
				});

				if (employeeResponse.ok) {
					const employeeData = await employeeResponse.json();
					assignedEmployee = employeeData.data;
				}
			} catch (err) {
				console.warn('Failed to load assigned employee:', err);
			}
		}

		return {
			document: documentData.data,
			assignedEmployee
		};
	} catch (err) {
		console.error('Error loading document:', err);
		if (err instanceof Error && err.message.includes('ECONNREFUSED')) {
			throw error(503, 'Unable to connect to the HR service. Please try again later.');
		}
		throw err;
	}
};