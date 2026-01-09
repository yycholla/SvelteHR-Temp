import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import type { PageServerLoad } from './$types';

const GET_SYNC_STATUS = `
	query GetSyncStatus {
		intuit {
			syncStatus {
				lastSyncAt
				totalSynced
				totalPending
				totalConflicts
				employees {
					synced
					localChanged
					remoteChanged
					conflicts
					errors
				}
				departments {
					synced
					localChanged
					remoteChanged
					conflicts
					errors
				}
			}
			syncHistory(limit: 20) {
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

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	const result = await client.query(GET_SYNC_STATUS, {}).toPromise();

	if (result.error) {
		console.error('GraphQL error:', result.error);
		return {
			syncStatus: null,
			syncHistory: []
		};
	}

	return {
		syncStatus: result.data?.intuit?.syncStatus ?? null,
		syncHistory: result.data?.intuit?.syncHistory ?? []
	};
};
