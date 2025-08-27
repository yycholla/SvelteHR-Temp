import type { PageServerLoad } from './$types';
import { loadLeaveData, parseSearchParams } from '$lib/api/server-client';

export const load: PageServerLoad = async ({ cookies, url }) => {
	console.log('🏖️ Loading leave page with new API client');

	// Get query parameters for filtering
	const urlParams = parseSearchParams(url);
	const status = url.searchParams.get('status') || 'all';
	const leaveType = url.searchParams.get('leaveType') || 'all';
	const activeTab = url.searchParams.get('tab') || 'balances';

	try {
		// Build API parameters
		const apiParams = {
			page: urlParams.page,
			limit: urlParams.limit,
			status: status !== 'all' ? status : undefined,
			leave_type: leaveType !== 'all' ? leaveType : undefined
		};

		// Load leave data using the centralized helper
		const leaveData = await loadLeaveData(cookies, apiParams);

		// Calculate stats from the loaded data
		const stats = {
			totalEmployees: leaveData.employees.length,
			pendingRequests: leaveData.leaves.filter((req: any) => req.status === 'pending').length,
			approvedRequests: leaveData.leaves.filter((req: any) => req.status === 'approved').length,
			averageBalance: leaveData.leaves.length > 0 
				? Math.round(leaveData.leaves.reduce((sum: number, leave: any) => sum + (leave.days_requested || 0), 0) / leaveData.leaves.length)
				: 0
		};

		console.log('✅ Leave page loaded with', leaveData.leaves.length, 'leave requests');

		return {
			leaveBalances: [], // Could be enhanced if backend provides balance endpoint
			leaveRequests: leaveData.leaves,
			employees: leaveData.employees,
			stats,
			totalCount: leaveData.totalCount,
			filters: {
				status,
				leaveType,
				activeTab
			}
		};

	} catch (error: any) {
		console.error('❌ Error loading leave data:', error);
		
		// Return empty data with error state
		return {
			leaveBalances: [],
			leaveRequests: [],
			employees: [],
			stats: {
				totalEmployees: 0,
				pendingRequests: 0,
				approvedRequests: 0,
				averageBalance: 0
			},
			totalCount: 0,
			filters: {
				status: 'all',
				leaveType: 'all',
				activeTab: 'balances'
			},
			error: error.message || 'Failed to load leave data'
		};
	}
};