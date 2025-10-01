// Reports Management Page - Server-Side Data Loading with GraphQL
// Feature: 016-repair-management-pages - GraphQL integration

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { createUrqlClient } from '$lib/graphql/client';
import {
	GET_HR_REPORTS,
	GET_REPORT_ANALYTICS,
	buildHrReportFilter,
	calculateReportAnalytics
} from '$lib/graphql/reports-operations';

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies } = event;

	// Verify user is authenticated
	if (!locals.user?.id) {
		throw error(401, 'Authentication required');
	}

	// Check if user has manager or admin role
	const hasManagerAccess = locals.roles?.includes('admin') || locals.roles?.includes('manager');
	if (!hasManagerAccess) {
		throw error(403, 'Manager or Admin role required');
	}

	// Get JWT token from cookies for PostGraphile authentication
	const jwtToken = cookies.get('postgraphile-jwt-token') || cookies.get('hr_token') || '';

	// Create server-side GraphQL client with auth token
	const graphqlClient = createUrqlClient(fetch, jwtToken);

	// Extract search parameters for filtering
	const searchTerm = url.searchParams.get('search') || '';
	const typeFilter = url.searchParams.get('type') || '';
	const categoryFilter = url.searchParams.get('category') || '';
	const statusFilter = url.searchParams.get('status') || '';
	const departmentFilter = url.searchParams.get('department') || '';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);
	const offset = (page - 1) * limit;

	try {
		// Build GraphQL filter from URL parameters
		const filter = buildHrReportFilter({
			status: statusFilter ? (statusFilter as any) : undefined,
			reportType: typeFilter || undefined,
			category: categoryFilter || undefined,
			searchTerm: searchTerm || undefined,
			departmentId: departmentFilter || locals.user.department_id || undefined
		});

		// Fetch HR reports with pagination
		const reportsResult = await graphqlClient
			.query(GET_HR_REPORTS, {
				first: limit,
				offset,
				filter,
				orderBy: ['CREATED_AT_DESC']
			})
			.toPromise();

		if (reportsResult.error) {
			console.error('GraphQL Error fetching reports:', reportsResult.error);
			throw error(500, 'Failed to load reports data');
		}

		// Fetch report analytics
		const analyticsResult = await graphqlClient
			.query(GET_REPORT_ANALYTICS, {
				departmentId: locals.user.department_id || ''
			})
			.toPromise();

		if (analyticsResult.error) {
			console.error('GraphQL Error fetching analytics:', analyticsResult.error);
			// Don't fail the page load if analytics fail, just use empty data
		}

		// Extract reports data
		const reports = reportsResult.data?.hrReports?.nodes || [];
		const totalReports = reportsResult.data?.hrReports?.totalCount || 0;

		// Calculate analytics from query data
		const analytics = analyticsResult.data
			? calculateReportAnalytics(analyticsResult.data)
			: {
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
			  };

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
				accessToken: jwtToken
			},
			reports,
			totalReports,
			reportAnalytics: analytics,
			filters: {
				searchTerm,
				typeFilter,
				categoryFilter,
				statusFilter,
				departmentFilter,
				page,
				limit
			},
			pagination: {
				currentPage: page,
				limit,
				totalPages: Math.ceil(totalReports / limit),
				hasNextPage: reportsResult.data?.hrReports?.pageInfo?.hasNextPage || false,
				hasPreviousPage: page > 1
			},
			permissions: locals.permissions || [],
			canCreateReports: hasManagerAccess,
			canEditReports: hasManagerAccess,
			canRunReports: hasManagerAccess,
			canViewAnalytics: locals.roles?.includes('admin') || hasManagerAccess,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('Error loading reports data:', err);
		throw error(500, 'Failed to load reports data. Please try again later.');
	}
};
