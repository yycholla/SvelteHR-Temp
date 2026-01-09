// My Activities Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T030
// Purpose: Load user's activity logs with server-side GraphQL queries
// Updated: Migrated to Rust GraphQL backend

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/rbac-utils';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async (event) => {
	const { url, cookies } = event;

	// Check authentication and permissions
	requireAuth(event, {
		requiredPermissions: ['activities:read:self']
	});

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	try {
		// Get GraphQL endpoint
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Get query parameters for filtering
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '50');

		// Headers for session-based authentication (cookies sent automatically)
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		logger.info('[Activities] Loading activities for user', { userId: locals.user.id });

		// Fetch user's activity logs using Rust GraphQL backend
		// Migration: ✅ Use idiomatic Rust pattern (activityLogs with userId parameter)
		const activitiesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetUserActivities($userId: UUID!, $limit: Int!, $offset: Int!) {
						activityLogs(userId: $userId, limit: $limit, offset: $offset) {
							id
							userId
							employeeId
							action
							resourceType
							resourceId
							details
							createdAt
							employee {
								id
								displayName
								email
							}
						}
					}
				`,
				variables: {
					userId: locals.user.id,
					limit,
					offset: (page - 1) * limit
				}
			})
		});

		const activitiesData = await activitiesResponse.json();
		logger.info('[Activities] Response', { activitiesData });

		if (activitiesData.errors) {
			logger.error('[Activities] GraphQL errors', new Error('GraphQL errors'), {
				errors: activitiesData.errors
			});
			throw new Error(activitiesData.errors[0]?.message || 'Failed to load activities');
		}

		const activities = activitiesData?.data?.activityLogs || [];

		return {
			activities,
			totalCount: activities.length,
			hasNextPage: activities.length === limit,
			currentPage: page,
			limit,
			filters: {
				action: null,
				resourceType: null,
				daysBack: 30
			},
			user: locals.user
		};
	} catch (err: any) {
		logger.error('[Activities] Error loading activities', err as Error);

		// Handle specific error cases
		if (err.message?.includes('unauthorized') || err.message?.includes('authentication')) {
			redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		error(500, {
			message: 'Failed to load activity logs. Please try again later.'
		});
	}
};
