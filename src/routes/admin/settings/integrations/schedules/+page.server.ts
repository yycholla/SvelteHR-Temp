import type { PageServerLoad } from './$types';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import {
	GET_SYNC_SCHEDULES,
	GET_SYNC_SCHEDULE_HISTORY
} from '$lib/graphql/operations/sync-schedule';
import { error as svelteKitError } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch, cookies, url }) => {
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	const scheduleId = url.searchParams.get('scheduleId');
	const enabledOnly = url.searchParams.get('enabled') === 'true';
	const entityType = url.searchParams.get('entityType');

	try {
		// Fetch schedules list
		const schedulesResult = await client
			.query(GET_SYNC_SCHEDULES, {
				enabledOnly: enabledOnly || undefined,
				entityType: entityType && entityType !== 'all' ? entityType : undefined,
				limit: 50,
				offset: 0
			})
			.toPromise();

		if (schedulesResult.error) {
			console.error('Error fetching sync schedules:', schedulesResult.error);
			return {
				schedules: [],
				total: 0,
				error: 'Failed to load sync schedules',
				history: [],
				selectedSchedule: null
			};
		}

		const schedules = schedulesResult.data?.syncSchedule?.syncSchedules?.schedules || [];
		const total = schedulesResult.data?.syncSchedule?.syncSchedules?.total || 0;

		// If a schedule is selected, fetch its history
		let history = [];
		let selectedSchedule = null;

		if (scheduleId) {
			const historyResult = await client
				.query(GET_SYNC_SCHEDULE_HISTORY, {
					scheduleId,
					limit: 20
				})
				.toPromise();

			if (!historyResult.error) {
				history = historyResult.data?.syncSchedule?.syncScheduleHistory || [];
				selectedSchedule = schedules.find((s: { id: string }) => s.id === scheduleId) || null;
			}
		}

		return {
			schedules,
			total,
			history,
			selectedSchedule,
			filters: {
				enabled: enabledOnly,
				entityType: entityType || 'all'
			}
		};
	} catch (e) {
		console.error('Exception loading sync schedules:', e);
		return {
			schedules: [],
			total: 0,
			error: 'An error occurred while loading sync schedules',
			history: [],
			selectedSchedule: null
		};
	}
};
