// Notifications Center Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T032
// Purpose: Load user's notifications with server-side GraphQL queries

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { NotificationsOperations } from '$lib/graphql/notifications-operations';
import { createUrqlClient } from '$lib/graphql/client';
import type { NotificationCategory, NotificationType } from '$lib/graphql/types';

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
		const urqlClient = createUrqlClient(token);
		const notificationsOps = new NotificationsOperations(urqlClient);

		// Get query parameters for filtering
		const categoryFilter = url.searchParams.get('category') as NotificationCategory | null;
		const typeFilter = url.searchParams.get('type') as NotificationType | null;
		const readStatus = url.searchParams.get('read');
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '50');

		// Build filter for user's notifications
		const filter: any = {};

		if (categoryFilter) {
			filter.category = { equalTo: categoryFilter };
		}

		if (typeFilter) {
			filter.type = { equalTo: typeFilter };
		}

		if (readStatus !== null) {
			filter.readStatus = { equalTo: readStatus === 'true' };
		}

		// Fetch user's notifications
		const notificationsResult = await notificationsOps.getUserNotifications({
			recipientId: locals.user.id,
			first: limit,
			offset: (page - 1) * limit,
			filter,
			userCredentials
		});

		// Get unread count
		const unreadCount = await notificationsOps.getUnreadCount({
			recipientId: locals.user.id,
			userCredentials
		});

		return {
			notifications: notificationsResult.notifications,
			totalCount: notificationsResult.totalCount,
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
		console.error('Error loading notifications:', err);

		// Handle specific error cases
		if (err.message?.includes('unauthorized') || err.message?.includes('authentication')) {
			throw redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		throw error(500, {
			message: 'Failed to load notifications. Please try again later.'
		});
	}
};
