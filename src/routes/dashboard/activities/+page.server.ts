// My Activities Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T030
// Purpose: Load user's activity logs with server-side GraphQL queries

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { ActivityLogsOperations } from '$lib/graphql/activity-logs-operations';
import { createUrqlClient } from '$lib/graphql/client';
import type { ActivityAction, ResourceType } from '$lib/graphql/types';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	// Check authentication
	if (!locals.user) {
		throw redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	// Get user credentials for GraphQL operations
	const token = cookies.get('hr_token') || cookies.get('auth-token');
	if (!token) {
		throw redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	const userCredentials = {
		jwtToken: token,
		userId: locals.user.id,
		roles: locals.roles || [],
		permissions: locals.permissions || [],
		isAuthenticated: true,
		expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
	};

	try {
		// Initialize GraphQL client and operations
		// For server-side: createUrqlClient(fetchFn?, authToken?)
		const urqlClient = createUrqlClient(undefined, token);
		const activityOps = new ActivityLogsOperations(urqlClient);

		// Get query parameters for filtering
		const actionFilter = url.searchParams.get('action') as ActivityAction | null;
		const resourceTypeFilter = url.searchParams.get('resourceType') as ResourceType | null;
		const daysBack = parseInt(url.searchParams.get('days') || '30');
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '50');

		// Build filter for user's activities
		// PostGraphile's condition expects direct values, not wrapped in equalTo
		const filter: any = {};

		if (actionFilter) {
			filter.action = actionFilter;
		}

		if (resourceTypeFilter) {
			filter.resourceType = resourceTypeFilter;
		}

		// Note: PostGraphile date range filtering may require different approach
		// For now, we'll fetch all and filter server-side if needed
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - daysBack);

		// Fetch user's activities (RLS will filter to user's own activities)
		const activitiesResult = await activityOps.getUserActivities({
			employeeId: locals.user.id,
			first: limit,
			offset: (page - 1) * limit,
			filter,
			userCredentials
		});

		return {
			activities: activitiesResult.activities,
			totalCount: activitiesResult.totalCount,
			hasNextPage: activitiesResult.hasNextPage,
			currentPage: page,
			limit,
			filters: {
				action: actionFilter,
				resourceType: resourceTypeFilter,
				daysBack
			},
			user: locals.user
		};
	} catch (err: any) {
		console.error('Error loading activities:', err);

		// Handle specific error cases
		if (err.message?.includes('unauthorized') || err.message?.includes('authentication')) {
			throw redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		throw error(500, {
			message: 'Failed to load activity logs. Please try again later.'
		});
	}
};
