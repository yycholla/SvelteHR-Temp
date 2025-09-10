import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { createServerEmployeeService } from '$lib/graphql/services/employee-service';
import { taskApi } from '$lib/components/hr/utils/api-helpers';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const { id } = params;

	if (!id) {
		throw error(400, 'Employee ID is required');
	}

	console.log(`👤 Loading employee detail page for ID: ${id}`);

	try {
		const employeeService = createServerEmployeeService(cookies);

		// Load employee data using GraphQL service
		const employeeResult = await employeeService.getEmployeeById(id);

		if (!employeeResult.success || !employeeResult.data) {
			console.error('❌ Failed to load employee:', employeeResult.error);
			throw error(404, 'Employee not found');
		}

		const employee = employeeResult.data;

		// Load tasks data (keeping old API for now as tasks haven't been migrated to GraphQL yet)
		let tasks: any[] = [];
		let tasksTotal = 0;

		try {
			const tasksResponse = await taskApi.getAll({ assigned_to: id, limit: 10 });
			if (tasksResponse && tasksResponse.data) {
				tasks = tasksResponse.data.data || [];
				tasksTotal = tasksResponse.data.total || 0;
			}
		} catch (taskError) {
			console.log('ℹ️ Could not load tasks for employee:', taskError);
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
			if (err.message.includes('ECONNREFUSED') || err.message.includes('network')) {
				throw error(503, 'Unable to connect to the HR service. Please try again later.');
			}
			if (err.message.includes('not found') || err.message.includes('404')) {
				throw error(404, 'Employee not found');
			}
		}

		throw err;
	}
};
