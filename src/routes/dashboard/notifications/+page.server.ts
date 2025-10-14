// Notifications Center Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T032
// Purpose: Load user's notifications with server-side GraphQL queries
// Updated: Migrated to Rust GraphQL backend

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';

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

		// Headers with JWT authentication for Rust GraphQL server
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${token}`
		};

		console.log('[Notifications] Loading notifications for user:', locals.user.id);

		// Fetch user's notifications using Rust GraphQL backend
		// NOTE: Query updated to match Rust GraphQL schema (idiomatic naming)
		// NOTE: Rust uses lowercase for enum values: "info", "task_assigned", etc.
		const notificationsResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetUserNotifications(
						$recipientId: UUID
						$readStatus: Boolean
						$notificationType: NotificationType
						$category: NotificationCategory
						$limit: Int
						$offset: Int
					) {
						notifications(
							recipientId: $recipientId
							readStatus: $readStatus
							notificationType: $notificationType
							category: $category
							limit: $limit
							offset: $offset
						) {
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
					recipientId: locals.user.id,
					readStatus: readStatus ? readStatus === 'true' : null,
					notificationType: typeFilter || null,
					category: categoryFilter || null,
					limit: limit,
					offset: (page - 1) * limit
				}
			})
		});

		const notificationsData = await notificationsResponse.json();
		console.log('[Notifications] Response:', notificationsData);

		if (notificationsData.errors) {
			console.error('[Notifications] GraphQL errors:', notificationsData.errors);
			throw new Error(notificationsData.errors[0]?.message || 'Failed to load notifications');
		}

		const notifications = notificationsData?.data?.notifications || [];

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
			totalCount: notifications.length,
			unreadCount,
			currentPage: page,
			limit,
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
			throw redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		throw error(500, {
			message: 'Failed to load notifications. Please try again later.'
		});
	}
};
