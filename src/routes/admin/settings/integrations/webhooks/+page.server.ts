import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

const WEBHOOKS_QUERY = `
	query GetWebhooks($status: String, $eventType: String, $limit: Int) {
		webhooks {
			webhookStatus {
				isActive
				webhookId
				entityNames
				lastDeliveredAt
				failureCount
			}
			webhookEvents(status: $status, eventType: $eventType, limit: $limit) {
				id
				eventType
				entityName
				realmId
				payload
				status
				processedAt
				processingAttempts
				lastError
				receivedAt
				createdAt
			}
			webhookStatistics {
				totalEvents
				pendingEvents
				processingEvents
				completedEvents
				failedEvents
				avgProcessingTimeMs
			}
		}
	}
`;

const WEBHOOK_DETAIL_QUERY = `
	query GetWebhookEvent($eventId: String!) {
		webhooks {
			webhookEvent(eventId: $eventId) {
				id
				eventType
				entityName
				realmId
				payload
				status
				processedAt
				processingAttempts
				lastError
				receivedAt
				createdAt
			}
		}
	}
`;

export const load: PageServerLoad = async ({ fetch, cookies, depends, url }) => {
	depends('app:webhooks');

	const eventId = url.searchParams.get('eventId');
	const status = url.searchParams.get('status');
	const eventType = url.searchParams.get('eventType');
	const limit = parseInt(url.searchParams.get('limit') || '50');

	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	try {
		// If viewing a specific event
		if (eventId) {
			const detailResult = await client.query(WEBHOOK_DETAIL_QUERY, { eventId }).toPromise();

			if (detailResult.error) {
				console.error('Failed to fetch webhook event:', detailResult.error);
				return {
					events: [],
					statistics: null,
					selectedEvent: null,
					error: 'Failed to load webhook event'
				};
			}

			return {
				events: [],
				statistics: null,
				selectedEvent: detailResult.data?.webhooks?.webhookEvent || null
			};
		}

		// Otherwise fetch list of events and statistics
		const result = await client
			.query(WEBHOOKS_QUERY, {
				status: status || null,
				eventType: eventType || null,
				limit
			})
			.toPromise();

		if (result.error) {
			console.error('Failed to fetch webhooks:', result.error);
			return {
				events: [],
				statistics: null,
				selectedEvent: null,
				error: 'Failed to load webhook data'
			};
		}

		return {
			webhookStatus: result.data?.webhooks?.webhookStatus || null,
			events: result.data?.webhooks?.webhookEvents || [],
			statistics: result.data?.webhooks?.webhookStatistics || null,
			selectedEvent: null,
			filters: { status, eventType, limit }
		};
	} catch (error) {
		console.error('Error loading webhooks:', error);
		return {
			webhookStatus: null,
			events: [],
			statistics: null,
			selectedEvent: null,
			error: 'Failed to load webhook data'
		};
	}
};

const REGISTER_WEBHOOK_MUTATION = `
	mutation RegisterWebhook($entityNames: [String!]!) {
		webhooks {
			registerWebhook(entityNames: $entityNames) {
				success
				message
				webhookId
			}
		}
	}
`;

const UNREGISTER_WEBHOOK_MUTATION = `
	mutation UnregisterWebhook {
		webhooks {
			unregisterWebhook {
				success
				message
			}
		}
	}
`;

const RETRY_EVENT_MUTATION = `
	mutation RetryWebhookEvent($eventId: String!) {
		webhooks {
			retryWebhookEvent(eventId: $eventId) {
				success
				message
				eventsProcessed
			}
		}
	}
`;

export const actions: Actions = {
	register: async ({ fetch, cookies, request }) => {
		const formData = await request.formData();
		const entityNames = formData.getAll('entityNames') as string[];

		if (!entityNames || entityNames.length === 0) {
			return fail(400, { error: 'Please select at least one entity type' });
		}

		const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

		try {
			const result = await client
				.mutation(REGISTER_WEBHOOK_MUTATION, { entityNames })
				.toPromise();

			if (result.error) {
				console.error('Failed to register webhook:', result.error);
				return fail(500, { error: 'Failed to register webhook subscription' });
			}

			const response = result.data?.webhooks?.registerWebhook;
			if (!response?.success) {
				return fail(500, { error: response?.message || 'Failed to register webhook' });
			}

			return { success: true, message: response.message };
		} catch (error) {
			console.error('Error registering webhook:', error);
			return fail(500, { error: 'Failed to register webhook subscription' });
		}
	},

	unregister: async ({ fetch, cookies }) => {
		const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

		try {
			const result = await client.mutation(UNREGISTER_WEBHOOK_MUTATION, {}).toPromise();

			if (result.error) {
				console.error('Failed to unregister webhook:', result.error);
				return fail(500, { error: 'Failed to unregister webhook subscription' });
			}

			const response = result.data?.webhooks?.unregisterWebhook;
			if (!response?.success) {
				return fail(500, { error: response?.message || 'Failed to unregister webhook' });
			}

			return { success: true, message: response.message };
		} catch (error) {
			console.error('Error unregistering webhook:', error);
			return fail(500, { error: 'Failed to unregister webhook subscription' });
		}
	},

	retry: async ({ fetch, cookies, request }) => {
		const formData = await request.formData();
		const eventId = formData.get('eventId') as string;

		if (!eventId) {
			return fail(400, { error: 'Event ID is required' });
		}

		const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

		try {
			const result = await client.mutation(RETRY_EVENT_MUTATION, { eventId }).toPromise();

			if (result.error) {
				console.error('Failed to retry event:', result.error);
				return fail(500, { error: 'Failed to retry webhook event' });
			}

			const response = result.data?.webhooks?.retryWebhookEvent;
			if (!response?.success) {
				return fail(500, { error: response?.message || 'Failed to retry event' });
			}

			return { success: true, message: response.message };
		} catch (error) {
			console.error('Error retrying event:', error);
			return fail(500, { error: 'Failed to retry webhook event' });
		}
	}
};
