import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const { id } = params;

	if (!id) {
		throw error(400, 'Employee ID is required');
	}

	try {
		// Fetch employee data from the API
		const employeeResponse = await fetch(`http://localhost:8080/api/v2/employees/${id}`, {
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!employeeResponse.ok) {
			if (employeeResponse.status === 404) {
				throw error(404, 'Employee not found');
			}
			throw error(employeeResponse.status, 'Failed to load employee');
		}

		const employeeData = await employeeResponse.json();

		// Fetch employee's tasks
		const tasksResponse = await fetch(`http://localhost:8080/api/v2/tasks?assigned_to=${id}&limit=10`, {
			headers: {
				'Content-Type': 'application/json'
			}
		});

		let tasksData = { data: [], total: 0 };
		if (tasksResponse.ok) {
			tasksData = await tasksResponse.json();
		}

		return {
			employee: employeeData.data,
			tasks: tasksData.data || [],
			tasksTotal: tasksData.total || 0
		};
	} catch (err) {
		console.error('Error loading employee:', err);
		if (err instanceof Error && err.message.includes('ECONNREFUSED')) {
			throw error(503, 'Unable to connect to the HR service. Please try again later.');
		}
		throw err;
	}
};