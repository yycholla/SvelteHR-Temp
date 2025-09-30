// Reports Management Page - Server-Side Data Loading
// Simplified implementation with proper data structure

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const { locals, url } = event;

	// Verify user is authenticated
	if (!locals.user?.id) {
		throw error(401, 'Authentication required');
	}

	// Check if user has manager or admin role
	const hasManagerAccess = locals.roles?.includes('admin') || locals.roles?.includes('manager');
	if (!hasManagerAccess) {
		throw error(403, 'Manager or Admin role required');
	}

	// Extract search parameters for filtering
	const searchTerm = url.searchParams.get('search') || '';
	const typeFilter = url.searchParams.get('type') || '';
	const categoryFilter = url.searchParams.get('category') || '';
	const statusFilter = url.searchParams.get('status') || 'all';
	const departmentFilter = url.searchParams.get('department') || '';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);

	// Return proper data structure for the reports page
	// TODO: Replace with real GraphQL queries from reports-operations.ts
	return {
		user: {
			id: locals.user.id,
			email: locals.user.email || '',
			displayName: locals.user.display_name || 'User',
			role: locals.user.role || 'employee'
		},
		userSession: {
			userId: locals.user.id,
			userEmail: locals.user.email || '',
			role: locals.user.role || 'employee',
			accessToken: '' // Would be JWT token in real implementation
		},
		reports: [], // Would be fetched from PostGraphile hr_reports table
		totalReports: 0,
		reportAnalytics: {
			summary: {
				totalReports: 0,
				activeReports: 0,
				scheduledReports: 0,
				completedReports: 0,
				generatedToday: 0,
				generatedThisWeek: 0,
				generatedThisMonth: 0,
				mostPopularType: 'employee',
				avgRunTime: 0
			},
			typeBreakdown: [],
			categoryBreakdown: [],
			performanceMetrics: {
				successRate: 0,
				errorRate: 0
			}
		},
		filters: {
			searchTerm,
			typeFilter,
			categoryFilter,
			statusFilter,
			departmentFilter,
			page,
			limit
		},
		permissions: locals.permissions || [],
		canCreateReports: hasManagerAccess,
		canEditReports: hasManagerAccess,
		canRunReports: hasManagerAccess,
		canViewAnalytics: locals.roles?.includes('admin') || hasManagerAccess,
		loadedAt: new Date().toISOString()
	};
};
