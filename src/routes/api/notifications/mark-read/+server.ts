import { logger } from '$lib/utils/logger';
// API Route: Mark notification(s) as read
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	// Session-based authentication - user must be authenticated via hooks.server.ts
	if (!locals.user?.id) {
		logger.error('Mark-read: No authenticated user found in session');
		error(401, 'Authentication required');
	}

	const userId = locals.user.id;

	try {
		const { notificationIds } = await request.json();

		if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
			error(400, 'Invalid notification IDs');
		}

		// Create GraphQL client with session cookies for tower-sessions authentication
		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Mark each notification as read using Rust GraphQL schema
		const mutations = notificationIds.map(async (notificationId: string) => {
			const markAsReadMutation = `
				mutation MarkNotificationAsRead($id: UUID!, $input: UpdateNotificationInput!) {
					updateNotification(id: $id, input: $input) {
						id
						readStatus
						readAt
					}
				}
			`;

			return graphqlClient.query(markAsReadMutation, {
				id: notificationId,
				input: {
					readStatus: true
				}
			});
		});

		await Promise.all(mutations);

		return json({
			success: true,
			markedCount: notificationIds.length
		});
	} catch (err) {
		logger.error('Error marking notifications as read:', err as Error);
		error(500, 'Failed to mark notifications as read');
	}
};
