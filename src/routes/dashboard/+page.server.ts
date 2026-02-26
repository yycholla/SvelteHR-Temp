// Dashboard Overview - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries with backend initialization

import type { PageServerLoad } from './$types';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { QueryParamExtractor } from '$lib/server/route-helpers';
import { ensureBackendReady } from '$lib/server/backend-init';
import { logger } from '$lib/utils/logger';
import { fetchDashboardData } from '$lib/server/dashboard/dashboard-service';

export const load: PageServerLoad = async (event) => {
	// Initialize RBAC loader (no specific permissions required for dashboard, just auth)
	const loader = new RBACDataLoader(event, []);

	return loader.loadWithClient(async (client) => {
		const { locals, url } = event;
		if (!locals.user) return {}; // Should be handled by RBACDataLoader/requireAuth but for TS safety

		// CRITICAL: Prevent browser-level caching of dashboard data
		event.setHeaders({
			'Cache-Control': 'private, no-cache, no-store, must-revalidate',
			Pragma: 'no-cache',
			Expires: '0'
		});

		// Get standardized user permissions (computed by loader)
		const userPerms = loader['permissions'];

		// Get user ID safely
		const userId = locals.user.id;

		// Fetch weather data from wttr.in as a promise (non-blocking)
		const weatherPromise = fetch('https://wttr.in/Boise?format=3', {
			headers: { 'User-Agent': 'SvelteHR-Dashboard' }
		})
			.then((response) => (response.ok ? response.text() : null))
			.catch((err) => {
				logger.warn('Failed to fetch weather', { error: err });
				return null;
			});

		// Extract URL parameters
		const params = new QueryParamExtractor(url);
		const selectedPeriod = params.getString('period', 'week');
		const viewMode = params.getString('view', 'overview');

		try {
			// Check backend services are ready before proceeding
			const backendReady = await ensureBackendReady();

			// If backend is not ready, return error state but don't crash
			if (!backendReady) {
				logger.warn('Backend not ready for main dashboard');
				return {
					user: {
						id: userId,
						email: locals.user.email || '',
						displayName: locals.user.display_name || 'User',
						roles: locals.roles || [],
						firstName: locals.user.first_name,
						lastName: locals.user.last_name
					},
					userSession: {
						userId,
						userEmail: locals.user.email || '',
						roles: locals.roles || [],
						accessToken: ''
					},
					dashboardData: {
						metrics: {
							attendanceRate: 0,
							pendingRequests: 0,
							taskCount: 0,
							remainingVacationDays: 0
						},
						activities: [],
						tasks: [],
						events: []
					},
					dashboardMetrics: [],
					recentActivities: [],
					upcomingEvents: [],
					quickActions: [],
					preferences: {
						selectedPeriod,
						viewMode,
						theme: 'light',
						showWelcome: true
					},
					userPerms,
					canManageUsers: false,
					canViewReports: false,
					canApproveLeave: false,
					weatherPromise,
					error: {
						message: 'Backend services are initializing. Please try again in a moment.',
						details: 'Backend initialization in progress',
						retryable: true
					}
				};
			}

			// Determine user roles for conditional queries
			const userRoles = (locals.roles || []).map((r: string) => r.toLowerCase().replace(/[\s-]+/g,'_'));
			const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin') || false;
			const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes('admin') || false;
			const isManager = userRoles.includes('manager') || userRoles.includes('hr_manager') || false;
			const isHR = userRoles.includes('hr_manager') || false;

			// Fetch data via service
			const { users, departments, dashboardDataPromise } = await fetchDashboardData({
				client,
				userId,
				userRoles,
				isAdmin,
				isSuperAdmin,
				isManager
			});

			return {
				user: {
					id: userId,
					email: locals.user.email || '',
					displayName:
						locals.user.display_name ||
						`${locals.user.first_name || ''} ${locals.user.last_name || ''}`.trim() ||
						'User',
					roles: userRoles,
					firstName: locals.user.first_name,
					lastName: locals.user.last_name
				},
				userSession: {
					userId,
					userEmail: locals.user.email || '',
					roles: userRoles,
					accessToken: ''
				},
				preferences: {
					selectedPeriod,
					viewMode,
					theme: 'light',
					showWelcome: true
				},
				userPerms,
				canManageUsers: isAdmin || isHR,
				canViewReports: isAdmin || isHR || isManager,
				canApproveLeave: isAdmin || isHR || isManager,
				isAdmin,
				isSuperAdmin,
				weatherPromise,
				dashboardDataPromise
			};
		} catch (err) {
			logger.error('Error loading dashboard', err instanceof Error ? err : new Error(String(err)));

			return {
				user: {
					id: userId,
					email: locals.user.email || '',
					displayName: locals.user.display_name || 'User',
					roles: locals.roles || [],
					firstName: locals.user.first_name,
					lastName: locals.user.last_name
				},
				userSession: {
					userId,
					userEmail: locals.user.email || '',
					roles: locals.roles || [],
					accessToken: ''
				},
				dashboardData: {
					metrics: {
						attendanceRate: 0,
						pendingRequests: 0,
						taskCount: 0,
						remainingVacationDays: 0
					},
					activities: [],
					tasks: [],
					events: []
				},
				dashboardMetrics: [],
				recentActivities: [],
				upcomingEvents: [],
				quickActions: [],
				preferences: {
					selectedPeriod: 'week',
					viewMode: 'overview',
					theme: 'light',
					showWelcome: true
				},
				userPerms,
				canManageUsers: false,
				canViewReports: false,
				canApproveLeave: false,
				weatherPromise,
				error: {
					message: 'Unable to load dashboard. Please try again later.',
					details: err instanceof Error ? err.message : 'Unknown error',
					retryable: true
				}
			};
		}
	});
};
