import type { PageServerLoad } from './$types';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { GET_INCREMENTAL_SYNC_SETTINGS } from '$lib/graphql/operations/incremental-sync';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	try {
		const result = await client.query(GET_INCREMENTAL_SYNC_SETTINGS, {}).toPromise();

		if (result.error) {
			console.error('Error fetching incremental sync settings:', result.error);
			return {
				settings: null,
				error: 'Failed to load incremental sync settings'
			};
		}

		const settings = result.data?.incremental_sync?.get_incremental_sync_settings;

		return {
			settings: settings || null
		};
	} catch (e) {
		console.error('Exception loading incremental sync settings:', e);
		return {
			settings: null,
			error: 'An error occurred while loading settings'
		};
	}
};
