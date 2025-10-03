// Delete Notification API Endpoint
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { decodeJWTTokenUnsafe } from '$lib/auth/jwt-utils';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	// Get auth token
	const authToken = cookies.get('hr_token') || cookies.get('auth-token');
	if (!authToken) {
		console.error('Delete notification: No authentication token found');
		throw error(401, 'No authentication token');
	}

	// Manually verify token if locals.user is not set
	let userId = locals.user?.id;
	if (!userId) {
		try {
			const payload = await decodeJWTTokenUnsafe(authToken);
			const userIdFromToken = payload?.user_id || payload?.userId;
			if (!payload || !userIdFromToken) {
				console.error('Delete notification: Invalid token payload - no user_id found');
				throw error(401, 'Invalid authentication token');
			}

			// Check expiration
			const currentTime = Math.floor(Date.now() / 1000);
			if (payload.exp && payload.exp < currentTime) {
				console.error('Delete notification: Token expired');
				throw error(401, 'Token expired');
			}

			userId = userIdFromToken;
		} catch (err) {
			console.error('Delete notification: Token validation failed:', err);
			throw error(401, 'Authentication failed');
		}
	}

	try {
		const { notificationId } = await request.json();

		if (!notificationId) {
			throw error(400, 'Notification ID is required');
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
		throw error(500, {
			message: err.message || 'Failed to delete notification'
		});
	}
};
