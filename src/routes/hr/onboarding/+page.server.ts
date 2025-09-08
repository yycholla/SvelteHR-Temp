import type { PageServerLoad } from './$types';
import { loadEmployeeData, parseSearchParams } from '$lib/api/server-client';

export const load: PageServerLoad = async ({ cookies, url }) => {
	console.log('🚀 Loading onboarding page with new API client');

	// Get query parameters for filtering
	const urlParams = parseSearchParams(url);
	const status = url.searchParams.get('status') || 'all';

	try {
		// Build API parameters - focus on new/onboarding employees
		const apiParams = {
			page: urlParams.page,
			limit: urlParams.limit,
			status: status !== 'all' ? status : undefined
			// Remove order_by for now due to database schema issues
			// order_by: 'created_at', // Show recently hired first
			// order_direction: 'desc'
		};

		// Load employee data using the centralized helper
		const employeeData = await loadEmployeeData(cookies, apiParams);

		// Calculate onboarding stats from loaded employees
		const stats = {
			total: employeeData.employees.length,
			preHire: employeeData.employees.filter((emp: any) => emp.status === 'pre_hire').length,
			onboarding: employeeData.employees.filter((emp: any) => emp.status === 'onboarding').length,
			active: employeeData.employees.filter((emp: any) => emp.status === 'active').length,
			overdue: 0 // Could be calculated based on hire date vs current progress
		};

		console.log('✅ Onboarding page loaded with', employeeData.employees.length, 'employees');

		return {
			onboardingEmployees: employeeData.employees,
			departments: employeeData.departments,
			stats,
			totalCount: employeeData.pagination.totalCount,
			filters: {
				status
			}
		};
	} catch (error: any) {
		console.error('❌ Error loading onboarding data:', error);

		// Return empty data with error state
		return {
			onboardingEmployees: [],
			departments: [],
			stats: {
				total: 0,
				preHire: 0,
				onboarding: 0,
				active: 0,
				overdue: 0
			},
			totalCount: 0,
			filters: {
				status: 'all'
			},
			error: error.message || 'Failed to load onboarding data'
		};
	}
};
