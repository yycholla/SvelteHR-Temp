import type { PageServerLoad } from './$types';
import { apiClient } from '$lib/api/client';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = cookies.get('auth-token');
	
	console.log('🏖️ Loading leave page - Token present:', !!token);

	if (!token) {
		throw new Error('Authentication required');
	}

	// Create server-side API client with auth token
	const serverApiClient = apiClient.extend({
		hooks: {
			beforeRequest: [
				(request) => {
					request.headers.set('Authorization', `Bearer ${token}`);
					request.headers.set('Content-Type', 'application/json');
					console.log(`📡 API Request: ${request.method} ${request.url}`);
				}
			],
			afterResponse: [
				(request, options, response) => {
					console.log(`📡 API Response: ${response.status} for ${request.url}`);
					return response;
				}
			]
		}
	});

	// Get query parameters for filtering
	const searchParams = url.searchParams;
	const status = searchParams.get('status') || 'all';
	const leaveType = searchParams.get('leaveType') || 'all';
	const activeTab = searchParams.get('tab') || 'balances';

	try {
		// Build query parameters for leave balances
		const balanceParams = new URLSearchParams();
		if (leaveType !== 'all') balanceParams.append('leaveType', leaveType);

		// Build query parameters for leave requests  
		const requestParams = new URLSearchParams();
		if (status !== 'all') requestParams.append('status', status);
		if (leaveType !== 'all') requestParams.append('leaveType', leaveType);

		// Fetch leave data in parallel
		const [balancesResponse, requestsResponse] = await Promise.allSettled([
			serverApiClient.get(`leave/balances?${balanceParams.toString()}`).json(),
			serverApiClient.get(`leave/requests?${requestParams.toString()}`).json()
		]);

		// Process responses with null safety
		const balancesData = balancesResponse.status === 'fulfilled' && balancesResponse.value
			? balancesResponse.value 
			: { data: [] };

		const requestsData = requestsResponse.status === 'fulfilled' && requestsResponse.value
			? requestsResponse.value 
			: { data: [] };

		const leaveBalances = (balancesData && balancesData.data) || [];
		const leaveRequests = (requestsData && requestsData.data) || [];

		// Calculate stats
		const stats = {
			totalEmployees: leaveBalances.length,
			pendingRequests: leaveRequests.filter((req: any) => req.status === 'Pending').length,
			approvedRequests: leaveRequests.filter((req: any) => req.status === 'Approved').length,
			averageBalance: leaveBalances.length > 0 
				? Math.round(leaveBalances.reduce((sum: number, balance: any) => sum + (balance.available || 0), 0) / leaveBalances.length)
				: 0
		};

		console.log('✅ Leave page data loaded successfully');

		return {
			leaveBalances,
			leaveRequests,
			stats,
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
			stats: {
				totalEmployees: 0,
				pendingRequests: 0,
				approvedRequests: 0,
				averageBalance: 0
			},
			filters: {
				status: 'all',
				leaveType: 'all',
				activeTab: 'balances'
			},
			error: error.message || 'Failed to load leave data'
		};
	}
};