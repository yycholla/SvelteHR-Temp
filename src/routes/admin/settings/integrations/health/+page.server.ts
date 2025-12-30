import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import type { PageServerLoad } from './$types';

const SYNC_HEALTH_QUERY = `
	query GetSyncHealth {
		intuit {
			syncHealth {
				uptimePercentage
				avgSyncDurationMs
				totalSyncs24h
				successRate
				errorRate
				lastSuccessfulSync
				currentStatus
				activeAlertsCount
			}
			syncAlerts(limit: 10, unresolvedOnly: false) {
				id
				alertType
				severity
				message
				triggeredAt
				resolvedAt
				entityType
			}
			syncMetrics(hours: 24) {
				id
				recordedAt
				syncDurationMs
				recordsProcessed
				errorsCount
				connectionStatus
				successRate
			}
		}
	}
`;

export const load: PageServerLoad = async ({ fetch, cookies, depends }) => {
	depends('app:sync-health');

	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	try {
		const result = await client.query(SYNC_HEALTH_QUERY, {}).toPromise();

		if (result.error) {
			console.error('Failed to fetch sync health:', result.error);
			return {
				health: null,
				alerts: [],
				metrics: [],
				error: 'Failed to load sync health data'
			};
		}

		return {
			health: result.data?.intuit?.syncHealth || null,
			alerts: result.data?.intuit?.syncAlerts || [],
			metrics: result.data?.intuit?.syncMetrics || []
		};
	} catch (error) {
		console.error('Error loading sync health:', error);
		return {
			health: null,
			alerts: [],
			metrics: [],
			error: 'Failed to load sync health data'
		};
	}
};
