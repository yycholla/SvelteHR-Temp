import { logger } from '$lib/utils/logger';
// SSE endpoint for real-time notification updates
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, cookies, request }) => {
	const cookieHeader = request.headers.get('cookie');

	// Session-based authentication - user must be authenticated via hooks.server.ts
	if (!locals.user?.id) {
		// Only log debug info on authentication errors
		logger.error('❌ SSE: No authenticated user found in session');
		logger.error('❌ SSE: Cookie header', new Error('No authenticated user'), {
			cookieHeader: cookieHeader || 'NO COOKIES SENT'
		});
		logger.error('❌ SSE: Cookies parsed by SvelteKit', new Error('No authenticated user'), {
			'id.session': cookies.get('id.session'),
			session: cookies.get('session'),
			hr_token: cookies.get('hr_token'),
			'auth-token': cookies.get('auth-token')
		});
		logger.error('❌ SSE: locals.user', new Error('No authenticated user'), { user: locals.user });
		error(401, 'Authentication required');
	}

	const userId = locals.user.id;

	// Create GraphQL endpoint URL
	const { getGraphQLEndpoint } = await import('$lib/server/api-url');
	const graphqlEndpoint = getGraphQLEndpoint();

	// Create a readable stream for SSE
	let intervalId: NodeJS.Timeout | null = null;
	let isClosed = false;

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			// Function to send SSE message safely
			const sendEvent = (data: any) => {
				if (isClosed) return;
				try {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
				} catch (err) {
					logger.error('Error sending SSE event', err as Error);
					isClosed = true;
					if (intervalId) {
						clearInterval(intervalId);
						intervalId = null;
					}
				}
			};

			// Send initial connection success
			sendEvent({ type: 'connected', userId });

			// Poll for new notifications every 5 seconds
			intervalId = setInterval(async () => {
				if (isClosed) {
					if (intervalId) {
						clearInterval(intervalId);
						intervalId = null;
					}
					return;
				}

				try {
					// Updated to use Rust GraphQL API idiomatic syntax (userId, unreadOnly)
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

					// Make direct fetch request with session cookie forwarded
					const graphqlResponse = await fetch(graphqlEndpoint, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Cookie: cookieHeader || '' // Forward all cookies from the original request
						},
						body: JSON.stringify({
							query: notificationsQuery,
							variables: {
								userId,
								unreadOnly: true
							}
						})
					});

					const result = await graphqlResponse.json();

					if (result.errors) {
						logger.error('❌ SSE: GraphQL errors', new Error('GraphQL errors'), {
							errors: result.errors
						});
						sendEvent({ type: 'error', message: 'Failed to fetch notifications' });
						return;
					}

					const notifications = result.data?.notifications || [];

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
					logger.error('Error fetching notifications in SSE', err as Error);
					sendEvent({ type: 'error', message: 'Failed to fetch notifications' });
				}
			}, 5000); // Poll every 5 seconds
		},
		cancel() {
			// Called when the client disconnects
			logger.info('SSE client disconnected');
			isClosed = true;
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = null;
			}
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
