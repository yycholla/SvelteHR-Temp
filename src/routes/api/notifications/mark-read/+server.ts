// API Route: Mark notification(s) as read
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { decodeJWTTokenUnsafe } from '$lib/auth/jwt-utils';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	// Get auth token
	const authToken = cookies.get('hr_token') || cookies.get('auth-token');
	if (!authToken) {
		console.error('Mark-read: No authentication token found');
		throw error(401, 'Authentication required');
	}

	// Verify user authentication
	let userId = locals.user?.id;
	if (!userId) {
		try {
			const payload = await decodeJWTTokenUnsafe(authToken);
			const userIdFromToken = payload?.user_id || payload?.userId;
			if (!payload || !userIdFromToken) {
				throw error(401, 'Invalid authentication token');
			}

			// Check expiration
			const currentTime = Math.floor(Date.now() / 1000);
			if (payload.exp && payload.exp < currentTime) {
				throw error(401, 'Token expired');
			}

			userId = userIdFromToken;
		} catch (err) {
			console.error('Mark-read: Token validation failed:', err);
			throw error(401, 'Authentication failed');
		}
	}

	try {
		const { notificationIds } = await request.json();

		if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
			throw error(400, 'Invalid notification IDs');
		}

		const graphqlClient = new GraphQLClient();
		graphqlClient.setToken(authToken);

		// Mark each notification as read
		const currentTime = new Date().toISOString();
		const mutations = notificationIds.map(async (notificationId: string) => {
			const markAsReadMutation = `
				mutation MarkNotificationAsRead($notificationId: UUID!, $readAt: Datetime!) {
					updateNotificationById(
						input: {
							id: $notificationId
							notificationPatch: {
								readStatus: true
								readAt: $readAt
							}
						}
					) {
						notification {
							id
							readStatus
							readAt
						}
					}
				}
			`;

			return graphqlClient.query(markAsReadMutation, {
				notificationId,
				readAt: currentTime
			});
		});

		await Promise.all(mutations);

		return json({
			success: true,
			markedCount: notificationIds.length
		});
	} catch (err) {
		console.error('Error marking notifications as read:', err);
		throw error(500, 'Failed to mark notifications as read');
	}
};
