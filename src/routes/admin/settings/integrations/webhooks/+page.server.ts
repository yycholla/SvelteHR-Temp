import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import type { PageServerLoad } from './$types';

const WEBHOOKS_QUERY = `
	query GetWebhooks($status: String, $eventType: String, $limit: Int) {
		webhooks {
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
			events: result.data?.webhooks?.webhookEvents || [],
			statistics: result.data?.webhooks?.webhookStatistics || null,
			selectedEvent: null,
			filters: { status, eventType, limit }
		};
	} catch (error) {
		console.error('Error loading webhooks:', error);
		return {
			events: [],
			statistics: null,
			selectedEvent: null,
			error: 'Failed to load webhook data'
		};
	}
};
