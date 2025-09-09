import type { PageServerLoad } from './$types';
import { apiClient } from '$lib/api/client';
import { apiCache, CACHE_KEYS, CACHE_TTL } from '$lib/api/cache';

export const load: PageServerLoad = async ({ cookies, locals, url }) => {
	const token = cookies.get('hr_token');

	// Parse URL parameters for filtering
	const page = Number(url.searchParams.get('page')) || 1;
	const search = url.searchParams.get('search') || '';
	const status = url.searchParams.get('status') || '';
	const type = url.searchParams.get('type') || '';
	const limit = Number(url.searchParams.get('limit')) || 20;

	console.log('🏖️ Leave page load - Token present:', !!token);
	console.log('🏖️ Leave page load - User authenticated:', !!locals.user);

	// Default leave data structure
	const defaultData = {
		leaveRequests: [],
		totalCount: 0,
		page,
		limit,
		totalPages: 0,
		hasMore: false,
		filters: { search, status, type },
		stats: {
			totalRequests: 0,
			approved: 0,
			pending: 0,
			rejected: 0,
			myAvailableLeave: 0,
			myUsedLeave: 0,
			myPendingRequests: 0
		},
		leaveTypes: [],
		currentUser: locals.user,
		isUsingMockData: true
	};

	try {
		if (token) {
			console.log('🏖️ Fetching leave data from API...');

			// Build query parameters
			const params = new URLSearchParams();
			if (search) params.append('search', search);
			if (status) params.append('status', status);
			if (type) params.append('type', type);
			params.append('page', page.toString());
			params.append('pageSize', limit.toString());

			// Check cache
			const cacheKey = `leave_${params.toString()}`;
			const cachedLeave = apiCache.get(cacheKey);
			if (cachedLeave) {
				console.log('🏖️ Using cached leave data');
				return { ...cachedLeave, isUsingMockData: false };
			}

			// Create server-side API client
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

			// Try to fetch leave data and types in parallel
			const [leaveResponse, leaveTypesResponse, leaveStatsResponse] = await Promise.allSettled([
				serverApiClient
					.get(`leave/requests?${params.toString()}`)
					.json()
					.catch(() => ({ data: [], total: 0 })),
				serverApiClient
					.get('leave/types')
					.json()
					.catch(() => []),
				serverApiClient
					.get('leave/my-stats')
					.json()
					.catch(() => null)
			]);

			// Process leave requests data
			const leaveData =
				leaveResponse.status === 'fulfilled'
					? Array.isArray(leaveResponse.value)
						? leaveResponse.value
						: leaveResponse.value.data || []
					: [];
			const totalCount =
				leaveResponse.status === 'fulfilled' ? leaveResponse.value.total || leaveData.length : 0;
			const totalPages = Math.ceil(totalCount / limit);

			// Process leave types
			const leaveTypes =
				leaveTypesResponse.status === 'fulfilled'
					? Array.isArray(leaveTypesResponse.value)
						? leaveTypesResponse.value
						: leaveTypesResponse.value.data || []
					: [];

			// Process personal leave stats
			const personalStats =
				leaveStatsResponse.status === 'fulfilled' && leaveStatsResponse.value
					? leaveStatsResponse.value
					: null;

			// Format leave requests for UI
			const formattedRequests = leaveData.map((request: any) => ({
				id: request.id || request.ID,
				employeeId: request.employeeId || request.employee_id || request.EmployeeId,
				employeeName:
					request.employeeName ||
					request.employee_name ||
					request.EmployeeName ||
					'Unknown Employee',
				leaveType: request.leaveType || request.leave_type || request.LeaveType || 'General Leave',
				startDate: request.startDate || request.start_date || request.StartDate,
				endDate: request.endDate || request.end_date || request.EndDate,
				days: request.days || request.Days || 1,
				reason: request.reason || request.Reason || '',
				status: request.status || request.Status || 'pending',
				appliedDate: request.appliedDate || request.applied_date || request.AppliedDate,
				approvedBy: request.approvedBy || request.approved_by || request.ApprovedBy,
				approvedByName: request.approvedByName || request.approved_by_name || 'N/A',
				approvedDate: request.approvedDate || request.approved_date || request.ApprovedDate,
				rejectedDate: request.rejectedDate || request.rejected_date || request.RejectedDate,
				comments: request.comments || request.Comments || '',
				createdAt: request.createdAt || request.created_at || request.CreatedAt,
				updatedAt: request.updatedAt || request.updated_at || request.UpdatedAt
			}));

			// Calculate stats
			const stats = {
				totalRequests: totalCount,
				approved: formattedRequests.filter((req) => req.status === 'approved').length,
				pending: formattedRequests.filter((req) => req.status === 'pending').length,
				rejected: formattedRequests.filter((req) => req.status === 'rejected').length,
				myAvailableLeave: personalStats?.availableLeave || 20,
				myUsedLeave: personalStats?.usedLeave || 5,
				myPendingRequests: personalStats?.pendingRequests || 0
			};

			// Format leave types
			const formattedLeaveTypes = leaveTypes.map((type: any) => ({
				id: type.id || type.ID,
				name: type.name || type.Name || 'General Leave',
				description: type.description || type.Description || '',
				maxDays: type.maxDays || type.max_days || type.MaxDays || 30,
				requiresApproval: type.requiresApproval ?? type.requires_approval ?? true
			}));

			const result = {
				leaveRequests: formattedRequests,
				totalCount,
				page,
				limit,
				totalPages,
				hasMore: page < totalPages,
				filters: { search, status, type },
				stats,
				leaveTypes: formattedLeaveTypes,
				currentUser: locals.user,
				isUsingMockData: false
			};

			// Cache the results
			apiCache.set(cacheKey, result, undefined, CACHE_TTL.MEDIUM);
			console.log(`🏖️ Cached ${formattedRequests.length} leave requests`);

			return result;
		} else {
			console.log('🔒 No auth token, using default data');
			return defaultData;
		}
	} catch (err: any) {
		console.error('❌ Error loading leave data:', err);
		// Return default data on error
		return defaultData;
	}
};
