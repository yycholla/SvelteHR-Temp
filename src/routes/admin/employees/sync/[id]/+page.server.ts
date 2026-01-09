import type { PageServerLoad } from './$types';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { GET_EMPLOYEE_SYNC_STATUS, GET_EMPLOYEE_SYNC_HISTORY } from '$lib/graphql/operations/employee-sync';

export const load: PageServerLoad = async ({ fetch, cookies, params }) => {
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));
	const employeeId = params.id;

	try {
		// Fetch sync status
		const statusResult = await client
			.query(GET_EMPLOYEE_SYNC_STATUS, { employeeId })
			.toPromise();

		// Fetch sync history (last 50 entries)
		const historyResult = await client
			.query(GET_EMPLOYEE_SYNC_HISTORY, { employeeId, limit: 50 })
			.toPromise();

		if (statusResult.error || historyResult.error) {
			console.error('Error fetching employee sync data:', statusResult.error || historyResult.error);
			return {
				syncStatus: null,
				syncHistory: [],
				total: 0,
				error: 'Failed to load employee sync data'
			};
		}

		const status = statusResult.data?.employee_sync?.get_employee_sync_status;
		const historyData = historyResult.data?.employee_sync?.get_employee_sync_history;

		return {
			syncStatus: status || null,
			syncHistory: historyData?.history || [],
			total: historyData?.total || 0
		};
	} catch (e) {
		console.error('Exception loading employee sync data:', e);
		return {
			syncStatus: null,
			syncHistory: [],
			total: 0,
			error: 'An error occurred while loading employee sync data'
		};
	}
};
