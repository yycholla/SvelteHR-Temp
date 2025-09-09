import type { PageServerLoad } from './$types';
import { dashboardOperations, employeeOperations } from '$lib/graphql/client';
import { apiCache, CACHE_KEYS, CACHE_TTL } from '$lib/api/cache';

export const load: PageServerLoad = async ({ cookies, locals }) => {
	const token = cookies.get('hr_token');

	console.log('🏠 Dashboard page load - Token present:', !!token);
	console.log('🏠 Dashboard page load - User authenticated:', !!locals.isAuthenticated);
	console.log('🏠 Dashboard page load - User roles:', locals.roles);
	console.log('🏠 Dashboard page load - User permissions:', locals.permissions);

	// Get primary user role from RBAC roles (highest level)
	const primaryRole =
		locals.roles.length > 0
			? locals.roles.sort((a, b) => (b.level || 0) - (a.level || 0))[0]
			: { name: 'Employee', level: 0 };

	console.log('🏠 Dashboard page load - Primary role:', primaryRole.name);

	// Default dashboard data structure with enhanced metrics
	const defaultData = {
		userRole: primaryRole.name,
		currentUser: locals.user || { username: 'User', full_name: 'User' },
		roles: locals.roles,
		permissions: locals.permissions,
		dashboardData: {
			// Personal stats
			personalStats: {
				totalEmployees: 0,
				newEmployeesThisMonth: 0,
				pendingTasks: 0,
				availableTimeOff: 0,
				myTasks: 0,
				myPendingLeave: 0
			},
			// Team stats (for managers)
			teamStats: {
				teamSize: 0,
				teamTasksCompleted: 0,
				teamPendingApprovals: 0,
				teamPerformanceScore: 0
			},
			// System stats (for admins)
			systemStats: {
				apiRequestCount: 0,
				averageLatency: 0,
				errorRate: 0,
				activeConnections: 0,
				systemUptime: 0
			},
			// HR stats
			hrStats: {
				totalEmployees: 0,
				complianceItems: 0,
				leaveRequests: 0,
				hrRequests: 0
			},
			// Notifications and activities
			recentActivities: [],
			upcomingEvents: [],
			notifications: []
		},
		isUsingMockData: true
	};

	try {
		if (token) {
			console.log('🏠 Fetching dashboard data from GraphQL...');

			// Check cache for dashboard data
			const cachedDashboard = apiCache.get(CACHE_KEYS.DASHBOARD);
			if (cachedDashboard) {
				console.log('📋 Using cached dashboard data');
				return { ...cachedDashboard, isUsingMockData: false };
			}

			// Fetch dashboard data using GraphQL
			const dashboardStatsResponse = await dashboardOperations.getDashboardStats(primaryRole.name);
			
			if (dashboardStatsResponse.errors) {
				console.error('❌ GraphQL dashboard stats error:', dashboardStatsResponse.errors);
				// Fall back to default data if GraphQL fails
				return defaultData;
			}

			const dashboardStats = dashboardStatsResponse.data?.dashboardStats;
			if (!dashboardStats) {
				console.warn('⚠️ No dashboard stats returned from GraphQL');
				return defaultData;
			}

			const dashboardData = {
				userRole: primaryRole.name,
				currentUser: locals.user || { username: 'User', full_name: 'User' },
				roles: locals.roles,
				permissions: locals.permissions,
				dashboardData: dashboardStats,
				isUsingMockData: false
			};

			// Cache the dashboard data
			apiCache.set('dashboard', dashboardData, undefined, CACHE_TTL.SHORT);
			console.log('💾 GraphQL dashboard data cached');

			return dashboardData;
		} else {
			console.log('🔒 No auth token, using default data');
			return defaultData;
		}
	} catch (err: any) {
		console.error('❌ Error loading dashboard data:', err);
		// Return default data on error
		return defaultData;
	}
};
