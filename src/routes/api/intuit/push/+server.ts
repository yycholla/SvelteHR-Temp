import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export const POST: RequestHandler = async ({ cookies, fetch }) => {
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	const mutation = `
		mutation PushToQuickBooks {
			intuit {
				pushEmployeesToQuickbooks {
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
			console.error('GraphQL error pushing to QuickBooks:', result.error);
			throw error(500, 'Failed to push employees to QuickBooks');
		}

		const syncResult = result.data?.intuit?.pushEmployeesToQuickbooks;

		if (!syncResult) {
			throw error(500, 'No sync result returned');
		}

		// Return success even if some employees were skipped
		return json({
			success: syncResult.syncedCount > 0 || syncResult.errors.length === 0,
			syncedCount: syncResult.syncedCount,
			errors: syncResult.errors,
			message:
				syncResult.syncedCount > 0
					? `Successfully created ${syncResult.syncedCount} employee${syncResult.syncedCount !== 1 ? 's' : ''} in QuickBooks${syncResult.errors.length > 0 ? ` (${syncResult.errors.length} skipped)` : ''}`
					: 'No employees created'
		});
	} catch (err) {
		if (err instanceof Response) {
			throw err;
		}
		console.error('Error pushing to QuickBooks:', err);
		throw error(500, 'Failed to push employees to QuickBooks');
	}
};
