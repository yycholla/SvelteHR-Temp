// API Route: Mark notification(s) as read
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	// Session-based authentication - user must be authenticated via hooks.server.ts
	if (!locals.user?.id) {
		console.error('Mark-read: No authenticated user found in session');
		error(401, 'Authentication required');
	}

	const userId = locals.user.id;

	// Get session cookie for GraphQL client (handled by browser automatically)
	const authToken = cookies.get('hr_token') || cookies.get('auth-token');
	if (!authToken) {
		console.error('Mark-read: No session cookie found');
		error(401, 'Session cookie required');
	}

	try {
		const { notificationIds } = await request.json();

		if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
			error(400, 'Invalid notification IDs');
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
		error(500, 'Failed to mark notifications as read');
	}
};
