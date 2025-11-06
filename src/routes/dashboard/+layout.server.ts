// Dashboard Layout - Server-Side Data Loading
// Loads notifications and shared data for all dashboard pages

import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';

export const load: LayoutServerLoad = async ({ locals, cookies, url }) => {
	// Require authentication for all dashboard routes
	if (!locals.user?.id) {
		const redirectTo = url.pathname + url.search;
		redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	try {
		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Query for user's unread notifications only (limit to most recent 20)
		// Updated to use Rust GraphQL API idiomatic syntax (user_id, unread_only)
		const notificationsQuery = `
			query GetUserNotifications($userId: UUID!, $unreadOnly: Boolean) {
				notifications(
					userId: $userId,
					unreadOnly: $unreadOnly,
					limit: 20
				) {
					id
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
		`;

		const result = await graphqlClient.query(notificationsQuery, {
			userId: locals.user.id,
			unreadOnly: true
		});

		const notifications = result.data?.notifications || [];

		return {
			notifications: notifications.map((n: any) => ({
				id: n.id,
				title: n.title,
				message: n.message,
				type: n.type,
				isRead: n.readStatus,
				createdAt: n.createdAt,
				actionUrl: n.relatedResourceId
					? getActionUrl(n.relatedResourceType, n.relatedResourceId)
					: undefined
			}))
		};
	} catch (err) {
		console.error('Error loading notifications:', err);
		// Return empty notifications on error to prevent layout crash
		return {
			notifications: []
		};
	}
};

// Helper to generate action URLs based on resource type
function getActionUrl(resourceType: string | null, resourceId: string): string | undefined {
	if (!resourceType || !resourceId) return undefined;

	const urlMap: Record<string, string> = {
		task: `/dashboard/tasks/${resourceId}`,
		leave_request: `/dashboard/leave/requests/${resourceId}`,
		performance_review: `/dashboard/profile/performance/reviews/${resourceId}`,
		event: `/dashboard/events/${resourceId}`,
		user: `/dashboard/employees/${resourceId}`,
		department: `/dashboard/departments/${resourceId}`,
		goal: `/dashboard/profile/performance?goal=${resourceId}`,
		report: `/dashboard/reports/${resourceId}`
	};

	return urlMap[resourceType];
}
