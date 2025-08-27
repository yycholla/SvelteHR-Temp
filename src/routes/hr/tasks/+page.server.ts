import type { PageServerLoad } from './$types';
import { loadTaskData, parseSearchParams } from '$lib/api/server-client';

export const load: PageServerLoad = async ({ cookies, url, parent }) => {
	console.log('✅ Loading tasks page with new API client');

	// Get query parameters for filtering
	const urlParams = parseSearchParams(url);
	const status = url.searchParams.get('status') || 'all';
	const relatedEntityType = url.searchParams.get('relatedEntityType') || 'all';

	try {
		// Get parent layout data (includes user)
		const parentData = await parent();

		// Build API parameters
		const apiParams = {
			page: urlParams.page,
			limit: urlParams.limit,
			status: status !== 'all' ? status : undefined,
			entity_type: relatedEntityType !== 'all' ? relatedEntityType : undefined
		};

		// Load task data using the centralized helper
		const taskData = await loadTaskData(cookies, apiParams);

		// Calculate stats from loaded tasks
		const stats = {
			total: taskData.tasks.length,
			pending: taskData.tasks.filter((task: any) => task.status === 'pending').length,
			inProgress: taskData.tasks.filter((task: any) => task.status === 'in_progress').length,
			completed: taskData.tasks.filter((task: any) => task.status === 'completed').length,
			blocked: taskData.tasks.filter((task: any) => task.status === 'blocked').length
		};

		console.log('✅ Tasks page loaded with', taskData.tasks.length, 'tasks');
		console.log('📋 Employees loaded:', taskData.employees.length, 'employees');
		console.log('👤 Current user from parent:', parentData.user?.full_name || 'None');

		return {
			...parentData,
			tasks: taskData.tasks,
			employees: taskData.employees,
			stats,
			totalCount: taskData.totalCount,
			filters: {
				status,
				relatedEntityType
			}
		};

	} catch (error: any) {
		console.error('❌ Error loading tasks data:', error);
		
		return {
			tasks: [],
			employees: [],
			stats: {
				total: 0,
				pending: 0,
				inProgress: 0,
				completed: 0,
				blocked: 0
			},
			totalCount: 0,
			filters: {
				status: 'all',
				relatedEntityType: 'all'
			},
			error: error.message || 'Failed to load tasks data'
		};
	}
};