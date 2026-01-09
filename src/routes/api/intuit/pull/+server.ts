import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export const POST: RequestHandler = async ({ cookies, fetch, url }) => {
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	// Get sync type from query params: 'employees', 'departments', or 'all' (default)
	const syncType = url.searchParams.get('type') || 'all';

	try {
		const results: { entity: string; syncedCount: number; errors: string[] }[] = [];

		// Pull employees if requested
		if (syncType === 'employees' || syncType === 'all') {
			const employeeMutation = `
				mutation SyncAllEmployees {
					intuit {
						syncAllEmployees {
							success
							syncedCount
							errors
						}
					}
				}
			`;

			const empResult = await client.mutation(employeeMutation, {}).toPromise();

			if (empResult.error) {
				console.error('GraphQL error pulling employees from QuickBooks:', empResult.error);
				results.push({
					entity: 'employees',
					syncedCount: 0,
					errors: [empResult.error.message]
				});
			} else {
				const syncResult = empResult.data?.intuit?.syncAllEmployees;
				if (syncResult) {
					results.push({
						entity: 'employees',
						syncedCount: syncResult.syncedCount,
						errors: syncResult.errors
					});
				}
			}
		}

		// Pull departments if requested
		if (syncType === 'departments' || syncType === 'all') {
			const departmentMutation = `
				mutation SyncAllDepartments {
					intuit {
						syncAllDepartments {
							success
							syncedCount
							errors
						}
					}
				}
			`;

			const deptResult = await client.mutation(departmentMutation, {}).toPromise();

			if (deptResult.error) {
				console.error('GraphQL error pulling departments from QuickBooks:', deptResult.error);
				results.push({
					entity: 'departments',
					syncedCount: 0,
					errors: [deptResult.error.message]
				});
			} else {
				const syncResult = deptResult.data?.intuit?.syncAllDepartments;
				if (syncResult) {
					results.push({
						entity: 'departments',
						syncedCount: syncResult.syncedCount,
						errors: syncResult.errors
					});
				}
			}
		}

		// Build response message
		const totalSynced = results.reduce((sum, r) => sum + r.syncedCount, 0);
		const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

		const messages = results
			.filter((r) => r.syncedCount > 0)
			.map(
				(r) =>
					`${r.syncedCount} ${r.entity}${r.errors.length > 0 ? ` (${r.errors.length} skipped)` : ''}`
			);

		return json({
			success: totalSynced > 0 || totalErrors === 0,
			syncedCount: totalSynced,
			results,
			message:
				totalSynced > 0
					? `Successfully pulled from QuickBooks: ${messages.join(', ')}`
					: `No items pulled (${totalErrors} error${totalErrors !== 1 ? 's' : ''})`
		});
	} catch (err) {
		if (err instanceof Response) {
			throw err;
		}
		console.error('Error pulling from QuickBooks:', err);
		throw error(500, 'Failed to pull from QuickBooks');
	}
};
