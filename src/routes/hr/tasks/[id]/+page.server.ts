import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { createAuthenticatedApiClient } from '$lib/api/server-client';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const { id } = params;

	if (!id) {
		throw error(400, 'Task ID is required');
	}

	console.log(`✅ Loading task detail page for ID: ${id}`);

	try {
		const apiClient = createAuthenticatedApiClient(cookies);

		// Fetch task data
		const taskResult = await apiClient.tasks.getById(id);

		if (!taskResult.success) {
			throw error(404, 'Task not found');
		}

		const task = taskResult.data;

		// Load related employee data in parallel
		const employeePromises = [];

		if (task.assigned_to) {
			employeePromises.push(apiClient.employees.getById(task.assigned_to));
		} else {
			employeePromises.push(Promise.resolve({ success: false, data: null }));
		}

		if (task.assigned_by) {
			employeePromises.push(apiClient.employees.getById(task.assigned_by));
		} else {
			employeePromises.push(Promise.resolve({ success: false, data: null }));
		}

		const [assignedToResult, assignedByResult] = await Promise.allSettled(employeePromises);

		// Process employee results
		const assignedEmployee =
			assignedToResult.status === 'fulfilled' && assignedToResult.value.success
				? assignedToResult.value.data
				: null;

		const assignedByEmployee =
			assignedByResult.status === 'fulfilled' && assignedByResult.value.success
				? assignedByResult.value.data
				: null;

		if (assignedToResult.status === 'rejected') {
			console.warn('Failed to load assigned employee:', assignedToResult.reason);
		}
		if (assignedByResult.status === 'rejected') {
			console.warn('Failed to load assigning employee:', assignedByResult.reason);
		}

		console.log('✅ Task detail page loaded successfully');

		return {
			task,
			assignedEmployee,
			assignedByEmployee
		};
	} catch (err) {
		console.error('❌ Error loading task detail:', err);

		if (err instanceof Error) {
			if (err.message.includes('ECONNREFUSED')) {
				throw error(503, 'Unable to connect to the HR service. Please try again later.');
			}
		}

		throw err;
	}
};
