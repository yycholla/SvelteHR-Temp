import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export const POST: RequestHandler = async ({ cookies, fetch, url }) => {
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	// Get sync type from query params: 'employees', 'departments', or 'all' (default)
	const syncType = url.searchParams.get('type') || 'all';

	try {
		const results: { entity: string; syncedCount: number; errors: string[] }[] = [];

		// Push departments if requested
		if (syncType === 'departments' || syncType === 'all') {
			const departmentMutation = `
				mutation PushDepartmentsToQuickBooks {
					intuit {
						pushDepartmentsToQuickbooks {
							success
							syncedCount
							errors
						}
					}
				}
			`;

			const deptResult = await client.mutation(departmentMutation, {}).toPromise();

			if (deptResult.error) {
				console.error('GraphQL error pushing departments to QuickBooks:', deptResult.error);
				results.push({
					entity: 'departments',
					syncedCount: 0,
					errors: [deptResult.error.message]
				});
			} else {
				const syncResult = deptResult.data?.intuit?.pushDepartmentsToQuickbooks;
				if (syncResult) {
					results.push({
						entity: 'departments',
						syncedCount: syncResult.syncedCount,
						errors: syncResult.errors
					});
				}
			}
		}

		// Push employees if requested
		if (syncType === 'employees' || syncType === 'all') {
			const employeeMutation = `
				mutation PushEmployeesToQuickBooks {
					intuit {
						pushEmployeesToQuickbooks {
							success
							syncedCount
							errors
						}
					}
				}
			`;

			const empResult = await client.mutation(employeeMutation, {}).toPromise();

			if (empResult.error) {
				console.error('GraphQL error pushing employees to QuickBooks:', empResult.error);
				results.push({
					entity: 'employees',
					syncedCount: 0,
					errors: [empResult.error.message]
				});
			} else {
				const syncResult = empResult.data?.intuit?.pushEmployeesToQuickbooks;
				if (syncResult) {
					results.push({
						entity: 'employees',
						syncedCount: syncResult.syncedCount,
						errors: syncResult.errors
					});
				}
			}
		}

		// Update employee departments if requested
		if (syncType === 'employee-departments') {
			const updateDepartmentsMutation = `
				mutation UpdateEmployeeDepartments {
					intuit {
						updateEmployeeDepartmentsInQuickbooks {
							success
							syncedCount
							errors
						}
					}
				}
			`;

			const updateResult = await client.mutation(updateDepartmentsMutation, {}).toPromise();

			if (updateResult.error) {
				console.error('GraphQL error updating employee departments:', updateResult.error);
				results.push({
					entity: 'employee departments',
					syncedCount: 0,
					errors: [updateResult.error.message]
				});
			} else {
				const syncResult = updateResult.data?.intuit?.updateEmployeeDepartmentsInQuickbooks;
				if (syncResult) {
					results.push({
						entity: 'employee departments',
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
					? `Successfully pushed to QuickBooks: ${messages.join(', ')}`
					: `No items pushed (${totalErrors} error${totalErrors !== 1 ? 's' : ''})`
		});
	} catch (err) {
		if (err instanceof Response) {
			throw err;
		}
		console.error('Error pushing to QuickBooks:', err);
		throw error(500, 'Failed to push to QuickBooks');
	}
};
