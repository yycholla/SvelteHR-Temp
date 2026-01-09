import type { PageServerLoad } from './$types';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { GET_AVAILABLE_ENTITIES } from '$lib/graphql/operations/selective-sync';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	try {
		const result = await client.query(GET_AVAILABLE_ENTITIES, {}).toPromise();

		if (result.error) {
			console.error('Error fetching available entities:', result.error);
			return {
				employees: [],
				departments: [],
				error: 'Failed to load available entities'
			};
		}

		const data = result.data?.selective_sync?.get_available_entities;

		return {
			employees: data?.employees || [],
			departments: data?.departments || []
		};
	} catch (e) {
		console.error('Exception loading entities:', e);
		return {
			employees: [],
			departments: [],
			error: 'An error occurred while loading entities'
		};
	}
};
