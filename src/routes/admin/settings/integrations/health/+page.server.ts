import type { PageServerLoad, Actions } from './$types';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { error, fail } from '@sveltejs/kit';
import {
	SYNC_HEALTH_STATUS_QUERY,
	SYNC_HEALTH_METRICS_QUERY,
	SYNC_HEALTH_ALERTS_QUERY,
	RESOLVE_HEALTH_ALERT_MUTATION,
	type SyncHealthStatusQueryData,
	type SyncHealthMetricsQueryData,
	type SyncHealthAlertsQueryData,
	type ResolveHealthAlertMutationData
} from '$lib/graphql/sync-health-operations';

export const load: PageServerLoad = async ({ fetch, cookies, depends }) => {
	// Declare dependency for invalidation
	depends('app:sync-health');

	// Create authenticated GraphQL client
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	try {
		// Fetch health status
		const statusResult = await client
			.query<SyncHealthStatusQueryData>(SYNC_HEALTH_STATUS_QUERY, {})
			.toPromise();

		if (statusResult.error) {
			console.error('Failed to fetch health status:', statusResult.error);
			// Don't throw - return defaults below
		}

		// Fetch metrics for last 24 hours
		const metricsResult = await client
			.query<SyncHealthMetricsQueryData>(SYNC_HEALTH_METRICS_QUERY, {
				timeframe: 24
			})
			.toPromise();

		if (metricsResult.error) {
			console.error('Failed to fetch health metrics:', metricsResult.error);
			// Don't throw - return defaults below
		}

		// Fetch active (unresolved) alerts only
		const alertsResult = await client
			.query<SyncHealthAlertsQueryData>(SYNC_HEALTH_ALERTS_QUERY, {
				status: 'active', // Only get unresolved alerts
				limit: 50
			})
			.toPromise();

		if (alertsResult.error) {
			console.error('Failed to fetch health alerts:', alertsResult.error);
			// Don't throw - return defaults below
		}

		return {
			healthStatus: statusResult.data?.syncHealth?.syncHealthStatus ?? null,
			metrics: metricsResult.data?.syncHealth?.syncHealthMetrics ?? [],
			alerts: alertsResult.data?.syncHealth?.syncHealthAlerts ?? []
		};
	} catch (err) {
		console.error('Health dashboard load error:', err);
		// Return safe defaults instead of crashing
		return {
			healthStatus: null,
			metrics: [],
			alerts: []
		};
	}
};

export const actions: Actions = {
	resolveAlert: async ({ request, fetch, cookies }) => {
		const formData = await request.formData();
		const alertId = formData.get('alertId') as string;

		if (!alertId) {
			return fail(400, { error: 'Alert ID is required' });
		}

		const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

		try {
			const result = await client
				.mutation<ResolveHealthAlertMutationData>(RESOLVE_HEALTH_ALERT_MUTATION, {
					alertId
				})
				.toPromise();

			if (result.error) {
				console.error('Failed to resolve alert:', result.error);
				return fail(500, { error: 'Failed to resolve alert' });
			}

			if (!result.data?.syncHealth?.resolveHealthAlert?.success) {
				return fail(500, {
					error: result.data?.syncHealth?.resolveHealthAlert?.message ?? 'Failed to resolve alert'
				});
			}

			return {
				success: true,
				message: result.data?.syncHealth?.resolveHealthAlert?.message ?? 'Alert resolved'
			};
		} catch (err) {
			console.error('Resolve alert error:', err);
			return fail(500, { error: 'Failed to resolve alert' });
		}
	}
};
