// Dashboard Layout - Server-Side Data Loading
// Loads notifications and shared data for all dashboard pages

import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';

export const load: LayoutServerLoad = async ({ locals, cookies, url, parent }) => {
	// Require authentication for all dashboard routes
	if (!locals.user?.id) {
		const redirectTo = url.pathname + url.search;
		redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	// Get data from parent layout (includes permissions, roles, user)
	const parentData = await parent();

	try {
		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Query for user's unread notifications and system settings (limit to most recent 20)
		// Updated to use Rust GraphQL API idiomatic syntax (user_id, unread_only)
		const dashboardQuery = `
			query GetDashboardData($userId: UUID!, $unreadOnly: Boolean, $category: String!) {
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
				systemSettingsByCategory(category: $category) {
					settings
				}
			}
		`;

		const result = await graphqlClient.query(dashboardQuery, {
			userId: locals.user.id,
			unreadOnly: true,
			category: 'application'
		});

		const notifications = result.data?.notifications || [];

		// Extract system name from settings
		let systemName = 'MountainHR'; // Default fallback
		try {
			const appSettings = result.data?.systemSettingsByCategory?.settings;
			if (appSettings) {
				const parsed = typeof appSettings === 'string' ? JSON.parse(appSettings) : appSettings;
				systemName = parsed.systemName || systemName;
			}
		} catch (err) {
			logger.error('Error parsing system settings:', err as Error);
		}

		return {
			// Pass through parent data (permissions, roles, user)
			...parentData,
			// Add notifications
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
			})),
			// Add system name
			systemName
		};
	} catch (err) {
		logger.error('Error loading dashboard data:', err as Error);
		// Return parent data with empty notifications and default system name on error
		return {
			...parentData,
			notifications: [],
			systemName: 'MountainHR'
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
