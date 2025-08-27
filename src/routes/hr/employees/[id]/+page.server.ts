import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { createAuthenticatedApiClient } from '$lib/api/server-client';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const { id } = params;

	if (!id) {
		throw error(400, 'Employee ID is required');
	}

	console.log(`👤 Loading employee detail page for ID: ${id}`);

	try {
		const apiClient = createAuthenticatedApiClient(cookies);

		// Load employee data and tasks in parallel
		const [employeeResult, tasksResult] = await Promise.allSettled([
			apiClient.employees.getById(id),
			apiClient.tasks.list({ assigned_to: id, limit: 10 })
		]);

		// Handle employee data
		if (employeeResult.status === 'rejected') {
			console.error('❌ Failed to load employee:', employeeResult.reason);
			if (employeeResult.reason?.status === 404) {
				throw error(404, 'Employee not found');
			}
			throw error(500, 'Failed to load employee data');
		}

		if (!employeeResult.value.success) {
			throw error(404, 'Employee not found');
		}

		const employee = employeeResult.value.data;

		// Handle tasks data (optional, don't fail if tasks can't be loaded)
		let tasks: any[] = [];
		let tasksTotal = 0;

		if (tasksResult.status === 'fulfilled' && tasksResult.value.success) {
			tasks = tasksResult.value.data?.data || [];
			tasksTotal = tasksResult.value.data?.total || 0;
		} else {
			console.log('ℹ️ Could not load tasks for employee');
		}

		console.log('✅ Employee detail page loaded successfully');

		return {
			employee,
			tasks,
			tasksTotal
		};

	} catch (err) {
		console.error('❌ Error loading employee detail:', err);
		
		if (err instanceof Error) {
			if (err.message.includes('ECONNREFUSED')) {
				throw error(503, 'Unable to connect to the HR service. Please try again later.');
			}
		}
		
		throw err;
	}
};