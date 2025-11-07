// Notifications Center Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T032
// Purpose: Load user's notifications with server-side GraphQL queries
// Updated: Migrated to Rust GraphQL backend

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies } = event;

	// Check authentication (users can always view their own notifications)
	requireAuth(event, {});

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

		console.log('[Notifications] Loading notifications for user:', locals.user.id);

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
		console.log('[Notifications] Response:', notificationsData);

		if (notificationsData.errors) {
			console.error('[Notifications] GraphQL errors:', notificationsData.errors);
			throw new Error(notificationsData.errors[0]?.message || 'Failed to load notifications');
		}

		let notifications = notificationsData?.data?.notifications || [];

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

		// Fetch unread count
		const unreadCountResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetUnreadCount($recipientId: UUID) {
						unreadNotificationsCount(recipientId: $recipientId)
					}
				`,
				variables: {
					recipientId: locals.user.id
				}
			})
		});

		const unreadCountData = await unreadCountResponse.json();
		const unreadCount = unreadCountData?.data?.unreadNotificationsCount || 0;

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
		console.error('[Notifications] Error loading notifications:', err);

		// Handle specific error cases
		if (err.message?.includes('unauthorized') || err.message?.includes('authentication')) {
			redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		error(500, {
        			message: 'Failed to load notifications. Please try again later.'
        		});
	}
};
