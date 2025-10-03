// SSE endpoint for real-time notification updates
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { decodeJWTTokenUnsafe } from '$lib/auth/jwt-utils';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	// Get auth token
	const authToken = cookies.get('hr_token') || cookies.get('auth-token');
	if (!authToken) {
		console.error('SSE: No authentication token found');
		throw error(401, 'No authentication token');
	}

	// Manually verify token if locals.user is not set
	let userId = locals.user?.id;
	if (!userId) {
		try {
			const payload = await decodeJWTTokenUnsafe(authToken);
			console.log('🔍 SSE decoded payload:', payload);

			// JWT uses user_id (snake_case), not userId (camelCase)
			const userIdFromToken = payload?.user_id || payload?.userId;
			if (!payload || !userIdFromToken) {
				console.error('SSE: Invalid token payload - no user_id found');
				throw error(401, 'Invalid authentication token');
			}

			// Check expiration
			const currentTime = Math.floor(Date.now() / 1000);
			if (payload.exp && payload.exp < currentTime) {
				console.error('SSE: Token expired');
				throw error(401, 'Token expired');
			}

			userId = userIdFromToken;
			console.log('✅ SSE: Authenticated user:', userId);
		} catch (err) {
			console.error('SSE: Token validation failed:', err);
			throw error(401, 'Authentication failed');
		}
	}

	// Create GraphQL client with token
	const graphqlClient = new GraphQLClient();
	graphqlClient.setToken(authToken);

	// Create a readable stream for SSE
	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			let intervalId: NodeJS.Timeout | null = null;
			let isClosed = false;

			// Function to send SSE message safely
			const sendEvent = (data: any) => {
				if (isClosed) return;
				try {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
				} catch (err) {
					console.error('Error sending SSE event:', err);
					isClosed = true;
				}
			};

			// Send initial connection success
			sendEvent({ type: 'connected', userId });

			// Poll for new notifications every 5 seconds
			intervalId = setInterval(async () => {
				if (isClosed) {
					if (intervalId) clearInterval(intervalId);
					return;
				}

				try {
					const notificationsQuery = `
						query GetUserNotifications($recipientId: UUID!) {
							allNotifications(
								condition: { recipientId: $recipientId, readStatus: false }
								orderBy: [CREATED_AT_DESC]
								first: 20
							) {
								totalCount
								nodes {
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
						}
					`;

					const result = await graphqlClient.query(notificationsQuery, {
						recipientId: userId
					});

					const notifications = result.data?.allNotifications?.nodes || [];

					// Send notification update
					sendEvent({
						type: 'notifications',
						data: notifications.map((n: any) => ({
							id: n.id,
							title: n.title,
							message: n.message,
							type: n.type.toLowerCase(),
							isRead: n.readStatus,
							createdAt: n.createdAt,
							actionUrl: n.relatedResourceId
								? getActionUrl(n.relatedResourceType, n.relatedResourceId)
								: undefined
						}))
					});
				} catch (err) {
					console.error('Error fetching notifications in SSE:', err);
					sendEvent({ type: 'error', message: 'Failed to fetch notifications' });
				}
			}, 5000); // Poll every 5 seconds
		},
		cancel() {
			// Called when the client disconnects
			console.log('SSE client disconnected');
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
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

	return urlMap[resourceType.toLowerCase()];
}
