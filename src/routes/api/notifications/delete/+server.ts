import { logger } from '$lib/utils/logger';
// Delete Notification API Endpoint
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	// Session-based authentication - user must be authenticated via hooks.server.ts
	if (!locals.user?.id) {
		logger.error('Delete notification: No authenticated user found in session');
		error(401, 'Authentication required');
	}

	const userId = locals.user.id;

	try {
		const { notificationId } = await request.json();

		if (!notificationId) {
			error(400, 'Notification ID is required');
		}

		// Create GraphQL client with session cookies for tower-sessions authentication
		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Delete notification mutation using Rust GraphQL schema
		const deleteNotificationMutation = `
			mutation DeleteNotification($id: UUID!) {
				deleteNotification(id: $id)
			}
		`;

		await graphqlClient.query(deleteNotificationMutation, {
			id: notificationId
		});

		return json({ success: true });
	} catch (err: any) {
		logger.error('Error deleting notification:', err as Error);
		error(500, {
			message: err.message || 'Failed to delete notification'
		});
	}
};
