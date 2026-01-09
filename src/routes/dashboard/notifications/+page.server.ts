// Notifications Center Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T032
// Purpose: Load user's notifications with server-side GraphQL queries
// Updated: Migrated to Rust GraphQL backend

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/rbac-utils';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async (event) => {
	const { url, cookies } = event;

	// Check authentication (users can always view their own notifications)
	requireAuth(event, {});

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	try {
		// Get GraphQL endpoint
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Get query parameters for filtering
		const categoryFilter = url.searchParams.get('category');
		const typeFilter = url.searchParams.get('type');
		const readStatus = url.searchParams.get('read');
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '50');

		// Headers for session-based authentication (cookies sent automatically)
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		logger.info('[Notifications] Loading notifications for user', { userId: locals.user.id });

		// Fetch user's notifications using Rust GraphQL backend
		// Migration: ✅ Use idiomatic Rust pattern (fetch all, filter client-side)
		// Backend only supports userId, limit, offset - no type/category filtering
		const notificationsResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetUserNotifications($userId: UUID!, $limit: Int!, $offset: Int!) {
						notifications(userId: $userId, limit: $limit, offset: $offset) {
							id
							recipientId
							type
							category
							title
							message
							relatedResourceType
							relatedResourceId
							readStatus
							deliveredAt
							readAt
							createdAt
						}
					}
				`,
				variables: {
					userId: locals.user.id,
					limit: 1000, // Fetch large set for client-side filtering
					offset: 0
				}
			})
		});

		const notificationsData = await notificationsResponse.json();
		logger.info('[Notifications] Response received', { hasData: !!notificationsData });

		if (notificationsData.errors) {
			logger.error(
				'[Notifications] GraphQL errors',
				new Error(notificationsData.errors[0]?.message || 'GraphQL error'),
				{ errors: notificationsData.errors.map((e: any) => ({ message: e.message })) }
			);
			throw new Error(notificationsData.errors[0]?.message || 'Failed to load notifications');
		}

		let notifications = notificationsData?.data?.notifications || [];

		// Calculate unread count from all notifications (before filtering)
		const unreadCount = notifications.filter((n: any) => !n.readStatus).length;

		// Client-side filtering for category
		if (categoryFilter) {
			notifications = notifications.filter((n: any) => n.category === categoryFilter);
		}

		// Client-side filtering for type
		if (typeFilter) {
			notifications = notifications.filter((n: any) => n.type === typeFilter);
		}

		// Client-side filtering for read status
		if (readStatus === 'true') {
			notifications = notifications.filter((n: any) => n.readStatus === true);
		} else if (readStatus === 'false') {
			notifications = notifications.filter((n: any) => n.readStatus === false);
		}

		// Client-side pagination
		const totalCount = notifications.length;
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		notifications = notifications.slice(startIndex, endIndex);

		return {
			notifications,
			totalCount, // Total after filtering, before pagination
			unreadCount,
			currentPage: page,
			limit,
			hasNextPage: endIndex < totalCount,
			filters: {
				category: categoryFilter,
				type: typeFilter,
				readStatus
			},
			user: locals.user
		};
	} catch (err: any) {
		logger.error('[Notifications] Error loading notifications:', err as Error);

		// Handle specific error cases
		if (err.message?.includes('unauthorized') || err.message?.includes('authentication')) {
			redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		error(500, {
			message: 'Failed to load notifications. Please try again later.'
		});
	}
};
