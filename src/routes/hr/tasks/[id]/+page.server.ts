import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const { id } = params;

	if (!id) {
		throw error(400, 'Task ID is required');
	}

	try {
		// Fetch task data from the API
		const taskResponse = await fetch(`http://localhost:8080/api/v1/tasks/${id}`, {
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!taskResponse.ok) {
			if (taskResponse.status === 404) {
				throw error(404, 'Task not found');
			}
			throw error(taskResponse.status, 'Failed to load task');
		}

		const taskData = await taskResponse.json();

		// Fetch assigned employee details if task has an assignee
		let assignedEmployee = null;
		if (taskData.data.assigned_to) {
			try {
				const employeeResponse = await fetch(`http://localhost:8080/api/v1/employees/${taskData.data.assigned_to}`, {
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

		// Fetch assigned by employee details if task has an assigner
		let assignedByEmployee = null;
		if (taskData.data.assigned_by) {
			try {
				const employeeResponse = await fetch(`http://localhost:8080/api/v1/employees/${taskData.data.assigned_by}`, {
					headers: {
						'Content-Type': 'application/json'
					}
				});

				if (employeeResponse.ok) {
					const employeeData = await employeeResponse.json();
					assignedByEmployee = employeeData.data;
				}
			} catch (err) {
				console.warn('Failed to load assigning employee:', err);
			}
		}

		return {
			task: taskData.data,
			assignedEmployee,
			assignedByEmployee
		};
	} catch (err) {
		console.error('Error loading task:', err);
		if (err instanceof Error && err.message.includes('ECONNREFUSED')) {
			throw error(503, 'Unable to connect to the HR service. Please try again later.');
		}
		throw err;
	}
};