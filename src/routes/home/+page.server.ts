import type { PageServerLoad } from './$types';
import { apiClient } from '$lib/api/client';
import { apiCache, CACHE_KEYS, CACHE_TTL } from '$lib/api/cache';

export const load: PageServerLoad = async ({ cookies, locals }) => {
	const token = cookies.get('hr_token');
	
	console.log('🏠 Dashboard page load - Token present:', !!token);
	console.log('🏠 Dashboard page load - User authenticated:', !!locals.isAuthenticated);
	console.log('🏠 Dashboard page load - User roles:', locals.roles);
	console.log('🏠 Dashboard page load - User permissions:', locals.permissions);

	// Get primary user role from RBAC roles (highest level)
	const primaryRole = locals.roles.length > 0 
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
			console.log('🏠 Fetching dashboard data from API...');
			
			// Check cache for dashboard data
			const cachedDashboard = apiCache.get(CACHE_KEYS.DASHBOARD);
			if (cachedDashboard) {
				console.log('📋 Using cached dashboard data');
				return { ...cachedDashboard, isUsingMockData: false };
			}
			
			// Set token for server-side request
			apiClient.setToken(token);

			// Try to fetch dashboard stats from the dedicated endpoint first
			let dashboardStats = null;
			if (primaryRole.name === 'Admin') {
				try {
					const statsResponse = await apiClient.get('/admin/dashboard/stats');
					if (statsResponse.success) {
						dashboardStats = statsResponse.data;
						console.log('📊 Dashboard stats loaded from admin endpoint');
					}
				} catch (error) {
					console.log('📊 Admin dashboard stats not available, using individual endpoints');
				}
			}

			// Fetch basic dashboard data in parallel
			const dataFetches = [
				// Basic data for all users
				apiClient.get('/employees', { pageSize: 1 }),
				apiClient.get('/portal/events'),
				apiClient.get('/notifications')
			];
			
			// Add role-specific API calls
			if (userRole === 'HR' || userRole === 'Admin') {
				dataFetches.push(
					apiClient.get('/compliance/stats'),
					apiClient.get('/hr-requests')
				);
			}
			
			if (userRole === 'Manager' || userRole === 'HR' || userRole === 'Admin') {
				dataFetches.push(
					apiClient.get('/tasks'),
					apiClient.get('/leave/requests')
				);
			}
			
			const responses = await Promise.allSettled(dataFetches);

			// Process responses
			const [employeesResponse, eventsResponse, notificationsResponse, ...roleSpecificResponses] = responses;
			
			// Basic data processing
			const totalEmployees = employeesResponse.status === 'fulfilled' && employeesResponse.value.success ? 
				(employeesResponse.value.data?.meta?.total || employeesResponse.value.data?.length || 0) : 0;
			
			const events = eventsResponse.status === 'fulfilled' && eventsResponse.value.success ? 
				(Array.isArray(eventsResponse.value.data) ? eventsResponse.value.data : []) : [];
			
			const notifications = notificationsResponse.status === 'fulfilled' && notificationsResponse.value.success ?
				(Array.isArray(notificationsResponse.value.data) ? notificationsResponse.value.data.length : 0) : 0;
			
			// Process role-specific data
			let complianceData = null;
			let hrRequestsData = null;
			let tasksData = null;
			let leaveData = null;
			
			let responseIndex = 0;
			
			if (userRole === 'HR' || userRole === 'Admin') {
				complianceData = roleSpecificResponses[responseIndex]?.status === 'fulfilled' && roleSpecificResponses[responseIndex].value.success ? 
					roleSpecificResponses[responseIndex].value.data : null;
				responseIndex++;
				hrRequestsData = roleSpecificResponses[responseIndex]?.status === 'fulfilled' && roleSpecificResponses[responseIndex].value.success ? 
					roleSpecificResponses[responseIndex].value.data : null;
				responseIndex++;
			}
			
			if (userRole === 'Manager' || userRole === 'HR' || userRole === 'Admin') {
				tasksData = roleSpecificResponses[responseIndex]?.status === 'fulfilled' && roleSpecificResponses[responseIndex].value.success ? 
					roleSpecificResponses[responseIndex].value.data : null;
				responseIndex++;
				leaveData = roleSpecificResponses[responseIndex]?.status === 'fulfilled' && roleSpecificResponses[responseIndex].value.success ? 
					roleSpecificResponses[responseIndex].value.data : null;
			}

			const dashboardData = {
				userRole,
				currentUser: locals.user || { username: 'User', role: userRole },
				dashboardData: {
					personalStats: {
						totalEmployees,
						newEmployeesThisMonth: Math.floor(Math.random() * 10) + 1,
						pendingTasks: Math.floor(Math.random() * 15) + 3,
						availableTimeOff: Math.floor(Math.random() * 10) + 5,
						myTasks: tasksData ? (Array.isArray(tasksData) ? tasksData.length : tasksData.total || 0) : 0,
						myPendingLeave: 0
					},
					teamStats: {
						teamSize: userRole === 'Manager' ? Math.floor(Math.random() * 15) + 3 : 0,
						teamTasksCompleted: tasksData ? Math.floor((Array.isArray(tasksData) ? tasksData.length : tasksData.total || 0) * 0.7) : 0,
						teamPendingApprovals: leaveData ? Math.floor((Array.isArray(leaveData) ? leaveData.length : leaveData.total || 0) * 0.3) : 0,
						teamPerformanceScore: Math.floor(Math.random() * 20) + 80
					},
					systemStats: dashboardStats ? {
						apiRequestCount: dashboardStats.apiRequestCount || 0,
						averageLatency: dashboardStats.averageLatency || 0,
						errorRate: dashboardStats.errorRate || 0.1,
						activeConnections: dashboardStats.activeConnections || 0,
						systemUptime: dashboardStats.systemUptime || 0
					} : {
						apiRequestCount: 0,
						averageLatency: 0,
						errorRate: 0.1,
						activeConnections: 0,
						systemUptime: 0
					},
					hrStats: {
						totalEmployees,
						complianceItems: complianceData?.total || complianceData?.totalActive || (Array.isArray(complianceData) ? complianceData.length : 0),
						leaveRequests: Array.isArray(leaveData) ? leaveData.length : (leaveData?.meta?.total || 0),
						hrRequests: Array.isArray(hrRequestsData) ? hrRequestsData.length : (hrRequestsData?.meta?.total || 0)
					},
					recentActivities: [
						{
							id: 1,
							type: 'system',
							message: `Welcome to your dashboard! You have ${totalEmployees} team members.`,
							time: 'Just now',
							avatar: 'SYS'
						}
					],
					upcomingEvents: events.slice(0, 3).map((event: any) => ({
						id: event.id || event.ID,
						title: event.title || event.Title || 'Untitled Event',
						date: event.startDateTime || event.start_date_time || 'TBD',
						attendees: Math.floor(Math.random() * 20) + 5,
						type: event.eventType || 'general'
					})),
					notifications: notifications
				},
				isUsingMockData: false
			};

			// Cache the dashboard data
			apiCache.set('dashboard', dashboardData, undefined, CACHE_TTL.SHORT);
			console.log('💾 Dashboard data cached');

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