/**
 * @deprecated This endpoint is deprecated. Use POST /api/sync instead with:
 * {
 *   entity_type: 'EMPLOYEE',
 *   direction: 'PULL',
 *   mode: 'INCREMENTAL'
 * }
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export const POST: RequestHandler = async ({ cookies, fetch }) => {
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	const mutation = `
		mutation SyncIntuit {
			intuit {
				syncAllEmployees {
					success
					syncedCount
					errors
				}
			}
		}
	`;

	try {
		const result = await client.mutation(mutation, {}).toPromise();

		if (result.error) {
			console.error('GraphQL error syncing with Intuit:', result.error);
			throw error(500, 'Failed to sync with QuickBooks');
		}

		const syncResult = result.data?.intuit?.syncAllEmployees;

		if (!syncResult) {
			throw error(500, 'No sync result returned');
		}

		// Return success even if some employees were skipped
		// Only fail if we couldn't sync ANY employees
		return json({
			success: syncResult.syncedCount > 0 || syncResult.errors.length === 0,
			syncedCount: syncResult.syncedCount,
			errors: syncResult.errors,
			message:
				syncResult.syncedCount > 0
					? `Successfully synced ${syncResult.syncedCount} employee${syncResult.syncedCount !== 1 ? 's' : ''}${syncResult.errors.length > 0 ? ` (${syncResult.errors.length} skipped)` : ''}`
					: 'No employees synced'
		});
	} catch (err) {
		if (err instanceof Response) {
			throw err;
		}
		console.error('Error syncing with Intuit:', err);
		throw error(500, 'Failed to sync with QuickBooks');
	}
};
