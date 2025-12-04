// Delete Notification API Endpoint
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	// Session-based authentication - user must be authenticated via hooks.server.ts
	if (!locals.user?.id) {
		console.error('Delete notification: No authenticated user found in session');
		error(401, 'Authentication required');
	}

	const userId = locals.user.id;

	// Get session cookie for GraphQL client (handled by browser automatically)
	const authToken = cookies.get('hr_token') || cookies.get('auth-token');
	if (!authToken) {
		console.error('Delete notification: No session cookie found');
		error(401, 'Session cookie required');
	}

	try {
		const { notificationId } = await request.json();

		if (!notificationId) {
			error(400, 'Notification ID is required');
		}

		const graphqlClient = new GraphQLClient();
		graphqlClient.setToken(authToken);

		// Delete notification mutation
		const deleteNotificationMutation = `
			mutation DeleteNotification($notificationId: UUID!) {
				deleteNotificationById(input: { id: $notificationId }) {
					notification {
						id
					}
				}
			}
		`;

		await graphqlClient.query(deleteNotificationMutation, {
			notificationId
		});

		return json({ success: true });
	} catch (err: any) {
		console.error('Error deleting notification:', err);
		error(500, {
			message: err.message || 'Failed to delete notification'
		});
	}
};
