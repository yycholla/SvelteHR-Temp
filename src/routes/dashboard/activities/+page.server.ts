// My Activities Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T030
// Purpose: Load user's activity logs with server-side GraphQL queries
// Updated: Migrated to Rust GraphQL backend

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	// Check authentication
	if (!locals.user) {
		throw redirect(303, `/login?redirectTo=${url.pathname}`);
	}

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

		console.log('[Activities] Loading activities for user:', locals.user.id);

		// Fetch user's activity logs using Rust GraphQL backend
		// NOTE: Query updated to match Rust GraphQL schema (idiomatic naming)
		// Note: activityLogsByUser only supports limit, not offset (no pagination)
		const activitiesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetUserActivities($userId: UUID!, $limit: Int) {
						activityLogsByUser(
							userId: $userId
							limit: $limit
						) {
							id
							userId
							employeeId
							action
							resourceType
							resourceId
							details
							createdAt
							user {
								id
								displayName
								email
							}
						}
					}
				`,
				variables: {
					userId: locals.user.id,
					limit: limit
				}
			})
		});

		const activitiesData = await activitiesResponse.json();
		console.log('[Activities] Response:', activitiesData);

		if (activitiesData.errors) {
			console.error('[Activities] GraphQL errors:', activitiesData.errors);
			throw new Error(activitiesData.errors[0]?.message || 'Failed to load activities');
		}

		const activities = activitiesData?.data?.activityLogsByUser || [];

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
		console.error('[Activities] Error loading activities:', err);

		// Handle specific error cases
		if (err.message?.includes('unauthorized') || err.message?.includes('authentication')) {
			throw redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		throw error(500, {
			message: 'Failed to load activity logs. Please try again later.'
		});
	}
};
