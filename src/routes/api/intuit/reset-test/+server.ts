import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { dev } from '$app/environment';

const RESET_MUTATION = `
	mutation ResetSyncForTesting($limit: Int) {
		intuit {
			resetDepartmentSyncForTesting
			resetEmployeeSyncForTesting(limit: $limit)
		}
	}
`;

export const POST: RequestHandler = async ({ cookies, fetch }) => {
	// Only allow in development mode
	if (!dev) {
		return json(
			{ success: false, error: 'This endpoint is only available in development mode' },
			{ status: 403 }
		);
	}

	try {
		const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

		const result = await client
			.mutation(RESET_MUTATION, {
				limit: 5
			})
			.toPromise();

		if (result.error) {
			console.error('Reset mutation error:', result.error);
			return json(
				{
					success: false,
					error: result.error.message || 'Failed to reset sync status'
				},
				{ status: 500 }
			);
		}

		const employeeCount = result.data?.intuit?.resetEmployeeSyncForTesting || 0;
		const departmentCount = result.data?.intuit?.resetDepartmentSyncForTesting || 0;
		const totalCount = employeeCount + departmentCount;

		return json({
			success: true,
			resetCount: totalCount,
			employeeCount,
			departmentCount,
			message: `Reset ${departmentCount} department(s) and ${employeeCount} employee(s) for testing`
		});
	} catch (error) {
		console.error('Reset endpoint error:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			},
			{ status: 500 }
		);
	}
};
