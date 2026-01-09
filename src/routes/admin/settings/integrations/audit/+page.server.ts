import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { gql } from '@urql/svelte';
import type { PageServerLoad } from './$types';

// Query integration-specific sync history
const GET_INTEGRATION_SYNC_HISTORY = gql`
	query GetIntegrationSyncHistory($limit: Int) {
		intuit {
			syncHistory(limit: $limit) {
				id
				syncType
				direction
				changeDirection
				status
				pushedCount
				pulledCount
				updatedCount
				skippedCount
				conflictDetected
				errorMessage
				createdAt
			}
		}
	}
`;

export const load: PageServerLoad = async ({ fetch, cookies, depends, url }) => {
	depends('app:audit-trail');

	// Get filter parameters from URL
	const eventCategory = url.searchParams.get('category');
	const entityType = url.searchParams.get('entityType');
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = 100; // Get more records since we have pagination on frontend

	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	try {
		const result = await client
			.query(GET_INTEGRATION_SYNC_HISTORY, {
				limit
			})
			.toPromise();

		if (result.error) {
			console.error('Failed to fetch integration sync history:', result.error);
			return {
				logs: [],
				total: 0,
				page,
				limit: 20,
				error: 'Failed to load integration sync history'
			};
		}

		const syncHistory = result.data?.intuit?.syncHistory || [];

		// Transform sync history to match audit log structure expected by frontend
		const logs = syncHistory
			.filter((log: any) => {
				// Client-side filtering by sync type if provided
				if (entityType && entityType !== 'all' && log.syncType !== entityType) return false;
				if (eventCategory && eventCategory !== 'all' && log.direction !== eventCategory)
					return false;
				return true;
			})
			.map((log: any) => ({
				id: log.id,
				eventType: `${log.syncType}_${log.direction}`,
				eventCategory: log.direction, // push/pull/bidirectional
				entityType: log.syncType, // employee/department/all
				entityId: null,
				userId: null,
				userEmail: '',
				action: log.direction,
				description: `QuickBooks ${log.syncType} sync (${log.direction}) - ${log.status}`,
				oldValues: null,
				newValues: null,
				changesSummary: JSON.stringify({
					pushed: log.pushedCount,
					pulled: log.pulledCount,
					updated: log.updatedCount,
					skipped: log.skippedCount,
					hasConflict: log.conflictDetected
				}),
				ipAddress: null,
				userAgent: null,
				sessionId: null,
				syncDirection: log.direction,
				syncJobId: log.id,
				source: 'sync_job',
				status: log.status,
				errorMessage: log.errorMessage,
				metadata: {
					conflictDetected: log.conflictDetected,
					changeDirection: log.changeDirection
				},
				createdAt: log.createdAt
			}));

		return {
			logs,
			total: syncHistory.length,
			page,
			limit: 20,
			filters: { eventCategory, entityType }
		};
	} catch (error) {
		console.error('Error loading integration sync history:', error);
		return {
			logs: [],
			total: 0,
			page,
			limit: 20,
			error: 'Failed to load integration sync history'
		};
	}
};
